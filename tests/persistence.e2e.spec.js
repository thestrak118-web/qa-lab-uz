import { test, expect } from "@playwright/test";

const saved = (page) =>
  expect(page.locator(".storage-label")).toHaveText("Ishlaringiz saqlangan");
const nav = (page, name) =>
  page.locator(".sidebar").getByRole("button", { name, exact: true }).click();
async function state(page) {
  return page.evaluate(async () => {
    const { loadWorkspace } = await import("/src/lib/storage.js");
    return loadWorkspace();
  });
}
const active = (value) => value.sessions.find((s) => s.id === value.activeId);

test("an older tab cannot overwrite another tab; both copies remain recoverable", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await saved(page);
  const second = await context.newPage();
  await second.goto("/");
  await saved(second);
  await nav(page, "Natija va retest");
  await page
    .getByLabel("Tester xulosasi", { exact: true })
    .fill("Birinchi oynadagi muhim QA xulosasi.");
  await saved(page);
  await nav(second, "Talablar");
  await expect(second.locator(".error-banner")).toContainText("Boshqa oynada");
  await expect(second.locator(".storage-label")).toHaveText(
    "Saqlanmagan o‘zgarishlar bor",
  );
  expect(active(await state(page)).notes).toBe(
    "Birinchi oynadagi muhim QA xulosasi.",
  );
  const downloadPromise = second.waitForEvent("download");
  await second
    .getByRole("button", {
      name: "Nusxamni yuklab, yangi ishni ochish",
      exact: true,
    })
    .click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let raw = "";
  for await (const chunk of stream) raw += chunk.toString();
  expect(active(JSON.parse(raw)).requirementsViewed).toBe(true);
  await expect(
    second.getByRole("heading", { name: "Loyiha ko‘rinishi", exact: true }),
  ).toBeVisible();
  await expect(second.locator(".error-banner")).toHaveCount(0);
  await nav(second, "Natija va retest");
  await expect(
    second.getByLabel("Tester xulosasi", { exact: true }),
  ).toHaveValue("Birinchi oynadagi muhim QA xulosasi.");
  await second
    .getByLabel("Tester xulosasi", { exact: true })
    .fill("Eng yangi nusxada davom ettirildi.");
  await saved(second);
  expect(active(await state(second)).notes).toBe(
    "Eng yangi nusxada davom ettirildi.",
  );
});

test("rapid edits are serialized and the latest text survives reload", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await nav(page, "Natija va retest");
  const field = page.getByLabel("Tester xulosasi", { exact: true });
  const text =
    "Savat, qidiruv va checkout tekshirildi. Yakuniy xulosa saqlanadi.";
  await field.pressSequentially(text, { delay: 1 });
  await saved(page);
  expect(active(await state(page)).notes).toBe(text);
  await page.reload();
  await saved(page);
  await nav(page, "Natija va retest");
  await expect(field).toHaveValue(text);
});

test("continuous typing coalesces large-workspace writes and flushes on a pause", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await nav(page, "Natija va retest");
  await page.evaluate(() => {
    window.auditStateWrites = 0;
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === "workspace" && key === "state")
        window.auditStateWrites++;
      return put.call(this, value, key);
    };
  });
  const text = "Har bir harf uchun katta zaxira qayta yozilmaydi.";
  await page
    .getByLabel("Tester xulosasi", { exact: true })
    .pressSequentially(text, { delay: 20 });
  await saved(page);
  expect(active(await state(page)).notes).toBe(text);
  expect(
    await page.evaluate(() => window.auditStateWrites),
  ).toBeLessThanOrEqual(3);
});

test("a failed write retains work and can be retried without reloading", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    let fail = true;
    IDBDatabase.prototype.transaction = function (names, mode, ...rest) {
      if (mode === "readwrite" && fail) {
        fail = false;
        throw new DOMException(
          "Test storage quota failure",
          "QuotaExceededError",
        );
      }
      return original.call(this, names, mode, ...rest);
    };
  });
  await nav(page, "Natija va retest");
  await page
    .getByLabel("Tester xulosasi", { exact: true })
    .fill("Xatodan keyin ham yo‘qolmaydigan matn.");
  await expect(page.locator(".error-banner")).toContainText(
    "saqlash muvaffaqiyatsiz",
  );
  await expect(page.getByLabel("Tester xulosasi", { exact: true })).toHaveValue(
    "Xatodan keyin ham yo‘qolmaydigan matn.",
  );
  await page
    .getByRole("button", { name: "Saqlashni qayta urinish", exact: true })
    .click();
  await saved(page);
  await expect(page.locator(".error-banner")).toHaveCount(0);
  expect(active(await state(page)).notes).toBe(
    "Xatodan keyin ham yo‘qolmaydigan matn.",
  );
});

test("an unreadable saved workspace is preserved and new temporary work can be exported", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.evaluate(async () => {
    const { saveWorkspace } = await import("/src/lib/storage.js");
    await saveWorkspace({ original: "do not overwrite this evidence" });
  });
  await page.reload();
  await expect(page.locator(".error-banner")).toContainText(
    "Eski ma’lumot ustiga yozilmaydi",
  );
  await nav(page, "Natija va retest");
  await page
    .getByLabel("Tester xulosasi", { exact: true })
    .fill("Vaqtincha tiklash uchun yozuv.");
  expect(await state(page)).toEqual({
    original: "do not overwrite this evidence",
  });
  const promise = page.waitForEvent("download");
  await page
    .locator(".error-banner")
    .getByRole("button", { name: "Zaxirani yuklash", exact: true })
    .click();
  const download = await promise,
    stream = await download.createReadStream();
  let raw = "";
  for await (const chunk of stream) raw += chunk.toString();
  expect(active(JSON.parse(raw)).notes).toBe("Vaqtincha tiklash uchun yozuv.");
});

test("edits made during recovery are kept when the database read finishes later", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await saved(page);
  const second = await context.newPage();
  await second.goto("/");
  await saved(second);
  await nav(page, "Natija va retest");
  await page
    .getByLabel("Tester xulosasi", { exact: true })
    .fill("Birinchi oynadagi saqlangan xulosa.");
  await saved(page);
  await nav(second, "Natija va retest");
  const localNotes = second.getByLabel("Tester xulosasi", { exact: true });
  await localNotes.fill("Tiklashdan oldingi mahalliy yozuv.");
  await expect(second.locator(".error-banner")).toContainText("Boshqa oynada");
  await second.evaluate(() => {
    const prototype = IDBTransaction.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "oncomplete");
    window.__qaRecoveryReadCompleted = false;
    Object.defineProperty(prototype, "oncomplete", {
      ...descriptor,
      set(handler) {
        return descriptor.set.call(
          this,
          this.mode === "readonly"
            ? function (event) {
                setTimeout(() => {
                  handler.call(this, event);
                  setTimeout(() => {
                    window.__qaRecoveryReadCompleted = true;
                  }, 0);
                }, 1200);
              }
            : handler,
        );
      },
    });
  });
  const downloadPromise = second.waitForEvent("download");
  await second
    .getByRole("button", {
      name: "Nusxamni yuklab, yangi ishni ochish",
      exact: true,
    })
    .click();
  const download = await downloadPromise;
  await localNotes.fill("Tiklash kutilayotganda yozilgan eng yangi xulosa.");
  const stream = await download.createReadStream();
  let raw = "";
  for await (const chunk of stream) raw += chunk.toString();
  expect(active(JSON.parse(raw)).notes).toBe(
    "Tiklashdan oldingi mahalliy yozuv.",
  );
  await second.waitForFunction(() => window.__qaRecoveryReadCompleted);
  await expect(localNotes).toHaveValue(
    "Tiklash kutilayotganda yozilgan eng yangi xulosa.",
  );
  await expect(second.locator(".error-banner")).toBeVisible();
  expect(active(await state(page)).notes).toBe(
    "Birinchi oynadagi saqlangan xulosa.",
  );
});

test("an asynchronous IndexedDB request error keeps recovery controls and can be retried", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await saved(page);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    const add = IDBObjectStore.prototype.add;
    let failOnce = true;
    IDBObjectStore.prototype.put = function (value, key) {
      if (key === "state" && failOnce) {
        failOnce = false;
        // The key already exists: this fails asynchronously in a real request,
        // when transaction.error may still be null in the bubbling error event.
        return add.call(this, value, key);
      }
      return put.call(this, value, key);
    };
  });
  await nav(page, "Natija va retest");
  const notes = page.getByLabel("Tester xulosasi", { exact: true });
  await notes.fill("So‘rov xatosidan keyin ham saqlanishi kerak.");
  await expect(page.locator(".error-banner")).toContainText(
    "saqlash muvaffaqiyatsiz",
  );
  await expect(notes).toHaveValue(
    "So‘rov xatosidan keyin ham saqlanishi kerak.",
  );
  await page
    .getByRole("button", { name: "Saqlashni qayta urinish", exact: true })
    .click();
  await saved(page);
  expect(active(await state(page)).notes).toBe(
    "So‘rov xatosidan keyin ham saqlanishi kerak.",
  );
  expect(errors).toEqual([]);
});
