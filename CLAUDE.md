# RAE Marketing Site

Astro 5 static marketing site for RAE Partners.

## Project Skills

- `kb-record-research-decisions` — Use before committing. Evaluates whether research/decisions should persist to the shared rae-mgmt brain.

## Developer Setup

Set the path to your rae-mgmt repo (add to `~/.zshrc` or `~/.bashrc`):
```bash
export RAE_MGMT_PATH="$HOME/path/to/rae-mgmt"
```

## Shared Knowledge Base

Research and decisions that affect RAE broadly should persist to rae-mgmt:
- **Path:** `$RAE_MGMT_PATH`
- **Marketing research:** `areas/marketing/research/`
- **Decisions:** `areas/{area}/decisions/`

Find active worktrees: `cd $RAE_MGMT_PATH && git worktree list`

## Stack

- **Framework:** Astro 5 (static output)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Content:** MDX + Content Collections (Zod schemas)
- **Testing:** Playwright + axe-core
- **Analytics:** PostHog (product analytics)
- **Package Manager:** pnpm

## Commands

```bash
pnpm dev        # Start dev server (http://localhost:4321)
pnpm build      # Build static site to dist/
pnpm preview    # Preview production build
pnpm test       # Run all Playwright tests
pnpm test:ui    # Run tests with Playwright UI
```

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components (React)
│   ├── reference/       # Exemplar patterns for agents
│   ├── Nav.astro        # Navigation
│   └── Footer.astro     # Footer
├── content/
│   └── blog/            # MDX blog posts
├── layouts/
│   ├── BaseLayout.astro # Base HTML with SEO
│   └── BlogPost.astro   # Blog post wrapper
├── pages/
│   ├── index.astro      # Landing page
│   └── blog/
│       ├── index.astro  # Blog listing
│       └── [...slug].astro
├── styles/
│   └── global.css       # Tailwind + solarpunk theme
└── content.config.ts    # Content Collections schema
```

## Adding Blog Posts

1. Create new file: `src/content/blog/your-slug.mdx`
2. Add required frontmatter (see schema below)
3. Write content in MDX
4. Run `pnpm build` to verify
5. Run `pnpm test` to check SEO requirements

### Blog Post Frontmatter Schema

```yaml
---
title: "Your Title"                    # Required, max 60 chars
description: "Your description"         # Required, max 155 chars
publishedDate: 2026-01-24              # Required
modifiedDate: 2026-01-25               # Optional
author:
  name: "Author Name"                  # Required
  email: "email@rae.partners"          # Optional
  role: "Role"                         # Optional
coAuthors:                             # Optional
  - name: "Co-author Name"
    role: "Role"
tags:                                  # Optional
  - tag1
  - tag2
draft: false                           # Optional, defaults to false
featured: false                        # Optional, defaults to false
---
```

## SEO Requirements

Every page must have:
- Title under 60 characters
- Meta description under 155 characters
- Canonical URL
- OG and Twitter meta tags
- Exactly one H1
- JSON-LD structured data

The `BaseLayout` component handles most of this automatically.

## Styling

### Solarpunk Theme Colors

- **Primary:** Solar gold (`--primary`)
- **Accent:** Verdant green (`--accent`)
- **Background:** Warm white
- **Foreground:** Deep brown

### Using shadcn/ui Components

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default">Click me</Button>
```

### Adding New shadcn/ui Components

```bash
pnpm dlx shadcn@latest add [component-name]
```

## Testing

Tests are in `tests/` directory:
- `smoke.spec.ts` — Pages load without errors
- `seo.spec.ts` — SEO requirements met
- `navigation.spec.ts` — Links work correctly
- `blog.spec.ts` — Blog functionality
- `accessibility.spec.ts` — WCAG compliance (axe-core)

### Running Tests

```bash
pnpm test              # Run all tests
pnpm test:ui           # Interactive UI mode
pnpm test -- --grep "smoke"  # Run specific tests
```

## Deployment

Hosted on Cloudflare Pages (`rae-mktg` project):
- **Production:** `rae.partners` (merges to main)
- **PR Previews:** `{branch}.rae-mktg.pages.dev`

Configuration in `wrangler.toml`. Build: `pnpm build`, output: `dist/`

## Parallel Workspace Environment

This repo is used in parallel agentic development (multiple Claude Code sessions on different branches/worktrees).

**Never use `pkill` to stop dev/preview servers** - other workspaces may be running their own servers.

**Reserved ports:**
| Port | Purpose |
|------|---------|
| 4321 | Default dev server (`pnpm dev`) |
| 4399 | PR screenshot capture |

When you need an isolated server (e.g., for screenshots):
```bash
pnpm preview --port 4399 &
PREVIEW_PID=$!
# ... do work ...
kill $PREVIEW_PID  # Kill only YOUR server
```

## Important Notes

- Stay on Astro v5.15.9+ for security patches
- Do not use Auto Minify in Cloudflare (causes hydration issues)
- Blog URLs are dateless (`/blog/slug`) — dates are in metadata only

## Analytics (PostHog)

PostHog provides product analytics with AI-friendly data access via MCP and APIs.

### Prerequisites

- **1Password CLI** (`op`) installed and signed in
- Access to **Causadix** vault (for client-side tracking — just works)
- Personal PostHog API key (for MCP server — see setup below)

### Setup (1Password)

Client-side tracking secrets are managed via 1Password and injected automatically on session start.

1. Create a PostHog account at https://us.posthog.com
2. Create a project and copy the project API key
3. Add the key to 1Password:
   - Create an item in the **Causadix** vault (or use existing)
   - Add field: `PostHog Project API Key`
4. Update `.op.env` with the correct item ID:
   ```bash
   # Find item ID
   op item list --vault Causadix --format json | jq '.[] | {title, id}'
   ```
5. For Cloudflare Pages, add `PUBLIC_POSTHOG_KEY` in the dashboard

### How It Works

- `.op.env` — 1Password secret references (committed, no actual secrets)
- `.claude/hooks/load-op-env.py` — SessionStart hook resolves secrets
- Secrets are injected into the session environment automatically

### Features

- **Pageview tracking:** Automatic on every page load
- **Page leave tracking:** Captures time on page
- **User identification:** `identified_only` mode (privacy-respecting)
- **Custom events:** Use `posthog.capture('event_name', { properties })` in client code

### AI/Data Access (MCP Server)

The PostHog MCP server lets Claude query analytics directly. Each developer needs their own personal API key.

**First-time setup:**

1. Create a PostHog personal API key:
   - Go to https://us.posthog.com/settings/user-api-keys
   - Create key with scopes: `project:read`, `insight:read`

2. Add to your shell profile (`~/.zshrc` or `~/.bashrc`):
   ```bash
   export POSTHOG_API_KEY="phx_YOUR_KEY_HERE"
   ```

3. Restart your terminal and Claude Code

The MCP server script checks for this env var first. If not set, it exits gracefully (no errors for devs without setup).

**Other data access:**
- **HogQL:** SQL-like queries at https://us.posthog.com/sql
- **API:** Full REST API + batch exports to BigQuery/Snowflake
- **Python SDK:** `pip install posthog`

### Dashboard

View analytics at https://us.posthog.com — free tier includes 1M events/month
