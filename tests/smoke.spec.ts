import { test, expect } from '@playwright/test';
import { routes } from './fixtures/routes';

test.describe('Smoke Tests', () => {
  for (const route of routes) {
    test(`${route.name} (${route.path}) loads successfully`, async ({ page }) => {
      const response = await page.goto(route.path);
      
      // Page should return 200
      expect(response?.status()).toBe(200);
      
      // No console errors
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Wait for network idle
      await page.waitForLoadState('networkidle');
      
      // Check no critical console errors (ignore some common non-critical ones)
      const criticalErrors = consoleErrors.filter(
        (err) => !err.includes('favicon') && !err.includes('404')
      );
      expect(criticalErrors).toHaveLength(0);
    });
  }
});
