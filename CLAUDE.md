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

## Important Notes

- Stay on Astro v5.15.9+ for security patches
- Do not use Auto Minify in Cloudflare (causes hydration issues)
- Blog URLs are dateless (`/blog/slug`) — dates are in metadata only

## Analytics (PostHog)

PostHog provides product analytics with AI-friendly data access via MCP and APIs.

### Setup (1Password)

Secrets are managed via 1Password and injected automatically on session start.

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

### AI/Data Access

- **MCP Server:** https://github.com/PostHog/mcp — query analytics via Claude
- **HogQL:** SQL-like queries at https://us.posthog.com/sql
- **API:** Full REST API + batch exports to BigQuery/Snowflake
- **Python SDK:** `pip install posthog`

### Dashboard

View analytics at https://us.posthog.com — free tier includes 1M events/month
