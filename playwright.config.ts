import { defineConfig, devices } from "@playwright/test";

const remote = process.env.FEIFEI_BASE_URL;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: remote ?? "http://localhost:3000",
    launchOptions: executablePath ? { executablePath } : undefined,
    trace: "retain-on-failure",
  },
  webServer: remote ? undefined : {
    command: "npm run start -- --hostname localhost",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
