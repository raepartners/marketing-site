---
name: pr-visual-screenshots
description: Use when opening a PR that includes visual changes to pages or components
---

# PR Visual Screenshots

Visual changes require screenshot evidence in PRs.

## Requirements

The screenshot set must collectively:
1. Show **every page/component changed** (one screenshot per change)
2. Include **at least one light mode** screenshot
3. Include **at least one dark mode** screenshot
4. Include **at least one desktop** (1280px) screenshot
5. Include **at least one mobile** (375px) screenshot

Use the **smallest number of screenshots** that satisfies all criteria.

## Minimum Screenshots

For N pages changed, you need exactly N screenshots. Distribute modes/viewports across them:

| Pages | Example Distribution |
|-------|---------------------|
| 1 page | Need 2 min: one light, one dark (or one desktop, one mobile) |
| 2 pages | page1: desktop-light, page2: mobile-dark |
| 3 pages | page1: desktop-light, page2: mobile-dark, page3: desktop-dark |

## Process

1. Capture screenshots to `pr-screenshots/` (gitignored)
2. Create PR
3. Drag-drop screenshots into PR body on GitHub (uploads as attachments)

## What Counts as Visual Changes

- Component styling, layout changes, new UI components
- Theme/color modifications, typography changes
- Responsive design changes

## What Does NOT Require Screenshots

- Backend/API, test-only, documentation-only changes
