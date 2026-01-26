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

## Manual Steps (Cloudflare Dashboard)

1. Create Pages project connected to `raepartners/marketing-site`
2. Set project name to `rae-mktg`
3. Add CNAME record for `rae.partners`
4. Add custom domain in Pages project settings

## Cost

$0 — Cloudflare Pages free tier includes:
- 500 builds/month (sufficient for ~50-100 PRs)
- Unlimited bandwidth
- Automatic PR previews
- Global CDN
