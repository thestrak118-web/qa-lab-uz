import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

// Set CHROMIUM_PATH, use Kali's Chromium, or install Playwright's bundled browser:
// npx playwright install chromium
const browserName = process.env.QA_BROWSER || "chromium";
if (!["chromium", "firefox", "webkit"].includes(browserName))
  throw new Error("QA_BROWSER must be chromium, firefox or webkit.");
const executablePath =
  browserName === "chromium"
    ? process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined)
    : undefined;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [["list"]],
  use: {
    browserName,
    baseURL: "http://127.0.0.1:5180",
    viewport: { width: 1365, height: 950 },
    acceptDownloads: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath,
      args: browserName === "chromium" ? ["--no-sandbox"] : [],
    },
  },
  webServer: {
    command: "npm run dev -- --port 5180",
    url: "http://127.0.0.1:5180",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
