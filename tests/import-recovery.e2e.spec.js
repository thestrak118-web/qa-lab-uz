import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const saved = (page) =>
  expect(page.locator(".storage-label")).toHaveText("Ishlaringiz saqlangan");
async function open(page) {
  await page.goto("/");
  await saved(page);
}
async function nav(page, name) {
  const menu = page.getByRole("button", { name: "Menyu", exact: true });
  if (
    (await menu.isVisible()) &&
    !(await page.locator(".sidebar").getAttribute("class")).includes("open")
  )
    await menu.click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name, exact: true })
    .click();
}
async function state(page) {
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
          q.onerror = () => reject(q.error);
        };
      }),
  );
}
const active = (data) => data.sessions.find((s) => s.id === data.activeId);
async function chooseImport(page, file, asCopy = false) {
  const promise = page.waitForEvent("filechooser");
  await page
    .getByRole("button", {
      name: asCopy ? "JSON nusxa sifatida" : "JSON import",
      exact: true,
    })
    .click();
  await (await promise).setFiles(file);
}

test("a conflict backup can be restored as a separate exercise without replacing newer work", async ({
  page,
  context,
}) => {
  await open(page);
  const original = active(await state(page));
  const second = await context.newPage();
  await open(second);
  await nav(page, "Natija va retest");
  await page
    .getByLabel("Tester xulosasi", { exact: true })
    .fill("Boshqa oynadagi saqlangan ish");
  await saved(page);
  await nav(second, "Natija va retest");
  await second
    .getByLabel("Tester xulosasi", { exact: true })
    .fill("Konfliktda qolgan mahalliy ish");
  await expect(second.locator(".error-banner")).toContainText("Boshqa oynada");
  const dp = second.waitForEvent("download");
  await second
    .getByRole("button", {
      name: "Nusxamni yuklab, yangi ishni ochish",
      exact: true,
    })
    .click();
  const download = await dp;
  let raw = "";
  for await (const chunk of await download.createReadStream())
    raw += chunk.toString("utf8");
  await expect(second.locator(".error-banner")).toHaveCount(0);
  await saved(second);
  await nav(second, "Mashqlar tarixi");
  await chooseImport(
    second,
    {
      name: "conflict-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    },
    true,
  );
  await expect(second.locator(".toast")).toContainText(
    "1 ta alohida nusxa qo‘shildi",
  );
  const result = await state(second);
  expect(result.sessions).toHaveLength(2);
  expect(result.activeId).toBe(original.id);
  expect(result.sessions.find((s) => s.id === original.id).notes).toBe(
    "Boshqa oynadagi saqlangan ish",
  );
  const copy = result.sessions.find((s) => s.id !== original.id);
  expect(copy.notes).toBe("Konfliktda qolgan mahalliy ish");
  expect(copy.name).toBe(original.name + " — import nusxa");
  await second
    .locator(".history-card")
    .filter({
      has: second.getByRole("heading", { name: copy.name, exact: true }),
    })
    .getByRole("button", { name: "Mashqni davom ettirish" })
    .click();
  await nav(second, "Natija va retest");
  await expect(
    second.getByLabel("Tester xulosasi", { exact: true }),
  ).toHaveValue("Konfliktda qolgan mahalliy ish");
});

test("a 52 MiB actual export round-trips after confirmation; cancellation and mobile dialogs are safe", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  await open(page);
  const initial = await state(page);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jKFkAAAAASUVORK5CYII=",
    "base64",
  );
  const image =
    "data:image/png;base64," +
    Buffer.concat([png, Buffer.alloc(1024 * 1024 - png.length)]).toString(
      "base64",
    );
  const session = {
    ...active(initial),
    id: "large-backup-roundtrip",
    name: "Katta zaxira",
    reports: [],
  };
  for (let i = 0; i < 13; i++)
    session.reports.push({
      id: `large-report-${i}`,
      title: `Dalil ${i}`,
      expected: "Mahsulot topiladi",
      actual: "Natija mos emas",
      steps: "1. Katalogni tekshiring",
      status: "Open",
      severity: "Medium",
      priority: "P2",
      evidence: [0, 1, 2].map((j) => ({
        id: `large-image-${i}-${j}`,
        name: `evidence-${i}-${j}.png`,
        type: "image/png",
        dataUrl: image,
      })),
    });
  const raw = JSON.stringify({
    version: 1,
    activeId: session.id,
    sessions: [session],
  });
  expect(Buffer.byteLength(raw)).toBeGreaterThan(50 * 1024 * 1024);
  const file = testInfo.outputPath("large-input.json");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, raw);
  await page.setViewportSize({ width: 320, height: 740 });
  await nav(page, "Mashqlar tarixi");
  for (const theme of ["light", "dark"]) {
    await page.getByLabel("Rang rejimi", { exact: true }).selectOption(theme);
    for (const name of ["JSON import", "JSON nusxa sifatida", "JSON eksport"])
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toBeVisible();
    await chooseImport(page, file);
    const modal = page.getByRole("dialog", {
      name: "Katta zaxirani import qilish",
    });
    await expect(modal).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await modal
      .getByRole("button", { name: "Bekor qilish", exact: true })
      .click();
    await expect(modal).toHaveCount(0);
    expect(await state(page)).toEqual(initial);
  }
  await page.evaluate(() => {
    const text = File.prototype.text;
    File.prototype.text = async function () {
      await new Promise((r) => setTimeout(r, 500));
      return text.call(this);
    };
  });
  await chooseImport(page, file);
  await page
    .getByRole("dialog", { name: "Katta zaxirani import qilish" })
    .getByRole("button", { name: "Importni davom ettirish", exact: true })
    .click();
  await expect(
    page.getByText("Zaxira o‘qilmoqda va tekshirilmoqda…", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "JSON import", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "JSON nusxa sifatida", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".toast")).toContainText("1 ta mashq qo‘shildi", {
    timeout: 60_000,
  });
  await saved(page);
  const exportedPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON eksport", exact: true }).click();
  const exported = await exportedPromise;
  const exportedPath = testInfo.outputPath("large-actual-export.json");
  await exported.saveAs(exportedPath);
  const freshContext = await browser.newContext();
  const fresh = await freshContext.newPage();
  await open(fresh);
  await nav(fresh, "Mashqlar tarixi");
  await chooseImport(fresh, exportedPath);
  await expect(
    fresh.getByRole("dialog", { name: "Katta zaxirani import qilish" }),
  ).toBeVisible();
  await fresh
    .getByRole("button", { name: "Importni davom ettirish", exact: true })
    .click();
  await expect(fresh.locator(".toast")).toContainText("2 ta mashq qo‘shildi", {
    timeout: 60_000,
  });
  await saved(fresh);
  const summary = await fresh.evaluate(
    (expected) =>
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
            const s = q.result.sessions.find(
              (item) => item.id === "large-backup-roundtrip",
            );
            db.close();
            resolve({
              reports: s.reports.length,
              images: s.reports.flatMap((report) => report.evidence).length,
              bytesMatch: s.reports.every((report) =>
                report.evidence.every((item) => item.dataUrl === expected),
              ),
            });
          };
          q.onerror = () => reject(q.error);
        };
      }),
    image,
  );
  expect(summary).toEqual({ reports: 13, images: 39, bytesMatch: true });
  await freshContext.close();
});
