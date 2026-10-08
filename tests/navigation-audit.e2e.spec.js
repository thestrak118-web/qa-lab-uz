import { test, expect } from "@playwright/test";

async function saved(page) {
  await expect(page.locator(".storage-label")).toHaveText(
    "Ishlaringiz saqlangan",
  );
}
async function open(page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Loyiha ko‘rinishi" }),
  ).toBeVisible();
  await saved(page);
}
async function nav(page, name) {
  const menu = page.getByRole("button", { name: "Menyu", exact: true });
  if (
    (await menu.isVisible()) &&
    !(await page.locator(".sidebar").getAttribute("class")).includes("open")
  )
    await menu.click();
  await page.locator(".sidebar").getByRole("button", { name }).click();
}
async function create(page, { name, seed, difficulty = "standard" }) {
  await page.getByRole("button", { name: "Yangi mashq", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Yangi QA mashqi" });
  await modal.getByLabel("Mashq nomi", { exact: true }).fill(name);
  await modal.getByLabel(/Seed/).fill(seed);
  await modal.locator(`input[value="${difficulty}"]`).check();
  await modal.getByRole("button", { name: "Mashqni yaratish" }).click();
  await expect(modal).toBeHidden();
  await saved(page);
}
async function stored(page) {
  await saved(page);
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("qa-lab-workspace-v1", 1);
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const db = r.result;
          const q = db
            .transaction("workspace")
            .objectStore("workspace")
            .get("state");
          q.onsuccess = () => {
            db.close();
            resolve(q.result);
          };
          q.onerror = () => {
            db.close();
            reject(q.error);
          };
        };
      }),
  );
}
const active = (data) => data.sessions.find((s) => s.id === data.activeId);
async function returnTo(page, name) {
  await nav(page, "Mashqlar tarixi");
  await page
    .locator(".history-card")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .getByRole("button", { name: "Mashqni davom ettirish" })
    .click();
  await saved(page);
}
async function downloadJSON(page) {
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON eksport", exact: true }).click();
  const dl = await promise;
  let text = "";
  for await (const chunk of await dl.createReadStream())
    text += chunk.toString("utf8");
  return JSON.parse(text);
}

test("unusual names and seeds remain text; history and a fresh-browser backup preserve cart, documents and grades", async ({
  page,
  browser,
}) => {
  await open(page);
  const name = 'QA <img src=x onerror=alert(1)> "🧪"';
  const seed = 'O‘zbek "x" <tag>🧪 /?=1';
  await create(page, { name, seed });
  await expect(page.locator(".project-name h2")).toHaveText(name);
  await expect(page.locator(".project-name img")).toHaveCount(0);
  await nav(page, /^Checklist/);
  await page
    .getByRole("button", { name: "Tekshiruv qo‘shish", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Sarlavha *", { exact: true })
    .fill('O‘zbekcha "dalil" 🧪');
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await nav(page, "Demo do‘kon");
  const product = active(await stored(page)).scenario.products.find(
    (item) => item.id === "p1",
  );
  await page
    .getByLabel("Mahsulot qidirish", { exact: true })
    .fill(product.name);
  await page
    .locator('[data-testid="product-p1"]')
    .getByRole("button", { name: /savatga qo‘shish/i })
    .click();
  await nav(page, "Natija va retest");
  const assessment = page.getByRole("region", {
    name: "Avtomatik baholash",
    exact: true,
  });
  await assessment
    .getByRole("button", { name: "Mashqni topshirish", exact: true })
    .click();
  await assessment
    .getByRole("button", { name: "Topshirish va baholash", exact: true })
    .click();
  await expect(assessment.locator(".assessment-total")).toBeVisible();
  const original = active(await stored(page));
  expect(original.checklist).toHaveLength(1);
  expect(original.productState.cart).toHaveLength(1);
  expect(original.assessments).toHaveLength(1);
  await create(page, { name: "Bir xil seed takrori", seed });
  const repeated = active(await stored(page));
  expect(repeated.scenario).toEqual(original.scenario);
  expect(repeated.productState.cart).toEqual([]);
  await returnTo(page, name);
  expect(active(await stored(page))).toEqual(original);
  await nav(page, "Mashqlar tarixi");
  const backup = await downloadJSON(page);
  const context = await browser.newContext();
  const fresh = await context.newPage();
  await open(fresh);
  await nav(fresh, "Mashqlar tarixi");
  await fresh
    .locator('input[type=file][accept="application/json,.json"]')
    .setInputFiles({
      name: "real-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await expect(fresh.getByRole("status")).toContainText(
    "Zaxira import qilindi",
  );
  await returnTo(fresh, name);
  expect(active(await stored(fresh))).toEqual(original);
  await fresh.reload();
  expect(active(await stored(fresh))).toEqual(original);
  await nav(fresh, "Natija va retest");
  await expect(fresh.locator(".assessment-total")).toContainText("0");
  await context.close();
});

test("all difficulty choices produce the promised exercise sizes and history remains separate", async ({
  page,
}) => {
  await open(page);
  for (const [difficulty, count] of [
    ["beginner", 4],
    ["standard", 6],
    ["expert", 8],
  ]) {
    await create(page, {
      name: `Daraja ${difficulty}`,
      seed: "Stable / seed 🧪",
      difficulty,
    });
    const data = active(await stored(page));
    expect(data.scenario.bugs).toHaveLength(count);
    expect(data.difficulty).toBe(difficulty);
    expect(data.scenario.products).toHaveLength(39);
  }
  await nav(page, "Mashqlar tarixi");
  await expect(page.locator(".history-card")).toHaveCount(4);
});

test("requirements empty search recovers and every guide action opens its intended workspace", async ({
  page,
}) => {
  await open(page);
  await nav(page, "Talablar");
  await page
    .getByLabel("Talab qidirish", { exact: true })
    .fill("REQ-TOPILMAYDI-🧪");
  await expect(
    page.getByText("Mos talab topilmadi.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".requirement")).toHaveCount(0);
  await page.getByLabel("Talab qidirish", { exact: true }).fill("req-08");
  await expect(page.locator(".requirement")).toHaveCount(1);
  await expect(page.locator(".requirement")).toContainText("REQ-08");
  for (const [index, title] of [
    [0, "Talablar"],
    [1, "Test-case’lar"],
    [2, "Bug-report’lar"],
    [3, "Natija va retest"],
  ]) {
    await nav(page, "Qanday ishlaydi?");
    await page
      .locator(".guide-grid article")
      .nth(index)
      .getByRole("button", { name: "Amalda bajarish" })
      .click();
    await expect(page.locator(".page-heading h1")).toHaveText(title);
  }
});

test("maximum-length exercise names and seeds do not overflow the phone workspace", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await open(page);
  await create(page, { name: "W".repeat(80), seed: "S".repeat(50) });
  for (const destination of [
    "Umumiy ko‘rinish",
    "Talablar",
    "Mashqlar tarixi",
  ]) {
    await nav(page, destination);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      destination,
    ).toBeLessThanOrEqual(320);
  }
});

test("sample documents remain visible but do not inflate execution, coverage or review metrics", async ({
  page,
}) => {
  await open(page);
  await nav(page, /^Test-case/);
  await page
    .getByRole("button", { name: "Namuna bilan boshlash", exact: true })
    .click();
  await page.getByLabel("Holat", { exact: true }).selectOption("Passed");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await nav(page, /^Checklist/);
  await page
    .getByRole("button", { name: "Namuna bilan boshlash", exact: true })
    .click();
  await page.getByLabel("Holat", { exact: true }).selectOption("Passed");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await nav(page, /^Bug-report/);
  await page
    .getByRole("button", { name: "Namuna bilan boshlash", exact: true })
    .click();
  await page
    .getByLabel("Sarlavha *", { exact: true })
    .fill("[nAmUnA] Tayyor ko‘rsatma");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await nav(page, "Umumiy ko‘rinish");
  const metrics = page.getByRole("region", { name: "Mashq statistikasi" });
  await expect(
    metrics.getByRole("button", { name: /Test-case’lar/ }),
  ).toContainText("1");
  await expect(
    metrics.getByRole("button", { name: /Test-case’lar/ }),
  ).toContainText("0 bajarilgan");
  await expect(
    metrics.getByRole("button", { name: /Checklist/ }),
  ).toContainText("0 o‘tgan tekshiruv");
  await expect(
    metrics
      .getByRole("button", { name: /Ochiq bug-reportlar/ })
      .locator("strong"),
  ).toHaveText("0");
  const coverage = await page.locator(".coverage-rows small").allTextContents();
  expect(coverage.every((text) => text.trim().startsWith("0 /"))).toBe(true);
  await expect(
    page.getByRole("region", { name: "Mashq bo‘yicha yo‘l-yo‘riq" }),
  ).toContainText("Bitta talabdan boshlang");
  await nav(page, "Natija va retest");
  await expect(
    page.locator(".review-stats .stat-card").first().locator("strong"),
  ).toHaveText("0");
  const promise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Hisobotni yuklash", exact: true })
    .click();
  let text = "";
  for await (const chunk of await (await promise).createReadStream())
    text += chunk.toString("utf8");
  expect(text).toContain("Passed: 0");
  expect(text).toContain("Bug-reportlar (namunasiz): 0");
});

test("invalid JSON is an error, leaves the workspace untouched, and a later success has success status", async ({
  page,
}) => {
  await open(page);
  const before = await stored(page);
  await nav(page, "Mashqlar tarixi");
  await page
    .locator('input[type=file][accept="application/json,.json"]')
    .setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{broken"),
    });
  await expect(page.getByRole("alert")).toContainText("JSON fayli buzilgan");
  await expect(page.locator(".toast")).toHaveClass(/toast-error/);
  expect(await stored(page)).toEqual(before);
  await downloadJSON(page);
  await expect(page.locator(".toast")).not.toHaveClass(/toast-error/);
  await expect(page.locator(".toast")).toHaveAttribute("role", "status");
});

test("legacy imported image bytes fail gracefully while the QA report remains usable", async ({
  page,
}) => {
  await open(page);
  const original = active(await stored(page));
  const session = {
    ...structuredClone(original),
    id: "legacy-image-test",
    name: "Buzilgan eski dalil",
    reports: [
      {
        id: "broken-report",
        title: "Tarixiy report",
        expected: "Mahsulot chiqadi",
        actual: "Mahsulot chiqmadi",
        steps: "1. Qidiruvni bajaring",
        status: "Open",
        severity: "Medium",
        priority: "P2",
        evidence: [
          {
            id: "damaged-evidence",
            name: "old.png",
            type: "image/png",
            dataUrl: "data:image/png;base64,iVBORw0KGgo=",
          },
        ],
      },
    ],
  };
  await nav(page, "Mashqlar tarixi");
  await page
    .locator('input[type=file][accept="application/json,.json"]')
    .setInputFiles({
      name: "old-evidence.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 1,
          activeId: session.id,
          sessions: [session],
        }),
      ),
    });
  await expect(page.getByRole("status")).toContainText("Zaxira import qilindi");
  await returnTo(page, session.name);
  await nav(page, /^Bug-report/);
  await page.getByRole("button", { name: "old.png", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Screenshot ko‘rish" });
  await expect(preview.getByRole("note")).toContainText(
    "Rasmni ko‘rsatib bo‘lmadi",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Tarixiy report: tahrirlash", exact: true })
    .click();
  await expect(page.locator(".workspace-thumbnail")).toContainText(
    "Rasm ochilmadi",
  );
  await page
    .getByRole("button", { name: "old.png rasmini olib tashlash", exact: true })
    .click();
  await page
    .getByRole("button", { name: "O‘zgarishlarni saqlash", exact: true })
    .click();
  expect(active(await stored(page)).reports[0].evidence).toEqual([]);
});

test("new reports capture the current browser size, while editing preserves the recorded test environment", async ({
  page,
}) => {
  await open(page);
  const initial = active(await stored(page));
  expect(initial.environment).toContain("1365×950");
  await page.setViewportSize({ width: 390, height: 844 });
  await nav(page, /^Bug-report/);
  await page
    .getByRole("button", { name: "Bug report yozish", exact: true })
    .first()
    .click();
  const environment = page.getByLabel("Muhit", { exact: true });
  await expect(environment).toHaveValue(/390×844/);
  await page
    .getByLabel("Sarlavha *", { exact: true })
    .fill("Mobil muhit dalili");
  await page
    .getByLabel("Takrorlash qadamlari *", { exact: true })
    .fill("1. Sahifani telefonda oching.");
  await page
    .getByLabel("Kutilgan natija *", { exact: true })
    .fill("Forma sig‘adi.");
  await page
    .getByLabel("Haqiqiy natija *", { exact: true })
    .fill("Forma sig‘madi.");
  const recorded = await environment.inputValue();
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page
    .getByRole("button", {
      name: "Mobil muhit dalili: tahrirlash",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Muhit", { exact: true })).toHaveValue(recorded);
});
