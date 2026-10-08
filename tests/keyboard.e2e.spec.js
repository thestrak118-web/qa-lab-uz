import { test, expect } from "@playwright/test";
const nav = (page, name) =>
  page.locator(".sidebar").getByRole("button", { name, exact: true }).click();

test("product modal traps keyboard focus and restores its opener on Escape", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page, "Demo do‘kon");
  const opener = page
    .locator(".shop-product")
    .first()
    .getByRole("button", { name: /tafsilotlari$/ });
  await opener.focus();
  await page.keyboard.press("Enter");
  const modal = page.getByRole("dialog");
  await expect(
    modal.getByRole("button", {
      name: "Mahsulot oynasini yopish",
      exact: true,
    }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    modal.getByRole("button", { name: "Savatga o‘tish", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    modal.getByRole("button", {
      name: "Mahsulot oynasini yopish",
      exact: true,
    }),
  ).toBeFocused();
  await expect(page.locator(".sidebar")).toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(page.locator(".sidebar")).not.toHaveAttribute("inert", "");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("new exercise and answer dialogs isolate the background and restore focus", async ({
  page,
}) => {
  await page.goto("/");
  const opener = page.getByRole("button", { name: "Yangi mashq", exact: true });
  await opener.click();
  const modal = page.getByRole("dialog", { name: "Yangi QA mashqi" });
  await expect(
    modal.getByRole("textbox", { name: "Mashq nomi", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".main-wrap")).toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await nav(page, "Natija va retest");
  const reveal = page.getByRole("button", {
    name: "Mashq javoblarini ochish",
    exact: true,
  });
  await reveal.click();
  await page.keyboard.press("Escape");
  await expect(reveal).toBeFocused();
  await expect(page.locator(".main-wrap")).not.toHaveAttribute("inert", "");
});

test("closed mobile menu is not focusable; Escape, shade and navigation close it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menyu", exact: true });
  const sidebar = page.locator(".sidebar");
  await expect(sidebar).toHaveAttribute("inert", "");
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(
    sidebar.getByRole("button", { name: "Menyuni yopish" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(sidebar).toHaveAttribute("inert", "");
  await menu.click();
  await page.locator(".mobile-shade").click({ position: { x: 370, y: 400 } });
  await expect(sidebar).toHaveAttribute("inert", "");
  await menu.click();
  await nav(page, "Talablar");
  await expect(sidebar).toHaveAttribute("inert", "");
  await expect(
    page.getByRole("heading", { name: "Talablar", exact: true, level: 1 }),
  ).toBeFocused();
  await page.setViewportSize({ width: 1365, height: 950 });
  await expect(sidebar).not.toHaveAttribute("inert", "");
  await nav(page, "Demo do‘kon");
  await expect(
    page.getByRole("heading", { name: "Demo do‘kon", exact: true, level: 1 }),
  ).toBeFocused();
});
