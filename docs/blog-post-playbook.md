# Blog Post Playbook

A complete guide to writing and publishing blog posts on the RAE Partners marketing site.

## URL Strategy

**Dateless URLs:** Blog posts use `/blog/slug-name` format.

- URLs don't include dates — content stays evergreen
- Dates appear on the page and in metadata
- Posts can be updated without URL changes

## Creating a New Post

### 1. Create the File

Create a new file at `src/content/blog/your-slug.mdx`.

**Slug guidelines:**
- Use lowercase letters, numbers, and hyphens only
- Keep it short but descriptive (3-6 words)
- Avoid dates in the slug
- Make it readable: `year-of-autonomous-engineering` not `yoae`

### 2. Add Frontmatter

```yaml
---
title: "Your Title Here"
description: "A compelling one-sentence description of the post."
publishedDate: 2026-01-24
author:
  name: "Your Name"
  email: "you@rae.partners"
  role: "Your Role"
tags:
  - relevant-tag
  - another-tag
featured: false
---
```

### 3. Write Content

Use standard Markdown with MDX extensions:

```mdx
## Section Heading

Regular paragraph text with **bold** and *italic*.

> Blockquotes for callouts or quotes

- Bullet lists
- For key points

1. Numbered lists
2. For sequences

### Code Examples

\`\`\`typescript
const example = "code block";
\`\`\`

### Links

[Link text](https://example.com)

[Internal link](/blog/other-post)
```

### 4. Verify

```bash
pnpm build    # Check it compiles
pnpm test     # Check SEO requirements
```

## Frontmatter Reference

| Field | Required | Max Length | Notes |
|-------|----------|------------|-------|
| `title` | Yes | 60 chars | Page title and H1 |
| `description` | Yes | 155 chars | Meta description and social previews |
| `publishedDate` | Yes | — | ISO date (YYYY-MM-DD) |
| `modifiedDate` | No | — | ISO date, use when significantly updating |
| `author.name` | Yes | — | Display name |
| `author.email` | No | — | For contact links |
| `author.role` | No | — | Title/role at RAE |
| `coAuthors` | No | — | Array of author objects |
| `tags` | No | — | Array of lowercase strings |
| `featured` | No | — | Boolean, shows "Featured" badge |
| `draft` | No | — | Boolean, hides from listing if true |

## SEO Checklist

Before publishing, verify:

- [ ] Title is under 60 characters
- [ ] Description is under 155 characters
- [ ] Description is compelling (not just a summary)
- [ ] One clear H1 (the title)
- [ ] Heading hierarchy (H2 → H3, not H2 → H4)
- [ ] All links work
- [ ] Images have alt text
- [ ] Code examples are correct

## Writing Guidelines

### Title Best Practices

- Be specific: "Why Automated Tests Matter for AI Agents" not "Testing Thoughts"
- Front-load keywords: Put important words first
- Avoid clickbait: Be accurate, not sensational

### Description Best Practices

- Write a complete sentence
- Include a value proposition: What will readers learn?
- Don't just summarize — sell the read

### Content Structure

1. **Opening hook** — Why should someone read this?
2. **Context** — What background do they need?
3. **Main content** — Your insights, broken into sections
4. **Conclusion** — Key takeaways and next steps
5. **CTA** — What should they do next?

## Co-authored Posts

For posts with multiple authors:

```yaml
---
author:
  name: "Primary Author"
  role: "CEO"
coAuthors:
  - name: "Co-author Name"
    role: "CTO"
---
```

Both authors will be displayed on the post.

## Updating Posts

When making significant updates:

1. Update the content
2. Add or update `modifiedDate` in frontmatter
3. The page will show "Updated [date]"

## Draft Posts

To work on a post without publishing:

```yaml
---
draft: true
---
```

Draft posts won't appear in the blog listing but can be accessed directly by URL during development.

## Testing Your Post

After creating a post:

```bash
# Build to check for errors
pnpm build

# Run SEO tests
pnpm test -- --grep "seo"

# Preview locally
pnpm preview
# Then visit http://localhost:4321/blog/your-slug
```
