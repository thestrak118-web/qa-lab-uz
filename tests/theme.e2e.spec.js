import { test, expect } from "@playwright/test";

const theme = (page) => page.getByRole("combobox", { name: "Rang rejimi" });

test("explicit theme survives reload and keeps working across lab pages", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(theme(page)).toHaveValue("system");
  await theme(page).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(theme(page)).toHaveValue("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: /Checklist/ })
    .click();
  await expect(page.locator(".workspace")).toBeVisible();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: /Demo do‘kon/ })
    .click();
  await expect(page.locator(".shop-shell")).toBeVisible();
  const photo = page.locator(".shop-art img").first();
  await expect(photo).toBeVisible();
  expect(await photo.evaluate((node) => getComputedStyle(node).filter)).toBe(
    "none",
  );
  await theme(page).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(theme(page)).toHaveValue("light");
});

test("system preference follows live OS changes while an explicit choice wins", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(theme(page)).toHaveValue("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await theme(page).selectOption("dark");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await theme(page).selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("theme changes are available on mobile without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await theme(page).selectOption("dark");
  await expect(theme(page)).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  const control = await theme(page).boundingBox();
  expect(control.x + control.width).toBeLessThanOrEqual(390);
});

test("blocked preference storage does not break theme switching", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const originalGet = Storage.prototype.getItem;
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === "qa-lab-theme")
        throw new DOMException("Blocked", "SecurityError");
      return originalGet.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "qa-lab-theme")
        throw new DOMException("Blocked", "SecurityError");
      return originalSet.call(this, key, value);
    };
  });
  await page.goto("/");
  await theme(page).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await theme(page).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
