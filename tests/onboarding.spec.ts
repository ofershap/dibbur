import { test, expect } from "@playwright/test";

test.describe("Dibbur first run", () => {
  test("Hebrew starts once without a model choice", async ({ page }) => {
    await page.goto("/harness.html?state=fresh");
    await expect(page.getByRole("heading")).toContainText("Dibbur");
    await expect(page.getByText("Whisper Medium")).toHaveCount(0);
    const calls = await page.evaluate(() => (window as any).qaCalls);
    expect(calls).toEqual(["download:ivrit-turbo"]);
    await page.evaluate(() => (window as any).qaFinish());
    await expect
      .poll(() => page.evaluate(() => (window as any).qaCalls))
      .toEqual(["download:ivrit-turbo", "select:ivrit-turbo", "ready"]);
  });
  test("installed Hebrew skips download", async ({ page }) => {
    await page.goto("/harness.html?state=installed");
    await expect
      .poll(() => page.evaluate(() => (window as any).qaCalls))
      .toEqual(["select:ivrit-turbo", "ready"]);
  });
  test("interrupted download is not started twice", async ({ page }) => {
    await page.goto("/harness.html?state=downloading");
    await expect(page.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "45",
    );
    expect(await page.evaluate(() => (window as any).qaCalls)).toEqual([]);
  });
  test("failed download has a working retry", async ({ page }) => {
    await page.goto("/harness.html?state=failed");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect
      .poll(() => page.evaluate(() => (window as any).qaCalls))
      .toEqual(["download:ivrit-turbo", "download:ivrit-turbo"]);
  });
  test("failed model activation has a retry", async ({ page }) => {
    await page.goto("/harness.html?state=select-failed");
    await expect(page.getByText("Failed to select model")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });
  test("Arabic is one tap, failure allows retry and does not block Hebrew", async ({
    page,
  }) => {
    await page.goto("/harness.html?state=arabic-failed");
    await page
      .getByRole("button", { name: "Also add Arabic (574 MB)", exact: true })
      .click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page
      .getByRole("button", { name: "Also add Arabic (574 MB)", exact: true })
      .click();
    await page.evaluate(() => (window as any).qaFinish());
    await expect
      .poll(() => page.evaluate(() => (window as any).qaCalls))
      .toEqual([
        "download:ivrit-turbo",
        "download:lahjat-turbo",
        "download:lahjat-turbo",
        "select:ivrit-turbo",
        "ready",
      ]);
  });
  for (const lang of ["en", "he", "ar"]) {
    test(`${lang} compact first-run layout`, async ({ page }) => {
      await page.setViewportSize({ width: 640, height: 480 });
      await page.goto(`/harness.html?state=downloading&lang=${lang}`);
      await expect(page.getByRole("button")).toBeInViewport();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(640);
      await page.screenshot({ path: `/tmp/qa/final-onboarding-${lang}.png` });
    });
  }
});
