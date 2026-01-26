---
name: kb-record-research-decisions
description: Use before committing in feature repos. Evaluates whether research or decisions should persist to the shared rae-mgmt brain.
---

# Cross-Repo Knowledge Capture

## When to Invoke

**Trigger:** Before committing work that involved research or significant decisions.

Ask yourself:
1. Did I conduct research that someone would otherwise repeat?
2. Did I make a decision that affects how RAE operates?

If yes to either, continue. If no to both, commit without capture.

## Should This Persist?

**Research test:**
- Findings answer a recurring question → CAPTURE
- Multiple sources synthesized → CAPTURE
- Domain expertise built → CAPTURE
- One-off or easily re-searched → SKIP

**Decision test:**
- Hard to reverse (one-way door) → CAPTURE
- Cross-cutting impact → CAPTURE
- Sets a pattern others follow → CAPTURE
- Trivial, local, easily changed → SKIP

When uncertain, ask the user.

## Where to Write

**rae-mgmt location:** Find via git config or common locations:
```bash
# Check git config first
RAE_MGMT=$(git config --global --get rae.mgmt-path)
# Fallback to common locations
[ -z "$RAE_MGMT" ] && [ -d ~/Code/rae-mgmt ] && RAE_MGMT=~/Code/rae-mgmt
# List worktrees
cd "$RAE_MGMT" && git worktree list
```

**Directory structure:**
| Content type | Location |
|-------------|----------|
| Marketing research | `areas/marketing/research/` |
| Decisions (any area) | `areas/{area}/decisions/` |
| Domain concepts | `resources/concepts/` |
| Reference material | `resources/reference/` |

## How to Capture

1. **Write the file** directly to rae-mgmt path
2. **Commit in rae-mgmt:**
```bash
cd /path/to/rae-mgmt/worktree && git add . && git commit -m "Add [type]: [topic]"
```
3. **Update `_index.md`** if adding to a project folder

## Format

Use frontmatter:
```yaml
---
title: "Descriptive Title"
doc_type: research | decision
area: marketing | operations | etc
status: active
date: YYYY-MM-DD
tags: [relevant, topics]
---
```

Research: Key findings, recommendations, sources.
Decisions: Context, decision, rationale, consequences.

## Anti-Patterns

- Dumping raw session output (synthesize first)
- Capturing ephemeral/time-sensitive info
- Writing without committing (lost work)
- Wrong worktree (check branch purpose first)

## Cross-Referencing

**Always link related work across repos.** When capturing to rae-mgmt, reference the source repo/branch/PR.

**In rae-mgmt commits:**
```
Add [type]: [topic]

Source: {repo}#{pr} or {repo}@{branch}
```

**In feature repo commits (when KB was updated):**
```
[commit message]

KB: rae-mgmt@{branch} or rae-mgmt#{pr}
```

**In PR descriptions:**
```markdown
## Related
- KB updates: raepartners/rae-mgmt#{pr} or @{branch}
```

This enables bidirectional discovery between implementation and knowledge.
