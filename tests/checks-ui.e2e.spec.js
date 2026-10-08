import { test as base, expect } from "@playwright/test";
import { createScenario, money } from "../src/lib/scenario.js";

// Only scenario metadata supplies names/prices/seeds. Every observed result below
// comes from real browser controls; no runChecks, API simulator, or IndexedDB edits.
const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await use(page);
    expect(errors).toEqual([]);
  },
});
const seeds = {
  1: "ui-matrix-0",
  2: "ui-matrix-49",
  3: "ui-matrix-49",
  4: "ui-matrix-0",
  5: "ui-matrix-0",
  6: "ui-matrix-49",
  7: "ui-matrix-0",
  8: "ui-matrix-49",
  9: "ui-matrix-0",
  10: "ui-matrix-49",
  11: "ui-matrix-0",
  12: "ui-matrix-0",
  13: "ui-matrix-0",
  14: "ui-matrix-49",
};
const sidebar = (page, name) =>
  page.locator(".sidebar").getByRole("button", { name, exact: true });
async function fresh(page, seed, fixed) {
  await page.goto("/");
  await page.getByRole("button", { name: "Yangi mashq", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Yangi QA mashqi" });
  await dialog
    .getByLabel("Mashq nomi", { exact: true })
    .fill(`UI nazorat ${fixed ? "1.1" : "1.0"}`);
  await dialog.getByLabel(/Seed/).fill(seed);
  await dialog.getByRole("radio", { name: /Murakkab/ }).check();
  await dialog.getByRole("button", { name: "Mashqni yaratish" }).click();
  await expect(dialog).toBeHidden();
  if (fixed) {
    await sidebar(page, "Natija va retest").click();
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
  }
  await sidebar(page, "Demo do‘kon").click();
  return page.locator(".shop-shell");
}
async function add(shop, id) {
  await shop
    .getByRole("textbox", { name: "Mahsulot qidirish" })
    .fill(`QA-${id.toUpperCase()}-`);
  const card = shop.getByTestId(`product-${id}`);
  await expect(card).toHaveCount(1);
  await card.getByRole("button", { name: /savatga qo‘shish/ }).click();
}
const cart = (shop) => shop.getByRole("button", { name: /^Savat,/ }).click();
async function catalogRows(shop) {
  const all = [];
  do {
    all.push(
      ...(await shop.locator(".shop-product").evaluateAll((nodes) =>
        nodes.map((node) => ({
          id: node.dataset.testid,
          category: node.querySelector(".shop-product-meta > span:first-child")
            .textContent,
        })),
      )),
    );
    const next = shop.getByRole("button", {
      name: "Keyingi sahifa",
      exact: true,
    });
    if (!(await next.count()) || (await next.isDisabled())) break;
    await next.click();
  } while (true);
  return all;
}
async function checkout(
  shop,
  { phone = "+998901234567", address = "Toshkent, Olmazor ko‘chasi15" } = {},
) {
  await shop
    .getByRole("button", { name: "Rasmiylashtirish", exact: true })
    .click();
  await shop
    .getByLabel("Ism va familiya", { exact: true })
    .fill("Aziza Karimova");
  await shop.getByLabel("Telefon raqami", { exact: true }).fill(phone);
  await shop.getByLabel("To‘liq manzil", { exact: true }).fill(address);
  await shop
    .getByRole("button", { name: "Buyurtma berish", exact: true })
    .click();
}
const checks = {
  1: async (shop, scenario, fixed) => {
    const query = shop.getByRole("textbox", { name: "Mahsulot qidirish" });
    await query.fill("Air");
    await expect(shop.locator(".shop-product")).toHaveCount(2);
    await query.fill("air");
    await expect(shop.locator(".shop-product")).toHaveCount(fixed ? 2 : 0);
    await query.fill("AIR");
    await expect(shop.locator(".shop-product")).toHaveCount(fixed ? 2 : 0);
  },
  2: async (shop, scenario, fixed) => {
    await shop.getByRole("button", { name: "Audio", exact: true }).click();
    const rows = await catalogRows(shop);
    expect(rows.filter((row) => row.category !== "Audio")).toHaveLength(
      fixed ? 0 : 1,
    );
    expect(rows.filter((row) => row.category === "Audio")).toHaveLength(
      scenario.products.filter((p) => p.category === "Audio").length,
    );
  },
  3: async (shop, scenario, fixed) => {
    await shop
      .getByRole("combobox", { name: "Mahsulotlarni saralash" })
      .selectOption("price-asc");
    const rows = await catalogRows(shop);
    const prices = rows.map(
      (row) =>
        scenario.products.find((p) => `product-${p.id}` === row.id).price,
    );
    expect(prices.length).toBe(39);
    expect(prices).toEqual([...prices].sort((a, b) => (fixed ? a - b : b - a)));
  },
  4: async (shop, scenario, fixed) => {
    await add(shop, "p8");
    if (fixed)
      await expect(shop.locator(".shop-notice")).toContainText(
        "hozir omborda mavjud emas",
      );
    await cart(shop);
    await expect(shop.locator(".shop-cart-line")).toHaveCount(fixed ? 0 : 1);
  },
  5: async (shop, scenario, fixed) => {
    const p = scenario.products.find((p) => p.id === "p4");
    await add(shop, "p4");
    await cart(shop);
    const increase = shop.getByRole("button", {
      name: `${p.name} miqdorini oshirish`,
      exact: true,
    });
    await increase.click();
    await increase.click();
    await expect(
      shop.getByLabel(`${p.name} miqdori`, { exact: true }),
    ).toHaveText(fixed ? "2" : "3");
    if (fixed)
      await expect(shop.locator(".shop-notice")).toContainText(
        "Omborda faqat 2 dona bor.",
      );
  },
  6: async (shop, scenario, fixed) => {
    const p = scenario.products.find((p) => p.id === "p1");
    await add(shop, "p1");
    await cart(shop);
    await shop
      .getByRole("button", {
        name: `${p.name} miqdorini oshirish`,
        exact: true,
      })
      .click();
    await expect(shop.getByTestId("cart-subtotal")).toHaveText(
      money(p.price * (fixed ? 2 : 1)),
    );
  },
  7: async (shop, scenario, fixed) => {
    await add(shop, "p1");
    await cart(shop);
    await shop.getByLabel("Kuponingiz bormi?").fill("OLD20");
    await shop.getByRole("button", { name: "Qo‘llash", exact: true }).click();
    await expect(shop.locator(".shop-coupon")).toContainText(
      fixed ? "amal qilish muddati tugagan" : "20% chegirma qo‘llandi",
    );
    await expect(
      shop
        .locator(".shop-summary")
        .getByText("Chegirma · OLD20", { exact: true }),
    ).toHaveCount(fixed ? 0 : 1);
  },
  8: async (shop, scenario, fixed) => {
    await add(shop, "p1");
    await cart(shop);
    await shop.getByLabel("Kuponingiz bormi?").fill("qa10");
    await shop.getByRole("button", { name: "Qo‘llash", exact: true }).click();
    await expect(shop.locator(".shop-coupon")).toContainText(
      fixed ? "10% chegirma qo‘llandi" : "Kupon topilmadi",
    );
    await expect(
      shop
        .locator(".shop-summary")
        .getByText("Chegirma · qa10", { exact: true }),
    ).toHaveCount(fixed ? 1 : 0);
  },
  9: async (shop, scenario, fixed) => {
    await add(shop, "p4");
    await cart(shop);
    await expect(shop.getByTestId("delivery-fee")).toHaveText(
      fixed ? "Bepul" : money(20000),
    );
  },
  10: async (shop, scenario, fixed) => {
    await shop.getByRole("button", { name: "Hisob", exact: true }).click();
    await shop.getByLabel("Email", { exact: true }).fill("qa@lab.uz");
    await shop.getByLabel("Parol", { exact: true }).fill("Wrong123!");
    await shop.getByRole("button", { name: "Kirish", exact: true }).click();
    if (fixed)
      await expect(shop.getByRole("alert")).toHaveText(
        "Email yoki parol noto‘g‘ri.",
      );
    else
      await expect(
        shop.getByRole("heading", { name: "Xush kelibsiz, Aziza!" }),
      ).toBeVisible();
  },
  11: async (shop, scenario, fixed) => {
    await add(shop, "p1");
    await cart(shop);
    await checkout(shop, { phone: "123" });
    if (fixed) {
      await expect(
        shop.getByLabel("Telefon raqami", { exact: true }),
      ).toHaveAttribute("aria-invalid", "true");
      await expect(shop.getByRole("alert")).toContainText("Telefonni");
    } else await expect(shop.locator(".shop-order")).toHaveCount(1);
  },
  12: async (shop, scenario, fixed) => {
    await add(shop, "p1");
    await cart(shop);
    await checkout(shop, { address: " ".repeat(12) });
    if (fixed) {
      await expect(
        shop.getByLabel("To‘liq manzil", { exact: true }),
      ).toHaveAttribute("aria-invalid", "true");
      await expect(shop.getByRole("alert")).toContainText("To‘liq manzilni");
    } else await expect(shop.locator(".shop-order")).toHaveCount(1);
  },
  13: async (shop, scenario, fixed) => {
    await add(shop, "p1");
    await cart(shop);
    await checkout(shop);
    const total = await shop.locator(".shop-order footer strong").innerText();
    await shop
      .getByRole("button", { name: "Bekor qilish", exact: true })
      .click();
    await expect(shop.locator(".shop-order-status")).toHaveText(
      fixed ? "Bekor qilingan" : "Yangi",
    );
    await expect(
      shop.getByRole("button", { name: "Bekor qilish", exact: true }),
    ).toHaveCount(fixed ? 0 : 1);
    await expect(shop.locator(".shop-order footer strong")).toHaveText(total);
  },
  14: async (shop, scenario, fixed) => {
    await add(shop, "p3");
    await cart(shop);
    await shop.getByLabel("Kuponingiz bormi?").fill("QA10");
    await shop.getByRole("button", { name: "Qo‘llash", exact: true }).click();
    await expect(shop.locator(".shop-coupon")).toContainText(
      fixed ? "kamida 100 000" : "10% chegirma qo‘llandi",
    );
    await expect(
      shop
        .locator(".shop-summary")
        .getByText("Chegirma · QA10", { exact: true }),
    ).toHaveCount(fixed ? 0 : 1);
  },
};
for (const [id, perform] of Object.entries(checks))
  test(`AT-${String(id).padStart(2, "0")} reproduces through shop UI and passes the same controls after repair`, async ({
    page,
  }) => {
    const seed = seeds[id],
      scenario = createScenario(seed, "expert");
    expect(
      scenario.bugs.some(
        (bug) => bug.id === `BUG-${String(id).padStart(2, "0")}`,
      ),
    ).toBe(true);
    for (const fixed of [false, true]) {
      const shop = await fresh(page, seed, fixed);
      await perform(shop, scenario, fixed);
    }
  });

test("valid coupon feedback clears a previous validation failure", async ({
  page,
}) => {
  const scenario = createScenario("ui-matrix-49", "expert");
  const product = scenario.products.find((item) => item.id === "p3");
  const shop = await fresh(page, "ui-matrix-49", true);
  await add(shop, "p3");
  await cart(shop);
  await shop
    .getByRole("button", {
      name: `${product.name} miqdorini oshirish`,
      exact: true,
    })
    .click();
  await shop.getByLabel("Kuponingiz bormi?").fill("NO-SUCH-CODE");
  await shop.getByRole("button", { name: "Qo‘llash", exact: true }).click();
  await expect(shop.locator(".shop-notice")).toContainText("Kupon topilmadi");
  await shop.getByLabel("Kuponingiz bormi?").fill("QA10");
  await shop.getByRole("button", { name: "Qo‘llash", exact: true }).click();
  await expect(shop.locator(".shop-coupon")).toContainText(
    "10% chegirma qo‘llandi",
  );
  await expect(shop.locator(".shop-notice")).not.toContainText(
    "Kupon topilmadi",
  );
});

test("applied coupon feedback updates when a quantity change falls below the minimum", async ({
  page,
}) => {
  const scenario = createScenario("ui-matrix-49", "expert");
  const product = scenario.products.find((item) => item.id === "p3");
  const shop = await fresh(page, "ui-matrix-49", true);
  await add(shop, "p3");
  await cart(shop);
  await shop
    .getByRole("button", {
      name: `${product.name} miqdorini oshirish`,
      exact: true,
    })
    .click();
  await shop.getByLabel("Kuponingiz bormi?").fill("QA10");
  await shop.getByRole("button", { name: "Qo‘llash", exact: true }).click();
  await expect(shop.locator(".shop-coupon")).toContainText(
    "10% chegirma qo‘llandi",
  );
  await shop
    .getByRole("button", {
      name: `${product.name} miqdorini kamaytirish`,
      exact: true,
    })
    .click();
  await expect(
    shop.locator(".shop-summary").getByText("Chegirma · QA10", { exact: true }),
  ).toHaveCount(0);
  await expect(shop.locator(".shop-coupon")).toContainText("kamida 100 000");
  await expect(shop.locator(".shop-coupon")).not.toContainText(
    "10% chegirma qo‘llandi",
  );
});
