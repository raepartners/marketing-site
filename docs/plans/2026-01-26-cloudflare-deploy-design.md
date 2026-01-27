# Cloudflare Pages Deployment & Local Dev Fix

**Date:** 2026-01-26
**Status:** Implemented

## Problem

1. Local dev has hardcoded absolute paths (`/Users/trippwickersham/...`) that break on other machines
2. No deployment infrastructure — need production hosting and PR preview environments

## Solution

### Architecture

```
GitHub repo (raepartners/marketing-site)
           │
           ├── Push to main ──────────► GitHub Actions ──► Cloudflare Pages ──► rae.partners
           │
           └── Open/update PR ────────► GitHub Actions ──► Cloudflare Pages ──► {branch}.rae-mktg.pages.dev
```

### 1. Fix Absolute Paths

Replace hardcoded paths with `$RAE_MGMT_PATH` environment variable.

**Files modified:**
- `.claude/skills/kb-record-research-decisions/skill.md`
- `CLAUDE.md`

**Developer setup:** Each developer adds to their shell config:
```bash
export RAE_MGMT_PATH="$HOME/path/to/rae-mgmt"
```

### 2. Cloudflare Pages Configuration

**wrangler.toml** (project metadata only — build handled by GitHub Actions):
```toml
name = "rae-mktg"
pages_build_output_dir = "dist"
```

Note: The `[build]` section is not supported for Pages projects in wrangler.toml.
Build commands are configured in GitHub Actions workflow.

**Project name:** `rae-mktg`
**URLs:**
- Production: `rae.partners` (custom domain)
- Previews: `{branch}.rae-mktg.pages.dev`

### 3. GitHub Actions Deployment

The CI workflow (`.github/workflows/ci.yml`) handles deployment:
1. `build-and-test` job: builds site, runs tests, uploads `dist/` as artifact
2. `deploy` job: downloads artifact, deploys to Cloudflare Pages via wrangler

Benefits over native Cloudflare Git integration:
- Full control over build process
- Tests must pass before deploy
- Artifact sharing eliminates duplicate builds

### 4. DNS Setup

CNAME record in Cloudflare DNS:
| Type | Name | Target |
|------|------|--------|
| CNAME | `@` | `rae-mktg.pages.dev` |

## One-Time Setup Steps

### Step 1: Create Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use template: **"Edit Cloudflare Workers"** (includes Pages permissions)
4. Add permission: **Zone → DNS → Edit** (for custom domain)
5. Restrict to your account and `rae.partners` zone
6. Create and copy the token

### Step 2: Add GitHub Secrets

1. Go to [GitHub repo secrets](https://github.com/raepartners/marketing-site/settings/secrets/actions)
2. Add these repository secrets:

| Secret Name | Value |
|-------------|-------|
| `CLOUDFLARE_API_TOKEN` | (token from Step 1) |
| `CLOUDFLARE_ACCOUNT_ID` | (from Cloudflare dashboard URL or account settings) |

### Step 3: Create Pages Project

Via Wrangler CLI (or Cloudflare dashboard):
```bash
npx wrangler pages project create rae-mktg --production-branch=main
```

### Step 4: Add Custom Domain

Via API or dashboard:
1. In Pages project → Custom domains → Add `rae.partners`
2. Cloudflare auto-configures DNS (domain already on Cloudflare)
3. SSL certificate provisions automatically (~1 min)

### Step 5: Verify

- Push to `main` → deploys to `rae.partners`
- Open PR → preview at `{branch}.rae-mktg.pages.dev`
- PR gets automatic comment with preview URL

## Cost

$0 — Cloudflare Pages free tier includes:
- 500 builds/month (sufficient for ~50-100 PRs)
- Unlimited bandwidth
- Automatic PR previews
- Global CDN
