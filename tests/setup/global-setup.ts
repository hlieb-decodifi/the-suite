import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Add any global setup here, such as:
  // - Setting up test data in the database
  // - Setting up mock services
  // - Configuring test environment variables
}

export default globalSetup;
