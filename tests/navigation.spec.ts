import { test, expect } from '@playwright/test';

test.describe('Navigation Tests', () => {
  test('nav links work correctly', async ({ page }) => {
    await page.goto('/');
    
    // Click Blog link
    await page.click('nav a[href="/blog"]');
    await expect(page).toHaveURL('/blog');
    
    // Click Home link
    await page.click('nav a[href="/"]');
    await expect(page).toHaveURL('/');
  });

  test('logo links to home', async ({ page }) => {
    await page.goto('/blog');
    
    // Click logo
    await page.click('nav a[href="/"]');
    await expect(page).toHaveURL('/');
  });

  test('blog post links work', async ({ page }) => {
    await page.goto('/blog');
    
    // Click first blog post
    const firstPost = page.locator('article a').first();
    await firstPost.click();
    
    // Should be on a blog post page
    await expect(page).toHaveURL(/\/blog\/.+/);
  });

  test('CTA buttons have correct href', async ({ page }) => {
    await page.goto('/');
    
    // Check contact button
    const contactLinks = page.locator('a[href="mailto:hello@rae.partners"]');
    expect(await contactLinks.count()).toBeGreaterThan(0);
  });

  test('blog post back navigation works', async ({ page }) => {
    await page.goto('/blog/year-of-autonomous-engineering');
    
    // Click Blog breadcrumb
    await page.click('a[href="/blog"]');
    await expect(page).toHaveURL('/blog');
  });
});
