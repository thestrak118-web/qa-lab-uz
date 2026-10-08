import { test, expect } from "@playwright/test";

const nav = (page, name) =>
  page.locator(".sidebar").getByRole("button", { name });
const editor = (page) => page.locator(".workspace-editor");
async function open(page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Loyiha ko‘rinishi" }),
  ).toBeVisible();
}
async function newChecklist(page) {
  await nav(page, /^Checklist/).click();
  await page
    .getByRole("button", { name: "Tekshiruv qo‘shish", exact: true })
    .first()
    .click();
}

test("unfinished QA work survives visiting the shop and reload without becoming a submitted record", async ({
  page,
}) => {
  await open(page);
  await newChecklist(page);
  await editor(page)
    .getByLabel("Sarlavha *", { exact: true })
    .fill("Qidiruvni amalda tekshirish");
  await editor(page)
    .getByLabel("Avto baholash mezoni", { exact: true })
    .selectOption("AT-01");
  await editor(page)
    .getByLabel("Kutilgan natija", { exact: true })
    .fill("Bir xil natija");
  await nav(page, "Demo do‘kon").click();
  await nav(page, /^Test-case/).click();
  await expect(editor(page)).toHaveCount(0);
  await nav(page, /^Checklist/).click();
  await expect(
    editor(page).getByLabel("Sarlavha *", { exact: true }),
  ).toHaveValue("Qidiruvni amalda tekshirish");
  await expect(page.locator(".workspace-record")).toHaveCount(0);
  await page.reload();
  await nav(page, /^Checklist/).click();
  await expect(
    editor(page).getByLabel("Kutilgan natija", { exact: true }),
  ).toHaveValue("Bir xil natija");
  await editor(page)
    .getByRole("button", { name: "Saqlash", exact: true })
    .click();
  await expect(page.locator(".workspace-record")).toHaveCount(1);
  await nav(page, "Demo do‘kon").click();
  await nav(page, /^Checklist/).click();
  await expect(editor(page)).toHaveCount(0);
  await expect(page.locator(".workspace-record")).toHaveCount(1);
});

test("replacing or discarding a changed draft requires a deliberate choice", async ({
  page,
}) => {
  await open(page);
  await newChecklist(page);
  await editor(page)
    .getByLabel("Sarlavha *", { exact: true })
    .fill("Yo‘qolmasligi kerak");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Tekshiruv qo‘shish", exact: true })
    .first()
    .click();
  await expect(
    editor(page).getByLabel("Sarlavha *", { exact: true }),
  ).toHaveValue("Yo‘qolmasligi kerak");
  page.once("dialog", (dialog) => dialog.dismiss());
  await editor(page)
    .getByRole("button", { name: "Bekor qilish", exact: true })
    .click();
  await expect(editor(page)).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await editor(page)
    .getByRole("button", { name: "Bekor qilish", exact: true })
    .click();
  await expect(editor(page)).toHaveCount(0);
  await nav(page, "Demo do‘kon").click();
  await nav(page, /^Checklist/).click();
  await expect(editor(page)).toHaveCount(0);
});

test("editing a record retains its draft and inline status through navigation", async ({
  page,
}) => {
  await open(page);
  await newChecklist(page);
  await editor(page)
    .getByLabel("Sarlavha *", { exact: true })
    .fill("Asl yozuv");
  await editor(page)
    .getByRole("button", { name: "Saqlash", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Asl yozuv: tahrirlash", exact: true })
    .click();
  await editor(page)
    .getByLabel("Haqiqiy natija", { exact: true })
    .fill("Sinov davom etmoqda");
  await page
    .getByLabel("Asl yozuv: holati", { exact: true })
    .selectOption("Blocked");
  await nav(page, "Demo do‘kon").click();
  await nav(page, /^Checklist/).click();
  await expect(
    editor(page).getByLabel("Haqiqiy natija", { exact: true }),
  ).toHaveValue("Sinov davom etmoqda");
  await expect(editor(page).getByLabel("Holat", { exact: true })).toHaveValue(
    "Blocked",
  );
  await editor(page)
    .getByRole("button", { name: "O‘zgarishlarni saqlash", exact: true })
    .click();
  await expect(page.locator(".workspace-record")).toHaveCount(1);
  await expect(
    page.getByLabel("Asl yozuv: holati", { exact: true }),
  ).toHaveValue("Blocked");
});

test("API submits from the keyboard, labels old responses and preserves the request while preparing the shop", async ({
  page,
}) => {
  await open(page);
  await nav(page, "API laboratoriya").click();
  await page.getByLabel("Endpoint", { exact: true }).fill("/products");
  await page.getByLabel("Endpoint", { exact: true }).press("Enter");
  await expect(page.locator(".response-head .badge")).toHaveText("200");
  expect(
    JSON.parse(await page.locator(".response-code").textContent()).total,
  ).toBe(39);
  await page.getByLabel("Endpoint", { exact: true }).fill("/orders");
  await expect(page.locator(".api-response-request")).toContainText(
    "GET /products",
  );
  await expect(page.locator(".api-response-request")).toContainText(
    "So‘rov o‘zgardi",
  );
  await page.getByLabel("HTTP method", { exact: true }).selectOption("POST");
  await page
    .getByLabel("Request body (JSON)", { exact: true })
    .fill('{"name":"Dilshod","phone":"901234567","address":"Toshkent"}');
  await nav(page, "Demo do‘kon").click();
  await nav(page, "API laboratoriya").click();
  await expect(page.getByLabel("HTTP method", { exact: true })).toHaveValue(
    "POST",
  );
  await expect(page.getByLabel("Endpoint", { exact: true })).toHaveValue(
    "/orders",
  );
  await expect(
    page.getByLabel("Request body (JSON)", { exact: true }),
  ).toHaveValue(/Dilshod/);
  await page.reload();
  await nav(page, "API laboratoriya").click();
  await expect(
    page.getByLabel("Request body (JSON)", { exact: true }),
  ).toHaveValue(/Dilshod/);
});

test("API request mutations finish before navigation and do not replace the next shop action", async ({
  page,
}) => {
  await open(page);
  await nav(page, "API laboratoriya").click();
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.getByRole("button", { name: "Yuborish", exact: true }).click();
  await nav(page, "Demo do‘kon").click();
  await expect(page.locator(".shop-header")).toContainText("Aziza");
  await page
    .getByRole("button", { name: /savatga qo‘shish/i })
    .first()
    .click();
  await nav(page, "API laboratoriya").click();
  await page.getByLabel("HTTP method", { exact: true }).selectOption("GET");
  await page.getByLabel("Endpoint", { exact: true }).fill("/cart");
  await page.getByLabel("Request body (JSON)", { exact: true }).fill("");
  await page.getByRole("button", { name: "Yuborish", exact: true }).click();
  await expect(page.locator(".response-head .badge")).toHaveText("200");
  const response = JSON.parse(
    await page.locator(".response-code").textContent(),
  );
  expect(response.lines.length).toBe(1);
});

test("invalid screenshot bytes are rejected; a real attachment survives draft recovery", async ({
  page,
}) => {
  await open(page);
  await nav(page, /^Bug-report/).click();
  await page
    .getByRole("button", { name: "Bug report yozish", exact: true })
    .first()
    .click();
  await editor(page)
    .getByLabel("Sarlavha *", { exact: true })
    .fill("Dalil tekshiruvi");
  await expect(
    editor(page).getByLabel("Muhit", { exact: true }),
  ).not.toHaveValue(/Brauzer: …/);
  const input = page.locator(".workspace input[type=file]");
  await input.setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("this is not an image"),
  });
  await expect(page.getByRole("alert")).toContainText("Rasm yuklanmadi");
  await expect(page.locator(".workspace-evidence")).toHaveCount(0);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jKFkAAAAASUVORK5CYII=",
    "base64",
  );
  await input.setInputFiles({
    name: "real.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(page.locator(".workspace-evidence")).toHaveCount(1);
  await nav(page, "Demo do‘kon").click();
  await nav(page, /^Bug-report/).click();
  await expect(page.locator(".workspace-evidence")).toHaveCount(1);
  await page
    .getByRole("button", { name: "real.png rasmini ko‘rish", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Screenshot ko‘rish" });
  await expect(dialog).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveAttribute("inert", "");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(
    "hidden",
  );
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Rasmni yopish", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Yuklab olish", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".sidebar")).not.toHaveAttribute("inert", "");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  await expect(
    page.getByRole("button", { name: "real.png rasmini ko‘rish", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", {
      name: "real.png rasmini olib tashlash",
      exact: true,
    })
    .click();
  await expect(page.locator(".workspace-evidence")).toHaveCount(0);
});

test("three large screenshot attachments recover when editing without duplicating image payloads", async ({
  page,
}) => {
  await open(page);
  await nav(page, /^Bug-report/).click();
  await page
    .getByRole("button", { name: "Bug report yozish", exact: true })
    .first()
    .click();
  await editor(page)
    .getByLabel("Sarlavha *", { exact: true })
    .fill("Uchta katta dalil");
  await editor(page)
    .getByLabel("Takrorlash qadamlari *", { exact: true })
    .fill("1. Qidiruvni bajaring.");
  await editor(page)
    .getByLabel("Kutilgan natija *", { exact: true })
    .fill("Bir xil natijalar.");
  await editor(page)
    .getByLabel("Haqiqiy natija *", { exact: true })
    .fill("Natijalar mos emas.");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jKFkAAAAASUVORK5CYII=",
    "base64",
  );
  const image = Buffer.concat([png, Buffer.alloc(900_000)]);
  await page.locator(".workspace input[type=file]").setInputFiles(
    [1, 2, 3].map((i) => ({
      name: `evidence-${i}.png`,
      mimeType: "image/png",
      buffer: image,
    })),
  );
  await expect(page.locator(".workspace-evidence")).toHaveCount(3);
  await editor(page)
    .getByRole("button", { name: "Saqlash", exact: true })
    .click();
  await expect(page.locator(".storage-label")).toHaveText(
    "Ishlaringiz saqlangan",
  );
  await page
    .getByRole("button", { name: "Uchta katta dalil: tahrirlash", exact: true })
    .click();
  await editor(page)
    .getByLabel("Haqiqiy natija *", { exact: true })
    .fill("Yana tekshirildi, uchta screenshot mavjud.");
  await expect(editor(page).getByRole("status")).toContainText(
    "Qoralama shu brauzer",
  );
  await nav(page, "Demo do‘kon").click();
  await nav(page, /^Bug-report/).click();
  await expect(page.locator(".workspace-evidence")).toHaveCount(3);
  await expect(
    editor(page).getByLabel("Haqiqiy natija *", { exact: true }),
  ).toHaveValue("Yana tekshirildi, uchta screenshot mavjud.");
  await expect(editor(page).getByRole("status")).toContainText(
    "Qoralama shu brauzer",
  );
  const length = await page.evaluate(() =>
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("qa-lab-draft"))
      .reduce((sum, k) => sum + sessionStorage.getItem(k).length, 0),
  );
  expect(length).toBeLessThan(4_000_000);
});

test("blocked draft storage reports the limit and still allows saving the real record", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("qa-lab-draft-v1:"))
        throw new DOMException("Storage full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await open(page);
  await newChecklist(page);
  await editor(page)
    .getByLabel("Sarlavha *", { exact: true })
    .fill("Qoralama kvotasi to‘lgan holat");
  await expect(editor(page).getByRole("status")).toContainText(
    "Qoralamani vaqtincha saqlab bo‘lmadi",
  );
  await editor(page)
    .getByRole("button", { name: "Saqlash", exact: true })
    .click();
  await expect(page.locator(".workspace-record")).toHaveCount(1);
  await expect(page.locator(".storage-label")).toHaveText(
    "Ishlaringiz saqlangan",
  );
});

for (const remoteAction of ["updated", "deleted"]) {
  test(`a locally edited report survives ${remoteAction} saved data as a new unsaved copy`, async ({
    page,
  }) => {
    await open(page);
    await nav(page, /^Bug-report/).click();
    await page
      .getByRole("button", { name: "Bug report yozish", exact: true })
      .first()
      .click();
    await editor(page)
      .getByLabel("Sarlavha *", { exact: true })
      .fill("Parallel report");
    await editor(page)
      .getByLabel("Takrorlash qadamlari *", { exact: true })
      .fill("1. Katalogni oching.");
    await editor(page)
      .getByLabel("Kutilgan natija *", { exact: true })
      .fill("Mahsulot topiladi.");
    await editor(page)
      .getByLabel("Haqiqiy natija *", { exact: true })
      .fill("Dastlabki dalil.");
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jKFkAAAAASUVORK5CYII=",
      "base64",
    );
    await page
      .locator(".workspace input[type=file]")
      .setInputFiles({ name: "local.png", mimeType: "image/png", buffer: png });
    await expect(page.locator(".workspace-evidence")).toHaveCount(1);
    await editor(page)
      .getByRole("button", { name: "Saqlash", exact: true })
      .click();
    await expect(page.locator(".storage-label")).toHaveText(
      "Ishlaringiz saqlangan",
    );
    await page
      .getByRole("button", { name: "Parallel report: tahrirlash", exact: true })
      .click();
    await editor(page)
      .getByLabel("Haqiqiy natija *", { exact: true })
      .fill("Bu oynadagi tugallanmagan dalil.");
    await nav(page, "Demo do‘kon").click();
    await expect(page.locator(".storage-label")).toHaveText(
      "Ishlaringiz saqlangan",
    );
    // Simulate the newer saved snapshot loaded during conflict recovery. This
    // tab's sessionStorage intentionally retains its separate unsaved draft.
    const old = await page.evaluate(
      (action) =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open("qa-lab-workspace-v1", 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction("workspace", "readwrite");
            const store = tx.objectStore("workspace");
            const read = store.get("state");
            let original;
            read.onsuccess = () => {
              const data = read.result;
              const session = data.sessions.find((s) => s.id === data.activeId);
              original = structuredClone(session.reports[0]);
              if (action === "deleted") session.reports = [];
              else
                session.reports[0] = {
                  ...original,
                  actual: "Boshqa oynada saqlangan yangi dalil.",
                  updatedAt: "2026-10-08T01:00:00.000Z",
                };
              store.put(data, "state");
            };
            tx.oncomplete = () => {
              db.close();
              resolve(original);
            };
            tx.onerror = () => {
              db.close();
              reject(tx.error);
            };
          };
        }),
      remoteAction,
    );
    await page.reload();
    await nav(page, /^Bug-report/).click();
    await expect(page.locator(".workspace-recovery-note")).toContainText(
      "alohida nusxa sifatida tiklandi",
    );
    await expect(
      editor(page).getByLabel("Haqiqiy natija *", { exact: true }),
    ).toHaveValue("Bu oynadagi tugallanmagan dalil.");
    await expect(page.locator(".workspace-record")).toHaveCount(
      remoteAction === "updated" ? 1 : 0,
    );
    // The recovered copy remains recoverable through another navigation.
    await nav(page, "Demo do‘kon").click();
    await nav(page, /^Bug-report/).click();
    await expect(page.locator(".workspace-recovery-note")).toBeVisible();
    await editor(page)
      .getByRole("button", { name: "Saqlash", exact: true })
      .click();
    await expect(page.locator(".storage-label")).toHaveText(
      "Ishlaringiz saqlangan",
    );
    const reports = await page.evaluate(
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
              resolve(
                q.result.sessions.find((s) => s.id === q.result.activeId)
                  .reports,
              );
            };
            q.onerror = () => reject(q.error);
          };
        }),
    );
    const recovered = reports.find(
      (item) => item.actual === "Bu oynadagi tugallanmagan dalil.",
    );
    expect(recovered.id).not.toBe(old.id);
    expect(recovered.evidence[0].id).not.toBe(old.evidence[0].id);
    expect(recovered.evidence[0].dataUrl).toBe(old.evidence[0].dataUrl);
    expect(reports).toHaveLength(remoteAction === "updated" ? 2 : 1);
    if (remoteAction === "updated")
      expect(reports.find((item) => item.id === old.id).actual).toBe(
        "Boshqa oynada saqlangan yangi dalil.",
      );
    else expect(reports.some((item) => item.id === old.id)).toBe(false);
    await page.reload();
    await nav(page, /^Bug-report/).click();
    await expect(editor(page)).toHaveCount(0);
    await expect(page.locator(".workspace-record")).toHaveCount(reports.length);
  });
}
