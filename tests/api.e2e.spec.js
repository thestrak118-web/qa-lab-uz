import { test, expect } from "@playwright/test";

test("API requests share the shop session and reject malformed checkout state", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("heading", { name: "Loyiha ko‘rinishi" })
    .waitFor();
  await page
    .getByRole("button", { name: "API laboratoriya", exact: true })
    .click();
  await page.getByRole("button", { name: "Yuborish", exact: true }).click();
  await expect(page.locator(".response-head .badge")).toHaveText("200");
  expect(
    JSON.parse(await page.locator(".response-code").textContent()).total,
  ).toBe(9);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.getByRole("button", { name: "Yuborish", exact: true }).click();
  await expect(page.locator(".response-code")).toContainText("qa@lab.uz");
  await page.getByLabel("Endpoint", { exact: true }).fill("/orders");
  await page
    .getByLabel("Request body (JSON)", { exact: true })
    .fill('{"name": {"invalid": true}}');
  await page.getByRole("button", { name: "Yuborish", exact: true }).click();
  await expect(page.locator(".response-head .badge")).toHaveText("400");
  await page.getByLabel("Request body (JSON)", { exact: true }).fill("{broken");
  await page.getByRole("button", { name: "Yuborish", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("JSON noto‘g‘ri");
  await page.getByRole("button", { name: "Demo do‘kon", exact: true }).click();
  await expect(page.locator(".shop-header")).toBeVisible();
  await expect(page.locator(".shop-header")).toContainText("Aziza");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Loyiha ko‘rinishi" }),
  ).toBeVisible();
  await expect(page.locator(".error-banner")).toHaveCount(0);
  await page
    .getByRole("button", { name: "API laboratoriya", exact: true })
    .click();
  await page.getByLabel("Request body (JSON)", { exact: true }).fill("");
  await page.getByRole("button", { name: "Yuborish", exact: true }).click();
  await expect(page.locator(".response-head .badge")).toHaveText("200");
});

test("review unlock, fixed build and final report persist and export", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("heading", { name: "Loyiha ko‘rinishi" })
    .waitFor();
  await page
    .getByRole("button", { name: "Natija va retest", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mashq javoblarini ochish", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Javoblarni ochish", exact: true })
    .click();
  await expect(page.locator(".review-bugs>.panel")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Tuzatilgan build’ni ochish", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Build 1.1 — tuzatishlar yoqilgan" }),
  ).toBeVisible();
  await page
    .getByLabel("Tester xulosasi", { exact: true })
    .fill(
      "Qamrov: API. Qolgan risk: mobil tekshirilmadi. Qaror: hozircha to‘xtatish.",
    );
  await expect(
    page.getByText("Ishlaringiz saqlangan", { exact: true }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Hisobotni yuklash", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^qa-summary-.*\.md$/);
  await page.reload();
  await page
    .getByRole("button", { name: "Natija va retest", exact: true })
    .click();
  await expect(page.getByLabel("Tester xulosasi", { exact: true })).toHaveValue(
    /Qamrov: API./,
  );
  await expect(page.locator(".review-bugs>.panel")).toHaveCount(6);
  await expect(
    page.getByRole("heading", { name: "Build 1.1 — tuzatishlar yoqilgan" }),
  ).toBeVisible();
});
