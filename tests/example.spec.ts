import { test, expect } from '@playwright/test';

test('homepage has title and links', async ({ page }) => {
  await page.goto('/');
  
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/The Suite/);
  
  // Expect the footer to be visible
  const footer = page.getByRole('contentinfo');
  await expect(footer).toBeVisible();
}); 