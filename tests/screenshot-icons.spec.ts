import { test } from '@playwright/test';

test('capture contact form icons', async ({ page, context }) => {
  // Clear cache
  await context.clearCookies();

  await page.goto('/', { waitUntil: 'networkidle' });

  // Click Contact button to open modal
  await page.click('button:has-text("Contact")');
  await page.waitForTimeout(1000);

  // Take screenshot of the modal
  await page.screenshot({
    path: 'tests/screenshots/contact-form-light.png',
    fullPage: false
  });

  // Also take a zoomed screenshot of just the coding agents section
  const agentsSection = page.locator('text=Which coding agent');
  if (await agentsSection.isVisible()) {
    await agentsSection.screenshot({
      path: 'tests/screenshots/agents-section.png'
    });
  }

  console.log('Screenshots saved');
});
