# Cloudflare Pages Deployment & Local Dev Fix

**Date:** 2026-01-26
**Status:** Approved

## Problem

1. Local dev has hardcoded absolute paths (`/Users/trippwickersham/...`) that break on other machines
2. No deployment infrastructure — need production hosting and PR preview environments

## Solution

### Architecture

```
GitHub repo (raepartners/marketing-site)
           │
           ├── Push to main ──────────► Cloudflare Pages ──► rae.partners (production)
           │
           └── Open/update PR ────────► Cloudflare Pages ──► {branch}.rae-mktg.pages.dev (preview)
```

### 1. Fix Absolute Paths

Replace hardcoded paths with `$RAE_MGMT_PATH` environment variable.

**Files to modify:**
- `.claude/skills/kb-record-research-decisions/skill.md`
- `CLAUDE.md`

**Developer setup:** Each developer adds to their shell config:
```bash
export RAE_MGMT_PATH="$HOME/path/to/rae-mgmt"
```

### 2. Cloudflare Pages Configuration

Add `wrangler.toml`:
```toml
name = "rae-mktg"
pages_build_output_dir = "dist"

[build]
command = "pnpm install && pnpm build"

[build.environment]
NODE_VERSION = "20"
```

**Project name:** `rae-mktg`
**URLs:**
- Production: `rae.partners` (custom domain)
- Previews: `{branch}.rae-mktg.pages.dev`

### 3. DNS Setup

CNAME record in Cloudflare DNS:
| Type | Name | Target |
|------|------|--------|
| CNAME | `@` | `rae-mktg.pages.dev` |

## Cloudflare Setup (One-Time)

### Step 1: Create Pages Project

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create
2. Select "Pages" tab → "Connect to Git"
3. Authorize GitHub if needed, select `raepartners/marketing-site`
4. Configure build:
   - **Project name:** `rae-mktg`
   - **Production branch:** `main`
   - **Build command:** `pnpm install && pnpm build` (auto-detected from wrangler.toml)
   - **Build output directory:** `dist`
5. Click "Save and Deploy"

### Step 2: Add Custom Domain

1. In the Pages project → Custom domains → Add custom domain
2. Enter `rae.partners`
3. Cloudflare auto-configures DNS (since domain is already on Cloudflare)
4. Wait ~1 min for SSL certificate

### Step 3: Verify

- Push to `main` → deploys to `rae.partners`
- Open PR → preview at `{branch}.rae-mktg.pages.dev`
- PR gets automatic comment with preview URL

## Cost

$0 — Cloudflare Pages free tier includes:
- 500 builds/month (sufficient for ~50-100 PRs)
- Unlimited bandwidth
- Automatic PR previews
- Global CDN
