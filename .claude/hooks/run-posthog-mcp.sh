#!/bin/bash
# Wrapper script to run PostHog MCP server with 1Password credentials
#
# This script exits gracefully if no API key is available, so it won't
# cause errors for developers who haven't set up their personal key.
#
# Setup: See CLAUDE.md "AI/Data Access (MCP Server)" section

# Use existing env var if set (from .op.env or shell profile)
# Otherwise, try to load from 1Password
if [[ -z "$POSTHOG_API_KEY" ]]; then
    POSTHOG_API_KEY=$(op read "op://Private/gtbogvf7ehoniqywzetphu37qi/credential" 2>/dev/null)
fi

# Exit gracefully if no key (don't break for other developers)
if [[ -z "$POSTHOG_API_KEY" ]]; then
    exit 0
fi

export POSTHOG_API_KEY
export POSTHOG_HOST="${POSTHOG_HOST:-https://us.posthog.com}"

# Run the MCP server
exec npx -y @posthog/mcp-server
