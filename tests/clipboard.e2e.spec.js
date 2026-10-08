import { test, expect } from "@playwright/test";

test("API copy recovers after permission failure and preserves separate request errors", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Real clipboard read/write permission verification uses Chromium.",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "API laboratoriya", exact: true })
    .click();
  await page.getByRole("button", { name: "Yuborish", exact: true }).click();
  const response = await page.locator(".response-code").innerText();
  await page.evaluate(() => {
    window.auditClipboardWrite = navigator.clipboard.writeText.bind(
      navigator.clipboard,
    );
    navigator.clipboard.writeText = async () => {
      throw new DOMException("Permission denied for test", "NotAllowedError");
    };
  });
  const copy = page.getByRole("button", {
    name: "Javobni nusxalash",
    exact: true,
  });
  await copy.click();
  await expect(page.getByRole("alert")).toContainText(
    "Nusxalashga ruxsat yo‘q",
  );
  await page.evaluate(() => {
    navigator.clipboard.writeText = window.auditClipboardWrite;
  });
  await copy.click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(response);
  await expect(page.getByRole("alert")).toHaveCount(0);

  await page.getByLabel("Request body (JSON)", { exact: true }).fill("{broken");
  await page.getByRole("button", { name: "Yuborish", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("JSON noto‘g‘ri");
  await copy.click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(response);
  await expect(page.getByRole("alert")).toContainText("JSON noto‘g‘ri");
  await expect(page.locator(".api-response-request")).toContainText(
    "So‘rov o‘zgardi",
  );
});
