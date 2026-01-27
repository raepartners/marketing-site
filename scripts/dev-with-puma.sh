#!/usr/bin/env bash
#
# dev-with-puma.sh - Start dev server with automatic puma-dev registration
#
# This is a thin wrapper for environments where Node.js may not be preferred.
# It delegates to the Node.js script for full functionality.
#
# Usage:
#   ./scripts/dev-with-puma.sh [astro-args...]
#
# Examples:
#   ./scripts/dev-with-puma.sh              # Start dev server
#   ./scripts/dev-with-puma.sh --host       # Expose to network
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "[dev-with-puma] Error: Node.js is required but not installed."
    exit 1
fi

# Check for puma-dev
if ! command -v puma-dev &> /dev/null; then
    echo "[dev-with-puma] Warning: puma-dev not found. Install it with:"
    echo "  brew install puma/puma/puma-dev"
    echo "  sudo puma-dev -setup"
    echo "  puma-dev -install"
    echo ""
    echo "Falling back to standard dev server on port 4321..."
    exec pnpm astro dev "$@"
fi

# Run the Node.js registration script (it runs astro dev by default)
cd "$PROJECT_DIR"

# If additional args provided, pass them through with --
if [ $# -gt 0 ]; then
    exec node scripts/puma-dev-register.mjs -- pnpm astro dev "$@"
else
    exec node scripts/puma-dev-register.mjs
fi
