#!/bin/bash
# Wrapper script to run PostHog MCP server with 1Password credentials

# Load API key from 1Password
export POSTHOG_API_KEY=$(op read "op://Private/gtbogvf7ehoniqywzetphu37qi/credential" 2>/dev/null)
export POSTHOG_HOST="https://us.posthog.com"

# Run the MCP server
exec npx -y @posthog/mcp-server
