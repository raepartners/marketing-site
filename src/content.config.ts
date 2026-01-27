import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().max(60, 'Title should be under 60 characters for SEO'),
    subtitle: z.string().optional(),
    description: z.string().max(155, 'Description should be under 155 characters for SEO'),
    publishedDate: z.coerce.date(),
    modifiedDate: z.coerce.date().optional(),
    author: z.object({
      name: z.string(),
      email: z.string().email().optional(),
      role: z.string().optional(),
    }),
    coAuthors: z.array(z.object({
      name: z.string(),
      email: z.string().email().optional(),
      role: z.string().optional(),
    })).optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
  }),
});

export const collections = { blog };
