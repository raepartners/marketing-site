# Contact Form Design

Replace mailto contact buttons with a conversion-optimized form that submits to Slack and R2.

## Form Fields

All required:

| Field | Type | Validation |
|-------|------|------------|
| Name | Text input | Min 2 chars |
| Work Email | Email input | Valid email format |
| Role | Text input | Min 2 chars |
| Coding Agents | Multi-select chips | At least 1 selection |

### Coding Agents List

**CLIs:**
- Claude Code
- GitHub Copilot CLI
- Gemini CLI
- Codex

**IDE/GUI:**
- Cursor
- Windsurf
- Goose

**Chat:**
- ChatGPT
- Gemini
- Claude.ai

**Opt-outs (mutually exclusive, always active):**
- "I/we don't use coding agents yet"
- "We use some, I'm not sure which"

**Opt-out behavior:** Selecting either grays out tool chips but preserves their selection state. Unselecting restores interactivity with previous selections intact.

## Presentation

- **Desktop (>768px):** Modal dialog opens on contact button click
- **Mobile:** Navigate to `/contact` page
- Same form component used in both contexts

## Backend Architecture

All Cloudflare, no external services:

```
POST /contact
Body: { name, email, role, agents[], optedOut, optOutReason, source }

1. Validate fields
2. Write JSON to R2: leads/{timestamp}-{uuid}.json
3. POST formatted message to Slack webhook
4. Return { success: true }
```

**R2 bucket:** `rae-leads`

**Environment variables:**
- `SLACK_WEBHOOK_URL` - Slack incoming webhook
- `LEADS_BUCKET` - R2 bucket binding (in wrangler.toml)

**Slack message format:**
```
New Contact Form Submission

Name: Jane Smith
Email: jane@acme.com
Role: Engineering Manager

Coding Agents: Claude Code, Cursor, ChatGPT

Source: homepage_cta
```

## PostHog Analytics

| Event | Properties | Trigger |
|-------|------------|---------|
| `contact_form_opened` | `source`, `device` | Modal opens or /contact loads |
| `contact_form_started` | `first_field` | First input focus |
| `contact_form_agents_selected` | `agents[]`, `opted_out`, `opt_out_reason` | Chip toggle (debounced) |
| `contact_form_submitted` | `agents[]`, `opted_out`, `role`, `source` | Successful submission |
| `contact_form_error` | `error_type`, `field` | Validation or API error |
| `contact_form_abandoned` | `source`, `fields_filled[]`, `time_on_form_ms` | Modal closed without submit |

UTM params captured automatically by PostHog.

## Files

### Create

| File | Purpose |
|------|---------|
| `src/components/ContactForm.tsx` | React form with chips, validation, PostHog |
| `src/components/ContactModal.tsx` | Dialog wrapper for desktop |
| `src/components/ContactButton.tsx` | Smart button (modal desktop, link mobile) |
| `src/pages/contact.astro` | Standalone page for mobile |
| `src/lib/coding-agents.ts` | Agent list with icon paths |
| `functions/contact.ts` | Cloudflare Pages Function |
| `public/icons/agents/*.svg` | 10 tool icons |

### Modify

| File | Change |
|------|--------|
| `src/components/Nav.astro` | Replace mailto with ContactButton |
| `src/components/Footer.astro` | Replace mailto with ContactButton |
| `src/pages/index.astro` | Replace mailto CTA with ContactButton |
| `src/pages/team.astro` | Replace mailto CTA with ContactButton |

### Add shadcn Components

- `input`
- `label`
- `dialog`

## Cloudflare Setup

1. Create R2 bucket `rae-leads`
2. Create Slack incoming webhook
3. Add to Cloudflare Pages environment:
   - `SLACK_WEBHOOK_URL`
4. Add R2 binding to `wrangler.toml`:
   ```toml
   [[r2_buckets]]
   binding = "LEADS_BUCKET"
   bucket_name = "rae-leads"
   ```
