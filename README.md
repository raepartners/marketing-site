# RAE Partners Marketing Site

The public-facing marketing site for [RAE Partners](https://rae.partners) — Responsible Autonomous Engineering.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run tests
pnpm test
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | [Astro 5](https://astro.build) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Content | MDX + [Content Collections](https://docs.astro.build/en/guides/content-collections/) |
| Testing | [Playwright](https://playwright.dev) + [axe-core](https://www.deque.com/axe/) |
| Deployment | Cloudflare Pages (planned) |

## Project Structure

```
.
├── src/
│   ├── components/     # Astro and React components
│   ├── content/        # Blog posts (MDX)
│   ├── layouts/        # Page layouts
│   ├── pages/          # File-based routing
│   └── styles/         # Global styles
├── tests/              # Playwright tests
├── public/             # Static assets
├── CLAUDE.md           # AI agent instructions
└── docs/               # Documentation
```

## Writing Blog Posts

See [docs/blog-post-playbook.md](docs/blog-post-playbook.md) for the complete guide.

Quick version:
1. Create `src/content/blog/your-slug.mdx`
2. Add frontmatter with title, description, date, author
3. Write content
4. Run `pnpm test` to verify

## Development

### Adding Components

We use [shadcn/ui](https://ui.shadcn.com) for UI components:

```bash
pnpm dlx shadcn@latest add button
```

### Running Tests

```bash
pnpm test              # All tests
pnpm test:ui           # Interactive mode
```

### Building for Production

```bash
pnpm build
```

Output goes to `dist/` — pure static HTML, CSS, and JavaScript.

## Contributing

This site is primarily managed by AI agents. See `CLAUDE.md` for agent-specific instructions.

For humans: follow standard Git workflow with feature branches and PR reviews.

## License

Copyright 2026 RAE Partners. All rights reserved.
