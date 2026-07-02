const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    channel: 'chrome',
    viewport: { width: 1440, height: 950 },
  },
  webServer: {
    command: 'python3 -m http.server 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
