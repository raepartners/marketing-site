# RAE Marketing Site

Astro 5 static marketing site for RAE Partners.

## Project Skills

- `kb-record-research-decisions` — Use before committing. Evaluates whether research/decisions should persist to the shared rae-mgmt brain.

## Shared Knowledge Base

Research and decisions that affect RAE broadly should persist to rae-mgmt:
- **Path:** `/Users/trippwickersham/conductor/workspaces/rae-mgmt/{worktree}/`
- **Marketing research:** `areas/marketing/research/`
- **Decisions:** `areas/{area}/decisions/`

Find active worktrees: `cd /Users/trippwickersham/Code/rae-mgmt && git worktree list`

## Stack

- **Framework:** Astro 5 (static output)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Content:** MDX + Content Collections (Zod schemas)
- **Testing:** Playwright + axe-core
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

Currently not deployed. When ready:
1. Connect to Cloudflare Pages
2. Build command: `pnpm build`
3. Output directory: `dist`

## Important Notes

- Stay on Astro v5.15.9+ for security patches
- Do not use Auto Minify in Cloudflare (causes hydration issues)
- Blog URLs are dateless (`/blog/slug`) — dates are in metadata only
