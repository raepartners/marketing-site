---
name: pr-visual-screenshots
description: Use when opening a PR that includes visual changes to pages or components
---

# PR Visual Screenshots

Visual changes REQUIRE screenshot evidence in PRs. No exceptions.

## Requirements

The screenshot set must collectively:
1. Show **every page/component changed** (one screenshot per change)
2. Include **at least one light mode** screenshot
3. Include **at least one dark mode** screenshot
4. Include **at least one desktop** (1280px) screenshot
5. Include **at least one mobile** (375px) screenshot

Use the **smallest number of screenshots** that satisfies all criteria.

## Minimum Screenshots

For N pages changed, exactly N screenshots. Distribute modes/viewports:

| Pages | Distribution |
|-------|-------------|
| 1 page | 2 min: one desktop-light, one mobile-dark |
| 2 pages | page1: desktop-light, page2: mobile-dark |
| 3 pages | page1: desktop-light, page2: mobile-dark, page3: desktop-dark |

## Required Process

**You MUST follow these steps:**

1. **Capture screenshots** using Playwright:
   ```typescript
   const context = await browser.newContext({
     viewport: { width: 1280, height: 800 },  // or 375x812 for mobile
     colorScheme: 'light',  // or 'dark'
   });
   await page.screenshot({ path: 'pr-screenshots/name.png', fullPage: true });
   ```

2. **Commit screenshots to branch** (force-add past gitignore):
   ```bash
   git add -f pr-screenshots/
   git commit -m "Add PR screenshots for review"
   git push
   ```

3. **Include in PR body** using raw GitHub URLs:
   ```markdown
   ## Screenshots
   ### Page Name (Viewport, Theme)
   ![alt](https://raw.githubusercontent.com/{owner}/{repo}/{branch}/pr-screenshots/{name}.png)
   ```

## What Counts as Visual Changes

Component styling, layout, new UI, theme/color, typography, responsive design

## What Does NOT Require Screenshots

Backend/API, test-only, documentation-only, config-only changes
