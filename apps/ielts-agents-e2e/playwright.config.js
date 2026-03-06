export default {
  use: {
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  testDir: "lib",
  webServer: {
    command:
      "nx run-many --targets=start --projects=ielts-agents-api,ielts-agents-app",
    url: "http://localhost:42310/v1/health?components=database,app",
    timeout: 120_000,
  },
};
