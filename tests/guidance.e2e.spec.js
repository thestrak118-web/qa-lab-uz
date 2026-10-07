import { test, expect } from "@playwright/test";

test("requirements open linked drafts; cancel creates nothing, save preserves the chosen requirement", async ({
  page,
}) => {
  await page.goto("/");
  const guidance = page.getByRole("region", {
    name: "Mashq bo‘yicha yo‘l-yo‘riq",
  });
  await expect(guidance).toContainText("Bitta talabdan boshlang");
  await guidance.getByRole("button", { name: "Talabni tanlash" }).click();
  await page
    .getByRole("button", { name: "REQ-08: test-case yozish", exact: true })
    .click();
  await expect(page.getByLabel("Bog‘liq talab", { exact: true })).toHaveValue(
    "REQ-08",
  );
  await expect(page.locator(".workspace-selected-requirement")).toContainText(
    "Telefon +998",
  );
  await page.getByRole("button", { name: "Bekor qilish", exact: true }).click();
  await expect(page.locator(".workspace-record")).toHaveCount(0);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Talablar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "REQ-01: checklist yozish", exact: true })
    .click();
  await expect(page.getByLabel("Bog‘liq talab", { exact: true })).toHaveValue(
    "REQ-01",
  );
  await page
    .getByLabel("Sarlavha *", { exact: true })
    .fill("SKU bo‘yicha mahsulot topiladi");
  await page
    .getByLabel("Kutilgan natija", { exact: true })
    .fill("Kiritilgan SKU’ga mos mahsulot ko‘rinadi.");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(page.locator(".workspace-record")).toHaveCount(1);
  await expect(page.locator(".workspace-record")).toContainText("REQ-01");
  await expect(page.locator(".storage-label")).toHaveText(
    "Ishlaringiz saqlangan",
  );
  await page.reload();
  await expect(guidance).toContainText("Tekshiruvga aniq qadamlar yozing");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: /^Checklist/ })
    .click();
  await expect(page.locator(".workspace-record")).toContainText(
    "SKU bo‘yicha mahsulot topiladi",
  );
  await expect(page.locator(".workspace-record")).toContainText("REQ-01");
  await expect(page.locator(".workspace-editor")).toHaveCount(0);
});

test("practice roadmap is keyboard-operable and readable on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const details = page.locator(".practice-roadmap");
  await details.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  await expect(details.getByRole("button")).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await details.getByRole("button", { name: /Tekshiruvni rejalang/ }).click();
  await expect(
    page.getByRole("heading", { name: "Checklist", exact: true }),
  ).toBeVisible();
});
