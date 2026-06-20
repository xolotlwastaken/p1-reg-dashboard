import { expect, test } from "@playwright/test";

test("dashboard loads and exposes CSV download links", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /a cleaner way to explore/i })
  ).toBeVisible();

  await page.getByLabel("School name").fill("Rosyth");
  await page.getByRole("tab", { name: /data explorer/i }).click();
  await expect(page.getByText("Rosyth School")).toBeVisible();

  await page.getByRole("tab", { name: /downloads/i }).click();
  await expect(page.getByRole("link", { name: /download all\.csv/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /download 2025\.csv/i })).toBeVisible();
});
