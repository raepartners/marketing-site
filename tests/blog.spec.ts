import { test, expect } from '@playwright/test';

test.describe('Blog Tests', () => {
  test('blog index shows posts', async ({ page }) => {
    await page.goto('/blog');
    
    // Should have at least one article
    const articles = page.locator('article');
    expect(await articles.count()).toBeGreaterThan(0);
  });

  test('blog posts have required elements', async ({ page }) => {
    await page.goto('/blog/year-of-autonomous-engineering');
    
    // Has title
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    
    // Has author info (check the author card, not the signature)
    const authorCard = page.locator('header').getByText('Tripp Wickersham').first();
    await expect(authorCard).toBeVisible();
    
    // Has published date
    const time = page.locator('time');
    await expect(time).toBeVisible();
    
    // Has content (prose section)
    const prose = page.locator('.prose');
    await expect(prose).toBeVisible();
  });

  test('blog post has article structured data', async ({ page }) => {
    await page.goto('/blog/year-of-autonomous-engineering');
    
    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .textContent();
    const parsed = JSON.parse(jsonLd!);
    
    expect(parsed['@type']).toBe('BlogPosting');
    expect(parsed.datePublished).toBeDefined();
  });

  test('featured posts are marked', async ({ page }) => {
    await page.goto('/blog');
    
    // The launch post should be featured
    const featured = page.getByText('Featured');
    await expect(featured).toBeVisible();
  });
});
