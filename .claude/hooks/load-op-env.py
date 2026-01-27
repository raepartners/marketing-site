#!/usr/bin/env -S uv run --script
#
# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "pydantic>=2.10",
#     "pydantic-settings>=2.6",
#     "python-dotenv>=1.0",
# ]
# [tool.uv]
# exclude-newer = "2025-12-02T00:00:00Z"
# ///
"""
Claude Code SessionStart hook: Load 1Password secrets into session environment.

This hook resolves 1Password secret references from .op.env and persists them
to CLAUDE_ENV_FILE, making secrets available to all subsequent bash commands
without requiring `poe op-run` prefix.

Usage:
    # As a Claude Code hook (configured in .claude/settings.json):
    # Receives JSON on stdin, outputs JSON to stdout

    # Manual testing:
    echo '{"session_id":"test","transcript_path":"/tmp/t.jsonl","cwd":"/tmp","permission_mode":"default","hook_event_name":"SessionStart","source":"new"}' | \\
        CLAUDE_ENV_FILE=/tmp/test-env CLAUDE_PROJECT_DIR="$PWD" ./load-op-env.py

Maintenance:
    # Add dependencies:
    uv add --script load-op-env.py 'package-name'

    # Format and lint:
    uvx ruff format load-op-env.py
    uvx ruff check load-op-env.py

References:
    - PEP 723 (Inline script metadata): https://peps.python.org/pep-0723/
    - uv scripts guide: https://docs.astral.sh/uv/guides/scripts/
    - Claude Code hooks: https://code.claude.com/docs/en/hooks
    - Persisting environment variables: https://code.claude.com/docs/en/hooks#persisting-environment-variables
"""

from __future__ import annotations

import io
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import (
    Annotated,
    Final,
    Generic,
    Literal,
    LiteralString,
    TypeAlias,
    TypeVar,
)

import dotenv
from pydantic import (
    BaseModel,
    ConfigDict,
    DirectoryPath,
    Field,
    GetPydanticSchema,
    NewPath,
)
from pydantic.alias_generators import to_camel
from pydantic_settings import BaseSettings, SettingsConfigDict

OP_ENV_FILENAME: Final = ".op.env"


# =============================================================================
# Settings (from environment variables)
# =============================================================================


class CommonHookSettings(BaseSettings):
    """Environment variables available to all Claude Code hooks."""

    model_config = SettingsConfigDict(env_prefix="CLAUDE_")

    code_remote: bool = Field(default=False, alias="CLAUDE_CODE_REMOTE")
    """Whether the hook is running in a remote (web) environment."""

    plugin_root: Path | None = Field(default=None, alias="CLAUDE_PLUGIN_ROOT")
    """Absolute path to the plugin directory (if hook is from a plugin)."""

    project_dir: DirectoryPath = Field(alias="CLAUDE_PROJECT_DIR")
    """Absolute path to the project root directory (where Claude Code was started)."""


class SessionStartHookSettings(CommonHookSettings):
    """Environment variables specific to SessionStart hooks."""

    env_file: Path | NewPath = Field(alias="CLAUDE_ENV_FILE")
    """Absolute path to file where environment variables can be persisted.

    See https://code.claude.com/docs/en/hooks#persisting-environment-variables
    """


# =============================================================================
# Hook Input Models (JSON from stdin)
# =============================================================================

PydanticLiteralString: TypeAlias = Annotated[
    LiteralString, GetPydanticSchema(lambda _s, h: h(str))
]
"""Pydantic- + Pyright-friendly `LiteralString` type alias.

See https://github.com/pydantic/pydantic/discussions/4574#discussioncomment-9837271
"""

_T = TypeVar("_T", bound=PydanticLiteralString)


class HookInput(BaseModel, Generic[_T]):
    """Base model for all hook inputs. All hooks receive JSON via stdin with these fields.

    See https://code.claude.com/docs/en/hooks#hook-input
    """

    session_id: str

    transcript_path: str
    """Absolute path to where the conversation's JSONL transcript file _will_ be created."""

    cwd: DirectoryPath
    """Current working directory at the time the hook is invoked."""

    permission_mode: (
        Literal["default", "plan", "acceptEdits", "bypassPermissions"] | str | None
    ) = None
    """Current permission mode, if pre-set."""

    hook_event_name: _T


class SessionStartHookInput(HookInput[Literal["SessionStart"]]):
    """Input for SessionStart hooks. Runs when Claude Code starts or resumes a session.

    See https://code.claude.com/docs/en/hooks#sessionstart-input
    """

    hook_event_name: Literal["SessionStart"] = "SessionStart"
    source: Literal["new", "resume", "compact"] | str
    """How the session started: 'new', 'resume' (existing session), or 'compact' (after compaction)."""


# =============================================================================
# Hook Output Models (JSON to stdout)
# =============================================================================


class SessionStartSpecificOutput(BaseModel):
    """`SessionStart` hooks can provide additional context to inject into the session.

    See https://code.claude.com/docs/en/hooks#sessionstart-decision-control
    """

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, ser_json_bytes="utf8"
    )

    hook_event_name: Literal["SessionStart"] = "SessionStart"

    additional_context: str = ""
    """Additional string to add to the session context."""


class CommonHookOutput(BaseModel):
    """Common output fields available to all hook types.

    See https://code.claude.com/docs/en/hooks#common-json-fields
    """

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, ser_json_bytes="utf8"
    )

    stop_reason: str | None = None
    """Message shown when continue is false."""

    should_continue: bool = Field(default=True, serialization_alias="continue")
    """Whether Claude should continue after hook execution."""

    suppress_output: bool = False
    """Hide stdout from transcript mode."""

    system_message: str | None = None
    """Optional warning message shown to the user."""


class SessionStartOutput(CommonHookOutput):
    """Combined output model for SessionStart hooks."""

    hook_specific_output: SessionStartSpecificOutput = Field(
        default_factory=SessionStartSpecificOutput
    )


# =============================================================================
# Core Logic
# =============================================================================


class OpCliError(Exception):
    """Raised when 1Password CLI operations fail."""

    pass


def check_op_cli_available() -> Path:
    """Check if 1Password CLI is available on PATH.

    Returns:
        Path to the op executable.

    Raises:
        OpCliError: If op CLI is not found.
    """
    op_path = shutil.which("op")
    if op_path is None:
        raise OpCliError("1Password CLI (op) not found on PATH")
    return Path(op_path)


def check_op_cli_authenticated(op_path: Path) -> None:
    """Check if 1Password CLI is authenticated.

    Raises:
        OpCliError: If op CLI is not authenticated.
    """
    result = subprocess.run(
        [str(op_path), "account", "list", "--format=json"],
        capture_output=True,
        encoding="utf-8",
        timeout=10,
    )
    if result.returncode != 0:
        raise OpCliError(f"1Password CLI not authenticated: {result.stderr.strip()}")

    # Check if any accounts are returned
    try:
        accounts = json.loads(result.stdout)
        if not accounts:
            raise OpCliError("No 1Password accounts configured. Run 'op signin' first.")
    except json.JSONDecodeError:
        raise OpCliError(f"Failed to parse op account list output: {result.stdout}")


def inject_op_secrets(op_path: Path, op_env_file: Path) -> dict[str, str]:
    """Use 1Password CLI to resolve secret references and return as dict.

    Args:
        op_path: Path to the op executable.
        op_env_file: Path to the .op.env file with op:// references.

    Returns:
        Dictionary of environment variable names to resolved values.

    Raises:
        OpCliError: If injection fails.
    """
    result = subprocess.run(
        [str(op_path), "inject", "--in-file", str(op_env_file)],
        capture_output=True,
        encoding="utf-8",
        timeout=60,
    )

    if result.returncode != 0:
        raise OpCliError(f"Failed to inject secrets: {result.stderr.strip()}")

    # Parse the injected output as a dotenv stream
    stream = io.StringIO(result.stdout)
    secrets = dotenv.dotenv_values(stream=stream)

    # Filter out None values and return
    return {k: v for k, v in secrets.items() if v is not None}


def ensure_env_file_exists(env_file: Path) -> None:
    """Ensure CLAUDE_ENV_FILE exists with secure permissions.

    Args:
        env_file: Path to the environment file.
    """
    if not env_file.exists():
        env_file.touch(mode=0o700)
    else:
        # Ensure permissions are restrictive (owner read/write only)
        env_file.chmod(0o700)


def merge_and_write_env(
    env_file: Path, secrets: dict[str, str], additional_vars: dict[str, str]
) -> None:
    """Merge secrets with existing env file and write back.

    Args:
        env_file: Path to CLAUDE_ENV_FILE.
        secrets: Dictionary of secrets to write.
    """
    # Load existing variables from CLAUDE_ENV_FILE
    existing = dotenv.dotenv_values(dotenv_path=env_file)

    # Merge: secrets take precedence over existing
    merged = {**existing, **secrets, **additional_vars}

    # Write each variable using dotenv.set_key (handles escaping properly)
    for key, value in merged.items():
        if value is not None:
            dotenv.set_key(
                dotenv_path=env_file,
                key_to_set=key,
                value_to_set=value,
                quote_mode="auto",
                export=True,
            )


def run_hook(
    hook_input: SessionStartHookInput, settings: SessionStartHookSettings
) -> str | None:
    """Execute the SessionStart hook logic.

    Args:
        hook_input: Parsed hook input from stdin.
        settings: Environment settings.

    Returns:
        None on success (silent output), or error message string for system_message.
    """
    op_env_path = settings.project_dir / OP_ENV_FILENAME

    # Check if .op.env exists - not an error, just skip silently
    if not op_env_path.exists():
        return None

    try:
        # Check 1Password CLI availability and authentication
        op_path = check_op_cli_available()
        check_op_cli_authenticated(op_path)

        # Inject secrets from .op.env
        secrets = inject_op_secrets(op_path, op_env_path)

        if not secrets:
            return None

        # Ensure CLAUDE_ENV_FILE exists with proper permissions
        env_file = Path(settings.env_file)
        ensure_env_file_exists(env_file)

        # Merge and write environment variables
        additional_vars = {
            "X_CLAUDE_ENV_FILE": env_file.as_posix(),
            "X_CLAUDE_SESSION_ID": hook_input.session_id,
            "X_CLAUDE_TRANSCRIPT_PATH": hook_input.transcript_path,
        }
        merge_and_write_env(env_file, secrets, additional_vars)

        return None

    except OpCliError as e:
        return f"1Password environment setup skipped: {e}"
    except subprocess.TimeoutExpired:
        return "1Password CLI timed out - skipping environment setup"


def main() -> None:
    """Main entry point for the hook."""
    try:
        # Parse hook input from stdin
        raw_input = sys.stdin.read()
        hook_input = SessionStartHookInput.model_validate_json(raw_input)

        # Load settings from environment
        settings = SessionStartHookSettings()  # type: ignore[call-arg]

        # Execute hook logic
        error_message = run_hook(hook_input, settings)

        # Construct output - silent on success, system_message on error
        output = SessionStartOutput(system_message=error_message)
        print(output.model_dump_json(by_alias=True, exclude_none=True))

    except Exception as e:
        # On any error, output a valid JSON response that doesn't block the session
        output = SessionStartOutput(
            system_message=f"load-op-env.py error: {type(e).__name__}: {e}"
        )
        print(output.model_dump_json(by_alias=True, exclude_none=True))
        sys.exit(0)  # Exit cleanly so we don't block Claude Code


if __name__ == "__main__":
    main()
