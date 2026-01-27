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

## R2 Configuration

Screenshots are hosted on Cloudflare R2 (bucket: `pr-screenshots`).

| Setting | Value |
|---------|-------|
| Public URL | `https://pub-7c9c2aeb25384cc093c64657da1b28c6.r2.dev` |
| Bucket | `pr-screenshots` |

## Required Process

**You MUST follow these steps:**

1. **Build the project:**
   ```bash
   pnpm build
   ```

2. **Start an isolated preview server** on a dedicated port:
   ```bash
   pnpm preview --port 4399 &
   PREVIEW_PID=$!
   sleep 2
   ```

3. **Capture screenshots** using Playwright with toolbar removal:
   ```typescript
   async function removeAstroToolbar(page: Page) {
     await page.evaluate(() => {
       const toolbar = document.querySelector('astro-dev-toolbar');
       if (toolbar) toolbar.remove();
     });
     await page.waitForTimeout(100);
   }

   const context = await browser.newContext({
     viewport: { width: 1280, height: 800 },  // or 375x812 for mobile
     colorScheme: 'light',  // or 'dark'
   });
   const page = await context.newPage();
   await page.goto('http://localhost:4399/');
   await page.waitForLoadState('networkidle');
   await removeAstroToolbar(page);
   await page.screenshot({ path: 'pr-screenshots/name.png', fullPage: true });
   ```

4. **Stop your preview server**:
   ```bash
   kill $PREVIEW_PID 2>/dev/null || true
   ```

5. **Upload to R2** using wrangler:
   ```bash
   PR_PREFIX="pr-$(git rev-parse --abbrev-ref HEAD)"

   for file in pr-screenshots/*; do
     npx wrangler r2 object put "pr-screenshots/$PR_PREFIX/$(basename $file)" \
       --file "$file" \
       --content-type "$(file --mime-type -b $file)" \
       --remote
   done
   ```

6. **Include in PR body** using R2 public URLs:
   ```markdown
   ## Screenshots
   ### Page Name (Viewport, Theme)
   ![alt](https://pub-7c9c2aeb25384cc093c64657da1b28c6.r2.dev/pr-{branch}/name.png)
   ```

7. **Clean up local files** (they're gitignored, just delete):
   ```bash
   rm -rf pr-screenshots/
   ```

## Suppressing Dev Overlays

The Astro dev toolbar can appear in screenshots. **Always remove it via JavaScript** before capturing:

```typescript
await page.evaluate(() => {
  const toolbar = document.querySelector('astro-dev-toolbar');
  if (toolbar) toolbar.remove();
});
```

## Parallel Workspace Safety

**Never use `pkill` to stop servers** - other workspaces may be running their own servers. Always:
- Start your preview server on a dedicated port (4399 for screenshots)
- Track the PID and kill only that specific process
- Use `kill $PID` not `pkill -f astro`

## When to Include Video

When interaction design changes **cannot be faithfully captured in screenshots alone**:
- Animations (marquees, transitions, loading states)
- Hover/focus interactions
- Scroll-triggered effects
- Multi-step interactions

### Video Workflow

1. **Record video with Playwright** (saves as .webm):
   ```typescript
   const context = await browser.newContext({
     viewport: { width: 1280, height: 720 },
     colorScheme: 'light',
     recordVideo: { dir: 'pr-screenshots/', size: { width: 1280, height: 720 } }
   });
   const page = await context.newPage();
   await page.goto('http://localhost:4399/');
   await removeAstroToolbar(page);
   await page.waitForTimeout(duration);  // Full animation cycle
   await context.close();  // Video saved on close
   ```

2. **Convert to mp4** (H.264 for compatibility):
   ```bash
   ffmpeg -i video.webm -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -an output.mp4
   ```

3. **Create smooth GIF preview** (8-10 seconds, auto-plays in GitHub):
   ```bash
   ffmpeg -y -ss 0 -t 8 -i output.mp4 \
     -vf "fps=20,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4" \
     preview.gif
   ```

   **Key settings for smooth animation GIFs:**
   - `fps=20` — 20fps minimum for smooth motion (15fps looks choppy)
   - `scale=720:-1` — 720px width balances quality vs file size
   - `max_colors=96` — Fewer colors = smaller file
   - `stats_mode=diff` — Better palette for animations
   - `dither=bayer:bayer_scale=4` — Reduces banding artifacts

   **Target file size:** Under 3MB for fast GitHub loading.

4. **Upload to R2 and include in PR**:
   ```markdown
   ## Animation Preview
   ![Animation](https://pub-7c9c2aeb25384cc093c64657da1b28c6.r2.dev/pr-{branch}/preview.gif)

   [Download full video (mp4)](https://pub-7c9c2aeb25384cc093c64657da1b28c6.r2.dev/pr-{branch}/video.mp4)
   ```

## What Counts as Visual Changes

Component styling, layout, new UI, theme/color, typography, responsive design

## What Does NOT Require Screenshots

Backend/API, test-only, documentation-only, config-only changes

## Why R2 Instead of Commits?

- **No repo bloat** — Binary files don't belong in git history
- **Faster clones** — Repo stays lean
- **Inline rendering** — GitHub proxies external images through Camo CDN
- **Permanent URLs** — Screenshots persist even after PR is merged
- **Free tier** — 10GB storage, 10M requests/month included

---

## Appendix: R2 Setup (Reference Only)

*This section is for setting up new projects. The marketing site bucket is already configured.*

1. Create bucket: `npx wrangler r2 bucket create pr-screenshots`
2. Enable public access: Dashboard → R2 → bucket → Settings → Public access → Enable r2.dev subdomain
3. Note the public URL (format: `https://pub-{id}.r2.dev`)
