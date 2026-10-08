import { test, expect } from "@playwright/test";

// Check the actual rendered colors, not individual CSS tokens. These samples
// cover white cards, raised surfaces, both themes and the smaller helper copy.
async function expectReadable(locator) {
  await expect(locator).toBeVisible();
  const contrast = await locator.evaluate((element) => {
    const rgb = (value) => value.match(/[\d.]+/g).map(Number);
    const luminance = (channels) =>
      channels.slice(0, 3).reduce((sum, byte, index) => {
        const value = byte / 255;
        const linear =
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        return sum + linear * [0.2126, 0.7152, 0.0722][index];
      }, 0);
    const foreground = getComputedStyle(element).color;
    let background = "rgb(255, 255, 255)";
    for (let node = element; node; node = node.parentElement) {
      const candidate = getComputedStyle(node).backgroundColor;
      const channels = rgb(candidate);
      if (channels.length === 3 || channels[3] === 1) {
        background = candidate;
        break;
      }
    }
    const values = [
      luminance(rgb(foreground)),
      luminance(rgb(background)),
    ].sort((a, b) => b - a);
    return {
      ratio: (values[0] + 0.05) / (values[1] + 0.05),
      foreground,
      background,
    };
  });
  expect(contrast.ratio, JSON.stringify(contrast)).toBeGreaterThanOrEqual(4.5);
}

for (const theme of ["light", "dark"]) {
  test(`${theme} theme keeps small workspace and checkout text readable`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Loyiha ko‘rinishi", exact: true }),
    ).toBeVisible();
    await page.addStyleTag({
      content:
        "*,*::before,*::after{transition:none!important;animation:none!important}",
    });
    await page
      .getByRole("combobox", { name: "Rang rejimi" })
      .selectOption(theme);
    for (const selector of [
      ".nav-caption",
      ".page-heading p",
      ".metrics-strip small",
      ".app-footer",
    ]) {
      await expectReadable(page.locator(selector).first());
    }
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Demo do‘kon", exact: true })
      .click();
    await expectReadable(page.locator(".shop-product-meta small").first());
    await page.locator(".shop-product-visual").first().click();
    await expectReadable(page.locator(".shop-rating"));
    await expectReadable(page.locator(".shop-detail-facts"));
    await page.keyboard.press("Escape");
    await page
      .getByRole("textbox", { name: "Mahsulot qidirish" })
      .fill("QA-P8-");
    await expectReadable(page.locator(".shop-badge-unavailable"));
    await page
      .getByRole("textbox", { name: "Mahsulot qidirish" })
      .fill("QA-P1-");
    await page
      .getByTestId("product-p1")
      .getByRole("button", { name: /savatga qo‘shish/ })
      .click();
    await page.locator(".shop-cart-button").click();
    await expectReadable(page.locator(".shop-summary > div > span").first());
    await page.getByRole("button", { name: /Rasmiylashtirish/ }).click();
    await expectReadable(page.locator(".shop-form h3 > span").first());
    await page.getByRole("button", { name: "Hisob", exact: true }).click();
    await expectReadable(page.locator(".shop-demo-account > strong"));
  });
}
