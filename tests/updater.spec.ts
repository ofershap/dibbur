import { test, expect } from "@playwright/test";

for (const lang of ["he", "en", "ar"]) {
  for (const mode of [
    "ready",
    "busy",
    "downloading",
    "disabled",
    "locked",
    "error",
    "current",
    "portable",
  ]) {
    test(`updater ${lang} ${mode}`, async ({ page }) => {
      await page.setViewportSize({ width: 720, height: 560 });
      await page.goto(`/harness.html?view=updater&lang=${lang}&ustate=${mode}`);
      const calls = () =>
        page.evaluate(
          () => (window as unknown as { qaCalls: string[] }).qaCalls,
        );
      if (["disabled", "locked"].includes(mode)) {
        await page.waitForTimeout(200);
        expect(await calls()).not.toContain("plugin:updater|check");
      } else {
        await expect.poll(calls).toContain("plugin:updater|check");
        if (mode === "ready" || mode === "busy") {
          await expect.poll(calls).toContain("plugin:updater|download");
          expect(await calls()).not.toContain("plugin:updater|install");
          await page.getByRole("button").last().click();
          if (mode === "ready") {
            await expect.poll(calls).toContain("plugin:updater|install");
            await expect.poll(calls).toContain("end_app_update");
          } else {
            await expect.poll(calls).toContain("begin_app_update");
            expect(await calls()).not.toContain("plugin:updater|install");
          }
        } else expect(await calls()).not.toContain("plugin:updater|install");
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
    });
  }
}
