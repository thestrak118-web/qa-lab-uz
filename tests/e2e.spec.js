import { test as base, expect } from "@playwright/test";

// Each test gets an isolated browser context/IndexedDB. Intentional shop bugs are
// exercised by domain tests; these checks protect the surrounding learning tool.
const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await use(page);
    expect(errors, "Application should have no runtime/console errors").toEqual(
      [],
    );
  },
});
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jKFkAAAAASUVORK5CYII=",
  "base64",
);
const sidebar = (page) => page.locator(".sidebar");
async function saved(page) {
  await expect(page.locator(".storage-label")).toHaveText(
    "Ishlaringiz saqlangan",
  );
}
async function nav(page, name) {
  await sidebar(page).getByRole("button", { name }).click();
}
async function open(page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Loyiha ko‘rinishi" }),
  ).toBeVisible();
  await saved(page);
}
async function stored(page) {
  await saved(page);
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("qa-lab-workspace-v1", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db
            .transaction("workspace")
            .objectStore("workspace")
            .get("state");
          read.onsuccess = () => {
            const value = read.result;
            db.close();
            resolve(value);
          };
          read.onerror = () => {
            db.close();
            reject(read.error);
          };
        };
      }),
  );
}
const active = (data) =>
  data.sessions.find((session) => session.id === data.activeId);
async function newExercise(page, name, seed) {
  await page.getByRole("button", { name: "Yangi mashq", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Yangi QA mashqi" });
  await modal.getByLabel("Mashq nomi", { exact: true }).fill(name);
  if (seed) await modal.getByLabel(/Seed/).fill(seed);
  await modal.getByRole("button", { name: "Mashqni yaratish" }).click();
  await expect(modal).toBeHidden();
  await saved(page);
}
async function addChecklist(page, title) {
  await nav(page, /^Checklist/);
  await page
    .getByRole("button", { name: "Tekshiruv qo‘shish", exact: true })
    .first()
    .click();
  await page.getByLabel("Sarlavha *", { exact: true }).fill(title);
  await page
    .getByLabel("Bog‘liq talab", { exact: true })
    .selectOption("REQ-01");
  await page
    .getByLabel("Kutilgan natija", { exact: true })
    .fill("Air va AIR uchun bir xil mahsulotlar chiqadi.");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(
    page.locator(".workspace-record").filter({ hasText: title }),
  ).toBeVisible();
  await saved(page);
}
async function downloadText(page, click) {
  const promise = page.waitForEvent("download");
  await click();
  const download = await promise;
  const stream = await download.createReadStream();
  let text = "";
  for await (const chunk of stream) text += chunk.toString("utf8");
  return { text, filename: download.suggestedFilename() };
}

test("documents and screenshot evidence survive a real reload; exports are usable", async ({
  page,
}) => {
  await open(page);
  const original = active(await stored(page));
  await addChecklist(page, "=1+1 qidiruv tekshiruvi");
  await page
    .getByLabel("=1+1 qidiruv tekshiruvi: holati", { exact: true })
    .selectOption("Failed");
  const csv = await downloadText(page, () =>
    page.getByRole("button", { name: "CSV eksport" }).click(),
  );
  expect(csv.filename).toMatch(/checklist\.csv$/);
  expect(csv.text).toContain("'=1+1 qidiruv tekshiruvi");
  expect(csv.text).toContain("Failed");

  await nav(page, /^Test-case/);
  await page
    .getByRole("button", { name: "Test case qo‘shish", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Sarlavha *", { exact: true })
    .fill("Qidiruv registrini solishtirish");
  await page
    .getByLabel("Bog‘liq talab", { exact: true })
    .selectOption("REQ-01");
  await page
    .getByLabel("Boshlang‘ich shartlar", { exact: true })
    .fill("Katalog ochilgan, filtrlar tozalangan.");
  await page.getByLabel("Test ma’lumotlari", { exact: true }).fill("Air / AIR");
  await page
    .getByLabel("Test qadamlari *", { exact: true })
    .fill("1. Air yozing.\n2. AIR yozing.\n3. Natijalarni solishtiring.");
  await page
    .getByLabel("Kutilgan natija *", { exact: true })
    .fill("Bir xil mahsulotlar.");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await saved(page);

  await nav(page, /^Bug-report/);
  await page
    .getByRole("button", { name: "Bug report yozish", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Sarlavha *", { exact: true })
    .fill("AIR qidiruv natijasi yo‘q");
  await page
    .getByLabel("Bog‘liq talab", { exact: true })
    .selectOption("REQ-01");
  await page
    .getByLabel("Takrorlash qadamlari *", { exact: true })
    .fill("1. Air yozing.\n2. AIR ga almashtiring.");
  await page
    .getByLabel("Kutilgan natija *", { exact: true })
    .fill("Bir xil mahsulotlar chiqadi.");
  await page
    .getByLabel("Haqiqiy natija *", { exact: true })
    .fill("AIR natijasiz. Avtomatlashtirilgan sinov yozuvi.");
  await page.locator(".workspace input[type=file]").setInputFiles({
    name: "search-evidence.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(page.locator(".workspace-evidence")).toHaveCount(1);
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await saved(page);
  const beforeReload = active(await stored(page));
  expect(beforeReload.id).toBe(original.id);
  expect(beforeReload.checklist).toHaveLength(1);
  expect(beforeReload.cases).toHaveLength(1);
  expect(beforeReload.reports).toHaveLength(1);
  expect(beforeReload.cases[0].status).toBe("Not run");
  expect(beforeReload.reports[0].evidence[0].dataUrl).toMatch(
    /^data:image\/png;base64,/,
  );

  await page.reload();
  await saved(page);
  expect(active(await stored(page))).toEqual(beforeReload);
  await nav(page, /^Bug-report/);
  await expect(
    page.getByRole("heading", { name: "AIR qidiruv natijasi yo‘q" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "search-evidence.png", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Screenshot ko‘rish" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  const markdown = await downloadText(page, () =>
    page.getByRole("button", { name: "Markdown eksport" }).click(),
  );
  expect(markdown.filename).toMatch(/\.md$/);
  expect(markdown.text).toContain("## Takrorlash qadamlari");
  expect(markdown.text).toContain("search-evidence.png");
});

test("new exercises archive prior work and fixed seeds reproduce the scenario", async ({
  page,
}) => {
  await open(page);
  await newExercise(page, "Saqlangan birinchi mashq", "PERSISTENCE-QA-101");
  await addChecklist(page, "Tarixda qoladigan tekshiruv");
  const first = active(await stored(page));
  await newExercise(page, "Yangi tasodifiy mashq");
  const random = active(await stored(page));
  expect(random.id).not.toBe(first.id);
  expect(random.seed).not.toBe(first.seed);
  expect(random.checklist).toEqual([]);
  expect(random.scenario).not.toEqual(first.scenario);
  await newExercise(page, "Bir xil seed takrori", "PERSISTENCE-QA-101");
  const repeat = active(await stored(page));
  expect(repeat.id).not.toBe(first.id);
  expect(repeat.scenario).toEqual(first.scenario);
  await nav(page, "Mashqlar tarixi");
  const card = page.locator(".history-card").filter({
    has: page.getByRole("heading", {
      name: "Saqlangan birinchi mashq",
      exact: true,
    }),
  });
  await card.getByRole("button", { name: "Mashqni davom ettirish" }).click();
  await saved(page);
  expect(active(await stored(page)).id).toBe(first.id);
  await nav(page, /^Checklist/);
  await expect(
    page.getByRole("heading", { name: "Tarixda qoladigan tekshiruv" }),
  ).toBeVisible();
  await page.reload();
  await saved(page);
  expect(active(await stored(page)).id).toBe(first.id);
  expect((await stored(page)).sessions).toHaveLength(4);
});

test("invalid backups cannot replace or damage current work; valid backup can be read", async ({
  page,
}) => {
  await open(page);
  await addChecklist(page, "Importdan keyin saqlanishi shart");
  await nav(page, "Mashqlar tarixi");
  const before = await stored(page);
  const exportResult = await downloadText(page, () =>
    page.getByRole("button", { name: "JSON eksport" }).click(),
  );
  expect(JSON.parse(exportResult.text)).toEqual(before);
  const input = page.locator(
    'input[type=file][accept="application/json,.json"]',
  );
  await input.setInputFiles({
    name: "invalid-schema.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1,"sessions":[]}'),
  });
  await expect(page.getByRole("status")).toContainText(
    "zaxira formatiga mos emas",
  );
  expect(await stored(page)).toEqual(before);
  await input.setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{ invalid json"),
  });
  await expect(page.getByRole("status")).toBeVisible();
  expect(await stored(page)).toEqual(before);
  // Reimporting an already-present valid backup must not duplicate sessions.
  await input.setInputFiles({
    name: "valid-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportResult.text),
  });
  await expect(page.getByRole("status")).toContainText("Zaxira import qilindi");
  expect(await stored(page)).toEqual(before);
});

test("checklist edits, status filters and undo preserve stable record identity", async ({
  page,
}) => {
  await open(page);
  await addChecklist(page, "Tahrirlanadigan tekshiruv");
  const id = active(await stored(page)).checklist[0].id;
  await page
    .getByLabel("Tahrirlanadigan tekshiruv: tahrirlash", { exact: true })
    .click();
  await page
    .getByLabel("Sarlavha *", { exact: true })
    .fill("Yangilangan tekshiruv");
  await page
    .getByLabel("Haqiqiy natija", { exact: true })
    .fill("Natijalar mos.");
  await page.getByLabel("Holat", { exact: true }).selectOption("Passed");
  await page.getByRole("button", { name: "O‘zgarishlarni saqlash" }).click();
  await saved(page);
  expect(active(await stored(page)).checklist[0].id).toBe(id);
  await page.getByLabel("Holat bo‘yicha filtrlash").selectOption("Failed");
  await expect(page.getByText("Qidiruvga mos yozuv topilmadi.")).toBeVisible();
  await page.getByRole("button", { name: "Filtrni tozalash" }).click();
  await page
    .getByLabel("Yangilangan tekshiruv: o‘chirish", { exact: true })
    .click();
  await saved(page);
  expect(active(await stored(page)).checklist).toHaveLength(0);
  await page.getByRole("button", { name: "Qaytarish", exact: true }).click();
  await saved(page);
  expect(active(await stored(page)).checklist[0]).toMatchObject({
    id,
    title: "Yangilangan tekshiruv",
    status: "Passed",
  });
});

test("390px navigation, shop and authoring forms have no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const noOverflow = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  await noOverflow();
  await page.getByRole("button", { name: "Menyu", exact: true }).click();
  await nav(page, "Demo do‘kon");
  await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
  await expect(
    page.getByRole("heading", { name: "Mahsulotlar", exact: true }),
  ).toBeVisible();
  await noOverflow();
  await page
    .getByRole("textbox", { name: "Mahsulot qidirish", exact: true })
    .fill("QA-P1-");
  await page
    .getByTestId("product-p1")
    .getByRole("button", { name: /savatga qo‘shish/ })
    .click();
  await page.getByRole("button", { name: "Savat, 1 mahsulot" }).click();
  await expect(
    page.getByRole("heading", { name: "Sizning savatingiz" }),
  ).toBeVisible();
  await noOverflow();
  await saved(page);
  expect(active(await stored(page)).productState.cart).toMatchObject([
    { productId: "p1", quantity: 1 },
  ]);
  await page.reload();
  await saved(page);
  await page.getByRole("button", { name: "Menyu", exact: true }).click();
  await nav(page, "Demo do‘kon");
  await expect(
    page.getByRole("heading", { name: "Sizning savatingiz" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Menyu", exact: true }).click();
  await nav(page, /^Bug-report/);
  await page
    .getByRole("button", { name: "Bug report yozish", exact: true })
    .first()
    .click();
  await expect(
    page.getByLabel("Takrorlash qadamlari *", { exact: true }),
  ).toBeVisible();
  await noOverflow();
  await page.getByRole("button", { name: "Bekor qilish", exact: true }).click();
  await page.getByRole("button", { name: "Yangi mashq", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Yangi QA mashqi" }),
  ).toBeVisible();
  await noOverflow();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});
