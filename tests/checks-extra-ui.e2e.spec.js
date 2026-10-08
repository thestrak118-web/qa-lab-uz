import { test as base, expect } from "@playwright/test";
const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await use(page);
    expect(errors).toEqual([]);
  },
});
const nav = (page, name) =>
  page.locator(".sidebar").getByRole("button", { name, exact: true }).click();
async function repair(page) {
  await nav(page, "Natija va retest");
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
  await nav(page, "Demo do‘kon");
}
async function fresh(page, fixed = true) {
  await page.goto("/");
  await page.getByRole("button", { name: "Yangi mashq", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Yangi QA mashqi" });
  await modal
    .getByLabel("Mashq nomi", { exact: true })
    .fill("Qo‘shimcha UI chegaralari");
  await modal.getByLabel(/Seed/).fill("ui-matrix-0");
  await modal.getByRole("radio", { name: /Murakkab/ }).check();
  await modal
    .getByRole("button", { name: "Mashqni yaratish", exact: true })
    .click();
  await expect(modal).toBeHidden();
  if (fixed) await repair(page);
  else await nav(page, "Demo do‘kon");
  return page.locator(".shop-shell");
}
async function add(shop) {
  await shop.getByRole("button", { name: "Katalog", exact: true }).click();
  await shop.getByRole("textbox", { name: "Mahsulot qidirish" }).fill("QA-P1-");
  await shop
    .getByTestId("product-p1")
    .getByRole("button", { name: /savatga qo‘shish/ })
    .click();
}
const cart = (shop) => shop.getByRole("button", { name: /^Savat,/ }).click();
async function validCheckout(shop) {
  await shop
    .getByRole("button", { name: "Rasmiylashtirish", exact: true })
    .click();
  await shop
    .getByLabel("Ism va familiya", { exact: true })
    .fill("Aziza Karimova");
  await shop
    .getByLabel("Telefon raqami", { exact: true })
    .fill("+998901234567");
  await shop
    .getByLabel("To‘liq manzil", { exact: true })
    .fill("Toshkent, Olmazor ko‘chasi15");
}
async function request(page, path, body) {
  await nav(page, "API laboratoriya");
  await page
    .getByRole("combobox", { name: "HTTP method" })
    .selectOption("POST");
  await page.getByRole("textbox", { name: "Endpoint", exact: true }).fill(path);
  await page
    .getByLabel("Request body (JSON)", { exact: true })
    .fill(JSON.stringify(body));
  await page.getByRole("button", { name: "Yuborish", exact: true }).click();
}

test("empty cart cannot checkout, and rapid additions/removal preserve exact quantities", async ({
  page,
}) => {
  const shop = await fresh(page);
  await cart(shop);
  await expect(
    shop.getByRole("heading", { name: "Savat hozircha bo‘sh" }),
  ).toBeVisible();
  await expect(
    shop.getByRole("button", { name: "Rasmiylashtirish", exact: true }),
  ).toHaveCount(0);
  await request(page, "/orders", {
    name: "Aziza Karimova",
    phone: "+998901234567",
    address: "Toshkent, Olmazor ko‘chasi15",
    payment: "cash",
    card: "",
  });
  await expect(page.locator(".response-head .badge")).toHaveText("422");
  await expect(page.locator(".response-code")).toContainText("Savat bo‘sh.");
  await nav(page, "Demo do‘kon");
  await add(shop);
  await shop
    .getByTestId("product-p1")
    .getByRole("button", { name: /savatga qo‘shish/ })
    .dblclick();
  await cart(shop);
  await expect(shop.locator(".shop-quantity output")).toHaveText("3");
  await shop.getByRole("button", { name: /miqdorini kamaytirish/ }).click();
  await shop.getByRole("button", { name: /miqdorini kamaytirish/ }).click();
  await expect(shop.locator(".shop-quantity output")).toHaveText("1");
  await expect(
    shop.getByRole("button", { name: /miqdorini kamaytirish/ }),
  ).toBeDisabled();
  await shop.getByRole("button", { name: /savatdan o‘chirish/ }).click();
  await expect(shop.locator(".shop-cart-line")).toHaveCount(0);
  await expect(
    shop.getByRole("heading", { name: "Savat hozircha bo‘sh" }),
  ).toBeVisible();
});

test("invalid card can be corrected or changed to cash; cancelled order remains immutable", async ({
  page,
}) => {
  const shop = await fresh(page);
  await add(shop);
  await cart(shop);
  await validCheckout(shop);
  await shop.getByRole("radio", { name: /Demo karta/ }).check();
  await shop
    .getByLabel("Demo karta raqami", { exact: true })
    .fill("1111 1111 1111 1111");
  await shop
    .getByRole("button", { name: "Buyurtma berish", exact: true })
    .click();
  await expect(shop.getByRole("alert")).toContainText("Faqat demo karta");
  await expect(shop.locator(".shop-order")).toHaveCount(0);
  await shop.getByRole("radio", { name: /Qabul qilganda/ }).check();
  await expect(
    shop.getByLabel("Demo karta raqami", { exact: true }),
  ).toHaveCount(0);
  await shop
    .getByRole("button", { name: "Buyurtma berish", exact: true })
    .dblclick();
  await expect(shop.locator(".shop-order")).toHaveCount(1);
  const order = shop.locator(".shop-order");
  const id = await order.locator("h3").innerText();
  const products = await order.locator(".shop-order-products").textContent();
  const total = await order.locator("footer strong").innerText();
  await shop.getByRole("button", { name: "Bekor qilish", exact: true }).click();
  await expect(order.locator(".shop-order-status")).toHaveText(
    "Bekor qilingan",
  );
  await expect(shop.locator(".shop-page-heading")).toContainText(
    "0 ta faol buyurtma",
  );
  await request(page, `/orders/${id}/cancel`, {});
  await expect(page.locator(".response-head .badge")).toHaveText("409");
  await nav(page, "Demo do‘kon");
  await expect(order.locator(".shop-order-products")).toHaveText(products);
  await expect(order.locator("footer strong")).toHaveText(total);
  await add(shop);
  await cart(shop);
  await validCheckout(shop);
  await shop.getByRole("radio", { name: /Demo karta/ }).check();
  await shop.getByLabel("Demo karta raqami", { exact: true }).fill("bad");
  await shop
    .getByRole("button", { name: "Buyurtma berish", exact: true })
    .click();
  await expect(shop.getByRole("alert")).toContainText("Faqat demo karta");
  await shop
    .getByLabel("Demo karta raqami", { exact: true })
    .fill("4242 4242 4242 4242");
  await expect(shop.getByRole("alert")).toHaveCount(0);
  await shop
    .getByRole("button", { name: "Buyurtma berish", exact: true })
    .click();
  await expect(shop.locator(".shop-order")).toHaveCount(2);
});

test("fixed build retests an existing buggy cancellation without erasing order history", async ({
  page,
}) => {
  const shop = await fresh(page, false);
  await add(shop);
  await cart(shop);
  await validCheckout(shop);
  await shop
    .getByRole("button", { name: "Buyurtma berish", exact: true })
    .click();
  const order = shop.locator(".shop-order");
  const id = await order.locator("h3").innerText();
  const total = await order.locator("footer strong").innerText();
  await shop.getByRole("button", { name: "Bekor qilish", exact: true }).click();
  await expect(order.locator(".shop-order-status")).toHaveText("Yangi");
  await repair(page);
  await expect(order.locator("h3")).toHaveText(id);
  await expect(order.locator("footer strong")).toHaveText(total);
  await shop.getByRole("button", { name: "Bekor qilish", exact: true }).click();
  await expect(order.locator(".shop-order-status")).toHaveText(
    "Bekor qilingan",
  );
  await expect(order.locator("h3")).toHaveText(id);
});

test("login normalizes only email, rejects altered password and persists logout", async ({
  page,
}) => {
  const shop = await fresh(page);
  await shop.getByRole("button", { name: "Hisob", exact: true }).click();
  await shop.getByLabel("Email", { exact: true }).fill("QA@LAB.UZ");
  await shop.getByLabel("Parol", { exact: true }).fill(" Test123!");
  await shop.getByRole("button", { name: "Kirish", exact: true }).click();
  await expect(shop.getByRole("alert")).toHaveText(
    "Email yoki parol noto‘g‘ri.",
  );
  await shop.getByLabel("Parol", { exact: true }).fill("Test123!");
  await shop.getByRole("button", { name: "Kirish", exact: true }).click();
  await expect(
    shop.getByRole("heading", { name: "Xush kelibsiz, Aziza!" }),
  ).toBeVisible();
  await shop
    .getByRole("button", { name: "Hisobdan chiqish", exact: true })
    .click();
  await expect(shop.getByLabel("Email", { exact: true })).toHaveValue("");
  await expect(shop.getByLabel("Parol", { exact: true })).toHaveValue("");
  await expect(page.locator(".storage-label")).toHaveText(
    "Ishlaringiz saqlangan",
  );
  await page.reload();
  await nav(page, "Demo do‘kon");
  await expect(
    shop.getByRole("heading", { name: "Hisobga kirish", exact: true }),
  ).toBeVisible();
  await expect(
    shop.getByRole("button", { name: "Hisobdan chiqish", exact: true }),
  ).toHaveCount(0);
});

test("an expired coupon accepted in a buggy build is explained after switching to repaired behavior", async ({
  page,
}) => {
  const shop = await fresh(page, false);
  await add(shop);
  await cart(shop);
  await shop.getByLabel("Kuponingiz bormi?").fill("OLD20");
  await shop.getByRole("button", { name: "Qo‘llash", exact: true }).click();
  await expect(shop.locator(".shop-coupon")).toContainText(
    "20% chegirma qo‘llandi",
  );
  await repair(page);
  await expect(shop.locator(".shop-coupon")).toContainText(
    "amal qilish muddati tugagan",
  );
  await expect(shop.locator(".shop-coupon")).not.toContainText(
    "20% chegirma qo‘llandi",
  );
  await expect(
    shop.locator(".shop-notice").filter({ hasText: "20% chegirma qo‘llandi" }),
  ).toHaveCount(0);
  await expect(
    shop
      .locator(".shop-summary")
      .getByText("Chegirma · OLD20", { exact: true }),
  ).toHaveCount(0);
});
