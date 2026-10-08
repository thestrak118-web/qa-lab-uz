import { test, expect } from "@playwright/test";
import { productPhoto } from "../src/lib/productImages.js";
import { createScenario } from "../src/lib/scenario.js";

test("all 39 catalog photos load as distinct product identities across pagination and details", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const seed = "catalog-photo-identity";
  const scenario = createScenario(seed);
  await page.goto("/");
  await page.getByRole("button", { name: "Yangi mashq", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Yangi QA mashqi" });
  await dialog
    .getByLabel("Mashq nomi", { exact: true })
    .fill("Photo identity audit");
  await dialog.getByLabel(/Seed/).fill(seed);
  await dialog.getByRole("button", { name: "Mashqni yaratish" }).click();
  await expect(dialog).toBeHidden();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Demo do‘kon", exact: true })
    .click();
  const sources = new Set();
  for (let current = 1; current <= 4; current++) {
    const cards = page.locator(".shop-product");
    await expect(cards).toHaveCount(current === 4 ? 3 : 12);
    for (const card of await cards.all()) {
      const id = (await card.getAttribute("data-testid")).replace(
        "product-",
        "",
      );
      const product = scenario.products.find((entry) => entry.id === id);
      const image = card.locator("img");
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveAttribute("src", productPhoto(product).src);
      await expect
        .poll(() =>
          image.evaluate((node) => node.complete && node.naturalWidth > 0),
        )
        .toBe(true);
      sources.add(await image.getAttribute("src"));
    }
    if (current < 4)
      await page
        .getByRole("button", { name: "Keyingi sahifa", exact: true })
        .click();
  }
  expect(sources.size).toBe(39);
  const lastProduct = scenario.products.at(-1);
  await page
    .getByRole("button", {
      name: `${lastProduct.name} tafsilotlari`,
      exact: true,
    })
    .click();
  const details = page.getByRole("dialog", { name: lastProduct.name });
  await expect(details.locator("img")).toHaveAttribute(
    "src",
    productPhoto(lastProduct).src,
  );
  await expect
    .poll(() =>
      details
        .locator("img")
        .evaluate((node) => node.complete && node.naturalWidth > 0),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});
