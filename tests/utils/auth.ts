import { Page } from '@playwright/test';

export type TestUser = {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'professional';
};

type TestUsers = {
  professional: TestUser;
  client: TestUser;

} & Record<string, TestUser>;

// Test users with specific IDs
export const TEST_USERS: TestUsers = {
  client: {
    id: '11111111-1111-1111-1111-111111111111',
    email: `test-client-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Client',
    role: 'client'
  },
  professional: {
    id: '22222222-2222-2222-2222-222222222222',
    email: `test-professional-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Professional',
    role: 'professional'
  }
};

export async function signUp(page: Page, user: TestUser) {
  await page.goto('/');
  
  // Open sign up modal
  await page.getByRole('button', { name: /sign up/i }).click();
  
  // Fill the form
  await page.getByLabel(/first name/i).fill(user.firstName);
  await page.getByLabel(/last name/i).fill(user.lastName);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  
  // Select role
  await page.getByRole('radio', { name: new RegExp(user.role, 'i') }).click();
  
  // Submit form
  await page.getByRole('button', { name: /create account/i }).click();
  
  // Wait for success toast or navigation
  await Promise.race([
    page.waitForURL(/\/dashboard/),
    page.getByText(/account created/i).waitFor({ state: 'visible' })
  ]);
}

export async function signIn(page: Page, user: TestUser) {
  await page.goto('/');
  
  // Open sign in modal
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Fill the form
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  
  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for success toast or navigation
  await Promise.race([
    page.waitForURL(/\/dashboard/),
    page.getByText(/signed in successfully/i).waitFor({ state: 'visible' })
  ]);
}

export async function signOut(page: Page) {
  // Click user menu (retry if needed as it might be loading)
  await page.getByRole('button', { name: /open user menu/i }).click({
    timeout: 10000,
    trial: true
  }).catch(async () => {
    // If failed, wait a bit and retry
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /open user menu/i }).click();
  });
  
  // Click sign out
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  
  // Wait for navigation to home and/or success toast
  await Promise.race([
    page.waitForURL('/'),
    page.getByText(/signed out/i).waitFor({ state: 'visible' })
  ]);
} 