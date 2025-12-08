import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    env: {
      API_URL:
        process.env.CYPRESS_API_URL ||
        process.env.API_URL ||
        'http://localhost:8000'
    }
  }
});
