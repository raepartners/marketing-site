import { test, expect } from '@playwright/test';
import { seoRoutes } from './fixtures/routes';

test.describe('SEO Tests', () => {
  for (const route of seoRoutes) {
    test.describe(`${route.name} (${route.path})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(route.path);
      });

      test('has title under 60 characters', async ({ page }) => {
        const title = await page.title();
        expect(title.length).toBeLessThanOrEqual(60);
        expect(title.length).toBeGreaterThan(0);
      });

      test('has meta description under 155 characters', async ({ page }) => {
        const description = await page
          .locator('meta[name="description"]')
          .getAttribute('content');
        expect(description).not.toBeNull();
        expect(description!.length).toBeLessThanOrEqual(155);
        expect(description!.length).toBeGreaterThan(0);
      });

      test('has canonical URL', async ({ page }) => {
        const canonical = await page
          .locator('link[rel="canonical"]')
          .getAttribute('href');
        expect(canonical).not.toBeNull();
        expect(canonical).toContain('rae.partners');
      });

      test('has Open Graph tags', async ({ page }) => {
        const ogTitle = await page
          .locator('meta[property="og:title"]')
          .getAttribute('content');
        const ogDescription = await page
          .locator('meta[property="og:description"]')
          .getAttribute('content');
        const ogType = await page
          .locator('meta[property="og:type"]')
          .getAttribute('content');

        expect(ogTitle).not.toBeNull();
        expect(ogDescription).not.toBeNull();
        expect(ogType).not.toBeNull();
      });

      test('has Twitter Card tags', async ({ page }) => {
        const twitterCard = await page
          .locator('meta[name="twitter:card"]')
          .getAttribute('content');
        expect(twitterCard).toBe('summary_large_image');
      });

      test('has exactly one H1', async ({ page }) => {
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBe(1);
      });

      test('has JSON-LD structured data', async ({ page }) => {
        const jsonLd = await page
          .locator('script[type="application/ld+json"]')
          .textContent();
        expect(jsonLd).not.toBeNull();
        
        // Should be valid JSON
        const parsed = JSON.parse(jsonLd!);
        expect(parsed['@context']).toBe('https://schema.org');
      });
    });
  }
});
