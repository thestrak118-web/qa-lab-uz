import { test, expect } from "@playwright/test";
import { createScenario, money } from "../src/lib/scenario.js";

async function navigate(page, name) {
  const button = page
    .locator(".sidebar")
    .getByRole("button", { name, exact: true });
  const menu = page.getByRole("button", { name: "Menyu", exact: true });
  if (
    (await menu.isVisible()) &&
    !(await page.locator(".sidebar").getAttribute("class")).includes("open")
  )
    await menu.click();
  await button.click();
}
async function newExercise(page, seed) {
  await page.goto("/");
  await page.getByRole("button", { name: "Yangi mashq", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Yangi QA mashqi" });
  await dialog.getByRole("textbox", { name: "Mashq nomi" }).fill("Shop E2E");
  await dialog.getByRole("textbox", { name: /Seed/ }).fill(seed);
  await dialog.getByRole("button", { name: "Mashqni yaratish" }).click();
  await expect(dialog).not.toBeVisible();
}
async function fixThroughReview(page) {
  await navigate(page, "Natija va retest");
  await page
    .getByRole("button", { name: "Mashq javoblarini ochish", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Mashq javoblarini ochish" })
    .getByRole("button", { name: "Javoblarni ochish", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tuzatilgan build’ni ochish", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Build 1.1 — tuzatishlar yoqilgan" }),
  ).toBeVisible();
  await navigate(page, "Demo do‘kon");
}

test("fixed shop supports catalog, cart, coupons, checkout, cancellation and login end to end", async ({
  page,
}) => {
  const seed = "shop-complete-flow";
  const scenario = createScenario(seed);
  const keyboard = scenario.products.find((p) => p.id === "p4");
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await newExercise(page, seed);
  await fixThroughReview(page);
  const shop = page.locator(".shop-shell");
  await expect(shop.locator(".shop-product")).toHaveCount(12);
  await shop.getByRole("textbox", { name: "Mahsulot qidirish" }).fill("AIR");
  await expect(shop.locator(".shop-product")).toHaveCount(2);
  await shop.getByRole("button", { name: "Qidiruvni tozalash" }).click();
  await shop.getByRole("button", { name: "Audio", exact: true }).click();
  await expect(shop.locator(".shop-product")).toHaveCount(
    Math.min(
      12,
      scenario.products.filter((product) => product.category === "Audio")
        .length,
    ),
  );
  for (const category of await shop
    .locator(".shop-product-meta > span:first-child")
    .allTextContents())
    expect(category).toBe("Audio");
  await shop.getByRole("button", { name: "Barchasi", exact: true }).click();
  await shop
    .getByRole("combobox", { name: "Mahsulotlarni saralash" })
    .selectOption("price-asc");
  const expectedOrder = [...scenario.products]
    .sort((a, b) => a.price - b.price)
    .map((p) => `product-${p.id}`);
  expect(
    await shop
      .locator(".shop-product")
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.testid)),
  ).toEqual(expectedOrder.slice(0, 12));
  await shop.getByRole("textbox", { name: "Mahsulot qidirish" }).fill("Flow");
  await shop
    .getByRole("button", {
      name: "Flow mexanik klaviatura tafsilotlari",
      exact: true,
    })
    .click();
  const modal = page.getByRole("dialog", { name: keyboard.name });
  await expect(modal).toBeVisible();
  await expect(modal.getByText("2 dona", { exact: true })).toBeVisible();
  await modal
    .getByRole("button", { name: "Savatga qo‘shish", exact: true })
    .click();
  await modal
    .getByRole("button", { name: "Savatga o‘tish", exact: true })
    .click();
  await expect(modal).not.toBeVisible();
  await shop
    .getByRole("button", {
      name: `${keyboard.name} miqdorini oshirish`,
      exact: true,
    })
    .click();
  await expect(
    shop.getByLabel(`${keyboard.name} miqdori`, { exact: true }),
  ).toHaveText("2");
  await shop
    .getByRole("button", {
      name: `${keyboard.name} miqdorini oshirish`,
      exact: true,
    })
    .click();
  await expect(
    shop.getByLabel(`${keyboard.name} miqdori`, { exact: true }),
  ).toHaveText("2");
  await expect(shop.locator(".shop-notice")).toContainText(
    "Omborda faqat 2 dona bor.",
  );
  await expect(shop.getByTestId("cart-subtotal")).toHaveText(
    money(keyboard.price * 2),
  );
  await expect(shop.getByTestId("delivery-fee")).toHaveText("Bepul");
  await shop.getByLabel("Kuponingiz bormi?").fill("OLD20");
  await shop.getByRole("button", { name: "Qo‘llash", exact: true }).click();
  await expect(shop.locator(".shop-coupon")).toContainText(
    "amal qilish muddati tugagan",
  );
  await shop.getByLabel("Kuponingiz bormi?").fill("qa10");
  await shop.getByRole("button", { name: "Qo‘llash", exact: true }).click();
  await expect(shop.getByTestId("cart-total")).toHaveText(
    money(keyboard.price * 2 * 0.9),
  );
  await shop
    .getByRole("button", { name: "Rasmiylashtirish", exact: true })
    .click();
  await shop
    .getByRole("button", { name: "Buyurtma berish", exact: true })
    .click();
  await expect(shop.getByRole("alert")).toHaveCount(3);
  await shop
    .getByLabel("Ism va familiya", { exact: true })
    .fill("Aziza Karimova");
  await shop
    .getByLabel("Telefon raqami", { exact: true })
    .fill("+998 90 123 45 67");
  await shop
    .getByLabel("To‘liq manzil", { exact: true })
    .fill("Toshkent, Olmazor ko‘chasi 15");
  await shop.getByRole("radio", { name: /Demo karta/ }).check();
  await shop
    .getByLabel("Demo karta raqami", { exact: true })
    .fill("4242 4242 4242 4242");
  await shop
    .getByRole("button", { name: "Buyurtma berish", exact: true })
    .click();
  await expect(
    shop.getByRole("heading", { name: "Buyurtmalarim", exact: true }),
  ).toBeVisible();
  await expect(shop.locator(".shop-order-status")).toHaveText("Yangi");
  await expect(shop.locator(".shop-order footer strong")).toHaveText(
    money(keyboard.price * 2 * 0.9),
  );
  await shop.getByRole("button", { name: "Bekor qilish", exact: true }).click();
  await expect(shop.locator(".shop-order-status")).toHaveText("Bekor qilingan");
  await expect(
    shop.getByRole("button", { name: "Bekor qilish", exact: true }),
  ).toHaveCount(0);
  await shop.getByRole("button", { name: "Hisob", exact: true }).click();
  await shop.getByLabel("Email", { exact: true }).fill("qa@lab.uz");
  await shop.getByLabel("Parol", { exact: true }).fill("Wrong123!");
  await shop.getByRole("button", { name: "Kirish", exact: true }).click();
  await expect(shop.getByRole("alert")).toHaveText(
    "Email yoki parol noto‘g‘ri.",
  );
  await shop.getByLabel("Parol", { exact: true }).fill("Test123!");
  await shop.getByRole("button", { name: "Kirish", exact: true }).click();
  await expect(
    shop.getByRole("heading", { name: "Xush kelibsiz, Aziza!" }),
  ).toBeVisible();
  await expect(page.locator(".storage-label")).toHaveText(
    "Ishlaringiz saqlangan",
  );
  await page.reload();
  await navigate(page, "Demo do‘kon");
  await expect(
    shop.getByRole("heading", { name: "Xush kelibsiz, Aziza!" }),
  ).toBeVisible();
  await shop
    .getByRole("button", { name: "Buyurtmalarim", exact: true })
    .click();
  await expect(shop.locator(".shop-order-status")).toHaveText("Bekor qilingan");
  expect(errors).toEqual([]);
});

test("a seeded search defect reproduces, then review build fixes the same steps", async ({
  page,
}) => {
  let seed;
  for (let i = 0; i < 100; i++) {
    const candidate = `shop-bug-${i}`;
    if (createScenario(candidate).bugs.some((b) => b.id === "BUG-01")) {
      seed = candidate;
      break;
    }
  }
  expect(seed).toBeTruthy();
  await newExercise(page, seed);
  await navigate(page, "Demo do‘kon");
  const shop = page.locator(".shop-shell");
  await shop.getByRole("textbox", { name: "Mahsulot qidirish" }).fill("Air");
  await expect(shop.locator(".shop-product")).toHaveCount(2);
  await shop.getByRole("textbox", { name: "Mahsulot qidirish" }).fill("AIR");
  await expect(
    shop.getByRole("heading", { name: "Mahsulot topilmadi" }),
  ).toBeVisible();
  await expect(shop.locator(".shop-product")).toHaveCount(0);
  await fixThroughReview(page);
  await expect(
    shop.getByRole("textbox", { name: "Mahsulot qidirish" }),
  ).toHaveValue("AIR");
  await expect(shop.locator(".shop-product")).toHaveCount(2);
});

test("catalog pages cover every product and filters reset the current page", async ({
  page,
}) => {
  const seed = "shop-paginated-catalog";
  const scenario = createScenario(seed);
  await newExercise(page, seed);
  await fixThroughReview(page);
  const shop = page.locator(".shop-shell");
  const pager = shop.getByRole("navigation", { name: "Katalog sahifalari" });
  const productIds = () =>
    shop
      .locator(".shop-product")
      .evaluateAll((nodes) => nodes.map((node) => node.dataset.testid));
  await expect(
    pager.getByRole("button", { name: "Oldingi sahifa", exact: true }),
  ).toBeDisabled();
  const allIds = [];
  const pages = Math.ceil(scenario.products.length / 12);
  expect(scenario.products).toHaveLength(39);
  expect(pages).toBe(4);
  for (let current = 1; current <= pages; current++) {
    await expect(shop.locator(".shop-product")).toHaveCount(
      current === 4 ? 3 : 12,
    );
    await expect(shop.locator(".shop-result-count")).toHaveText(
      `${scenario.products.length} ta mahsulot · ${(current - 1) * 12 + 1}–${Math.min(current * 12, scenario.products.length)} ko‘rsatilmoqda`,
    );
    await expect(
      pager.getByRole("button", {
        name: `Katalog sahifasi ${current}`,
        exact: true,
      }),
    ).toHaveAttribute("aria-current", "page");
    allIds.push(...(await productIds()));
    if (current < pages)
      await pager
        .getByRole("button", { name: "Keyingi sahifa", exact: true })
        .click();
  }
  expect(allIds).toEqual(
    scenario.products.map((product) => `product-${product.id}`),
  );
  expect(new Set(allIds).size).toBe(scenario.products.length);
  await expect(
    pager.getByRole("button", { name: "Keyingi sahifa", exact: true }),
  ).toBeDisabled();
  await shop.getByRole("textbox", { name: "Mahsulot qidirish" }).fill("Air");
  await expect(shop.locator(".shop-product")).toHaveCount(2);
  await expect(pager).toHaveCount(0);
  await shop
    .getByRole("button", { name: "Qidiruvni tozalash", exact: true })
    .click();
  await expect(
    pager.getByRole("button", { name: "Katalog sahifasi 1", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await pager
    .getByRole("button", { name: "Katalog sahifasi 4", exact: true })
    .click();
  await shop
    .getByRole("combobox", { name: "Mahsulotlarni saralash" })
    .selectOption("price-asc");
  await expect(
    pager.getByRole("button", { name: "Katalog sahifasi 1", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  expect(await productIds()).toEqual(
    [...scenario.products]
      .sort((a, b) => a.price - b.price)
      .slice(0, 12)
      .map((product) => `product-${product.id}`),
  );
  await pager
    .getByRole("button", { name: "Katalog sahifasi 4", exact: true })
    .click();
  await shop.getByRole("button", { name: "Audio", exact: true }).click();
  expect(await productIds()).toEqual(
    scenario.products
      .filter((product) => product.category === "Audio")
      .sort((a, b) => a.price - b.price)
      .slice(0, 12)
      .map((product) => `product-${product.id}`),
  );
  await shop
    .getByRole("textbox", { name: "Mahsulot qidirish" })
    .fill("no-such-product");
  await expect(
    shop.getByRole("heading", { name: "Mahsulot topilmadi" }),
  ).toBeVisible();
  await expect(shop.locator(".shop-result-count")).toHaveText("0 ta mahsulot");
  await shop
    .getByRole("button", { name: "Filtrlarni tozalash", exact: true })
    .click();
  await expect(
    shop.getByRole("combobox", { name: "Mahsulotlarni saralash" }),
  ).toHaveValue("popular");
  await expect(
    shop.getByRole("button", { name: "Barchasi", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(shop.locator(".shop-active-filters")).toHaveCount(0);
  expect(await productIds()).toEqual(
    scenario.products.slice(0, 12).map((product) => `product-${product.id}`),
  );
  await shop.getByRole("button", { name: "Audio", exact: true }).click();
  await shop.getByRole("textbox", { name: "Mahsulot qidirish" }).fill("Air");
  await shop
    .getByRole("button", {
      name: "Kategoriya filtrini olib tashlash: Audio",
      exact: true,
    })
    .click();
  await expect(
    shop.getByRole("textbox", { name: "Mahsulot qidirish" }),
  ).toHaveValue("Air");
  await expect(shop.locator(".shop-product")).toHaveCount(2);
  await shop
    .getByRole("button", { name: "Hammasini tozalash", exact: true })
    .click();
  await expect(shop.locator(".shop-product")).toHaveCount(12);
});

test("an existing nine-product exercise opens without a pager or data replacement", async ({
  page,
}) => {
  await newExercise(page, "shop-legacy-catalog");
  await expect(page.locator(".storage-label")).toHaveText(
    "Ishlaringiz saqlangan",
  );
  const oldIds = await page.evaluate(async () => {
    const { loadWorkspace, saveWorkspace } =
      await import("/src/lib/storage.js");
    const workspace = await loadWorkspace();
    const session = workspace.sessions.find(
      (item) => item.id === workspace.activeId,
    );
    session.scenario.products = session.scenario.products.filter(
      (product) => Number(product.id.slice(1)) <= 9,
    );
    await saveWorkspace(workspace);
    return session.scenario.products.map((product) => `product-${product.id}`);
  });
  await page.reload();
  await navigate(page, "Demo do‘kon");
  const shop = page.locator(".shop-shell");
  await expect(shop.locator(".shop-product")).toHaveCount(9);
  await expect(
    shop.getByRole("navigation", { name: "Katalog sahifalari" }),
  ).toHaveCount(0);
  await expect(shop.locator(".shop-result-count")).toHaveText(
    "9 ta mahsulot · 1–9 ko‘rsatilmoqda",
  );
  expect(
    await shop
      .locator(".shop-product")
      .evaluateAll((nodes) => nodes.map((node) => node.dataset.testid)),
  ).toEqual(oldIds);
});

test("shop remains usable without horizontal overflow at 390px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let seed;
  for (let i = 0; i < 100; i++) {
    const candidate = `shop-mobile-${i}`;
    if (createScenario(candidate).variant === 1) {
      seed = candidate;
      break;
    }
  }
  await newExercise(page, seed);
  await navigate(page, "Demo do‘kon");
  const shop = page.locator(".shop-shell");
  await expect(shop.locator(".shop-product")).toHaveCount(12);
  await expect(
    shop.getByRole("navigation", { name: "Katalog sahifalari" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  expect(
    await shop.evaluate((node) => node.scrollWidth - node.clientWidth),
  ).toBeLessThanOrEqual(1);
  await shop.getByRole("textbox", { name: "Mahsulot qidirish" }).fill("Flow");
  await shop
    .getByRole("button", {
      name: "Flow mexanik klaviatura tafsilotlari",
      exact: true,
    })
    .click();
  const modal = page.getByRole("dialog", { name: "Flow mexanik klaviatura" });
  await expect(modal).toBeVisible();
  expect(
    await modal.evaluate((node) => node.scrollWidth - node.clientWidth),
  ).toBeLessThanOrEqual(1);
  await modal
    .getByRole("button", { name: "Savatga qo‘shish", exact: true })
    .click();
  await modal
    .getByRole("button", { name: "Savatga o‘tish", exact: true })
    .click();
  await expect(
    shop.getByRole("heading", { name: "Sizning savatingiz" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await shop
    .getByRole("button", { name: "Rasmiylashtirish", exact: true })
    .click();
  await expect(
    shop.getByLabel("Telefon raqami", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
});
