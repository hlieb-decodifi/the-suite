import { test, expect } from '@playwright/test';
import { TEST_USERS, signUp, signIn, signOut } from './utils/auth';

test.describe('Authentication', () => {
  test.describe('Client Authentication', () => {
    test('should allow client to sign up', async ({ page }) => {
      await signUp(page, TEST_USERS.client);

      // Verify successful signup
      await expect(
        page.getByRole('heading', { name: /dashboard/i }),
      ).toBeVisible();
      await expect(
        page.getByText(new RegExp(TEST_USERS.client.firstName)),
      ).toBeVisible();

      // Clean up
      await signOut(page);
    });

    test('should allow client to sign in', async ({ page }) => {
      // First sign up
      await signUp(page, TEST_USERS.client);
      await signOut(page);

      // Then test sign in
      await signIn(page, TEST_USERS.client);

      // Verify successful login
      await expect(
        page.getByRole('heading', { name: /dashboard/i }),
      ).toBeVisible();
      await expect(
        page.getByText(new RegExp(TEST_USERS.client.firstName)),
      ).toBeVisible();

      // Clean up
      await signOut(page);
    });

    test('should show client-specific navigation items', async ({ page }) => {
      await signIn(page, TEST_USERS.client);

      // Verify client-specific UI elements
      await expect(
        page.getByRole('link', { name: /my bookings/i }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: /my profile/i }),
      ).toBeVisible();

      // Verify professional-only sections are not visible
      await expect(
        page.getByRole('link', { name: /services/i }),
      ).not.toBeVisible();
      await expect(
        page.getByRole('link', { name: /portfolio/i }),
      ).not.toBeVisible();

      await signOut(page);
    });
  });

  test.describe('Professional Authentication', () => {
    test('should allow professional to sign up', async ({ page }) => {
      await signUp(page, TEST_USERS.professional);

      // Verify successful signup
      await expect(
        page.getByRole('heading', { name: /dashboard/i }),
      ).toBeVisible();
      await expect(
        page.getByText(new RegExp(TEST_USERS.professional.firstName)),
      ).toBeVisible();

      // Clean up
      await signOut(page);
    });

    test('should allow professional to sign in', async ({ page }) => {
      // First sign up
      await signUp(page, TEST_USERS.professional);
      await signOut(page);

      // Then test sign in
      await signIn(page, TEST_USERS.professional);

      // Verify successful login
      await expect(
        page.getByRole('heading', { name: /dashboard/i }),
      ).toBeVisible();
      await expect(
        page.getByText(new RegExp(TEST_USERS.professional.firstName)),
      ).toBeVisible();

      // Clean up
      await signOut(page);
    });

    test('should show professional-specific navigation items', async ({
      page,
    }) => {
      await signIn(page, TEST_USERS.professional);

      // Verify professional-specific UI elements
      await expect(page.getByRole('link', { name: /services/i })).toBeVisible();
      await expect(
        page.getByRole('link', { name: /portfolio/i }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: /appointments/i }),
      ).toBeVisible();

      await signOut(page);
    });
  });

  test.describe('Authentication Validation', () => {
    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Try invalid credentials
      await page.getByLabel(/email/i).fill('invalid@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Verify error message
      await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    });

    test('should validate password requirements during signup', async ({
      page,
    }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /sign up/i }).click();

      // Fill form with weak password
      await page.getByLabel(/first name/i).fill('Test');
      await page.getByLabel(/last name/i).fill('User');
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('weak');
      await page.getByRole('radio', { name: /client/i }).click();

      await page.getByRole('button', { name: /create account/i }).click();

      // Verify password validation message
      await expect(page.getByText(/password must be at least/i)).toBeVisible();
    });

    test('should require email verification', async ({ page }) => {
      await signUp(page, {
        ...TEST_USERS.client,
        email: `unverified-${Date.now()}@example.com`,
      });

      // Verify email verification message
      await expect(page.getByText(/verify your email/i)).toBeVisible();
    });
  });
});
