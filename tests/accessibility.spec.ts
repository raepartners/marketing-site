import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { routes } from './fixtures/routes';

test.describe('Accessibility Tests', () => {
  for (const route of routes) {
    test(`${route.name} (${route.path}) passes axe-core checks`, async ({ page }) => {
      await page.goto(route.path);
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      
      // Log violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log('Accessibility violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
      }
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
