---
name: pr-visual-screenshots
description: Use when opening a PR that includes visual changes to pages or components
---

# PR Visual Screenshots

## Overview

Visual changes require screenshot evidence in PRs. Screenshots prove changes work across themes and viewports.

## Requirements

For PRs with visual changes, include screenshots covering:

1. **Each page/component changed** - one set per distinct visual change
2. **Both themes** - light mode AND dark mode
3. **Both viewports** - desktop (1280px) AND mobile (375px)

## Screenshot Matrix

For N pages with visual changes, include **4N screenshots**:

| Page | Theme | Viewport | Filename |
|------|-------|----------|----------|
| page-name | light | desktop | `page-name-desktop-light.png` |
| page-name | light | mobile | `page-name-mobile-light.png` |
| page-name | dark | desktop | `page-name-desktop-dark.png` |
| page-name | dark | mobile | `page-name-mobile-dark.png` |

## Capturing Screenshots

Use Playwright with `colorScheme` and `viewport`:

```typescript
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },  // or 375x812 for mobile
  colorScheme: 'light',  // or 'dark'
});
await page.screenshot({ path: 'filename.png', fullPage: true });
```

## PR Body Format

Include screenshots in the PR description under a `## Screenshots` section:

```markdown
## Screenshots

### Homepage
| Light | Dark |
|-------|------|
| Desktop: ![](screenshots/homepage-desktop-light.png) | Desktop: ![](screenshots/homepage-desktop-dark.png) |
| Mobile: ![](screenshots/homepage-mobile-light.png) | Mobile: ![](screenshots/homepage-mobile-dark.png) |
```

## What Counts as Visual Changes

- Component styling (CSS, Tailwind classes)
- Layout changes
- New UI components
- Theme/color modifications
- Typography changes
- Responsive design changes

## What Does NOT Require Screenshots

- Backend/API changes
- Test-only changes
- Documentation-only changes
- Config file changes with no visual impact
