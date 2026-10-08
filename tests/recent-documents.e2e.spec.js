import { test, expect } from "@playwright/test";

const saved = (page) =>
  expect(page.locator(".storage-label")).toHaveText("Ishlaringiz saqlangan");
const nav = (page, name) =>
  page.locator(".sidebar").getByRole("button", { name }).click();
const title = (page) =>
  page.locator(".workspace-editor").getByLabel("Sarlavha *", { exact: true });
async function state(page) {
  await saved(page);
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("qa-lab-workspace-v1", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const query = db
            .transaction("workspace")
            .objectStore("workspace")
            .get("state");
          query.onerror = () => reject(query.error);
          query.onsuccess = () => {
            db.close();
            resolve(query.result);
          };
        };
      }),
  );
}
const active = (data) =>
  data.sessions.find((session) => session.id === data.activeId);
async function setup(page) {
  await page.goto("/");
  const original = active(await state(page));
  const session = {
    ...original,
    id: "recent-documents-fixture",
    name: "Recent document navigation",
  };
  for (const kind of ["cases", "reports"])
    session[kind] = Array.from({ length: 61 }, (_, i) => ({
      id: `${kind}-recent-${i + 1}`,
      title: `${kind} document ${i + 1}`,
      expected: "Talab bajariladi.",
      actual: "Tekshirildi.",
      steps: "1. Ochish\n2. Tekshirish",
      status: kind === "reports" ? "Open" : "Passed",
      priority: "P2",
      updatedAt: new Date(Date.UTC(2026, 9, 1, 0, 0, i)).toISOString(),
      ...(kind === "reports" ? { severity: "Medium", evidence: [] } : {}),
    }));
  await nav(page, "Mashqlar tarixi");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "recent-documents.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 1,
          activeId: session.id,
          sessions: [session],
        }),
      ),
    });
  await expect(page.locator(".toast")).toContainText("1 ta mashq qo‘shildi");
  await page
    .locator(".history-card")
    .filter({
      has: page.getByRole("heading", { name: session.name, exact: true }),
    })
    .getByRole("button", { name: "Mashqni davom ettirish" })
    .click();
  await saved(page);
}
async function openRecent(page, kind, name) {
  await nav(page, "Umumiy ko‘rinish");
  await page
    .getByRole("group", { name: "Hujjat turi" })
    .getByRole("button", {
      name: kind === "reports" ? /^Bug-report/ : /^Test-case/,
    })
    .click();
  await page
    .locator(".dashboard-table")
    .getByRole("button", { name, exact: true })
    .click();
}

test("recent case and report buttons open the exact record beyond page one and save without adding a copy", async ({
  page,
}) => {
  await setup(page);
  for (const kind of ["cases", "reports"]) {
    await openRecent(page, kind, `${kind} document 61`);
    await expect(title(page)).toHaveValue(`${kind} document 61`);
    await expect(title(page)).toBeFocused();
    await expect(
      page.getByRole("navigation", {
        name: "Yozuvlar sahifalari",
        exact: true,
      }),
    ).toContainText("51–61 / 61 yozuv");
    await expect(
      page.getByRole("heading", { name: `${kind} document 61`, exact: true }),
    ).toBeVisible();
    await title(page).fill(`${kind} latest edited`);
    await page
      .getByRole("button", { name: "O‘zgarishlarni saqlash", exact: true })
      .click();
    const result = active(await state(page));
    expect(result[kind]).toHaveLength(61);
    expect(
      result[kind].find((item) => item.id === `${kind}-recent-61`).title,
    ).toBe(`${kind} latest edited`);
  }
});

test("reopening a recent document resumes its dirty draft; a different record requires a discard decision", async ({
  page,
}) => {
  await setup(page);
  await openRecent(page, "cases", "cases document 61");
  await title(page).fill("Unsaved latest case");
  const dialogs = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.message());
    dialog.dismiss();
  });
  await openRecent(page, "cases", "cases document 61");
  await expect(title(page)).toHaveValue("Unsaved latest case");
  await expect(title(page)).toBeFocused();
  expect(dialogs).toHaveLength(0);
  await openRecent(page, "cases", "cases document 60");
  await expect(title(page)).toHaveValue("Unsaved latest case");
  expect(dialogs).toHaveLength(1);
  expect(
    active(await state(page)).cases.find(
      (item) => item.id === "cases-recent-61",
    ).title,
  ).toBe("cases document 61");
  page.removeAllListeners("dialog");
  await page
    .getByRole("button", { name: "O‘zgarishlarni saqlash", exact: true })
    .click();
  expect(
    active(await state(page)).cases.find(
      (item) => item.id === "cases-recent-61",
    ).title,
  ).toBe("Unsaved latest case");
  await openRecent(page, "cases", "Unsaved latest case");
  await title(page).fill("Deliberately discarded change");
  page.once("dialog", (dialog) => dialog.accept());
  await openRecent(page, "cases", "cases document 60");
  await expect(title(page)).toHaveValue("cases document 60");
  await page
    .getByRole("button", { name: "Bekor qilish", exact: true })
    .click();
  await expect(page.locator(".workspace-editor")).toHaveCount(0);
  expect(
    active(await state(page)).cases.find(
      (item) => item.id === "cases-recent-60",
    ).title,
  ).toBe("cases document 60");
  await openRecent(page, "cases", "cases document 60");
  await title(page).fill("Saved selected case60");
  await page
    .getByRole("button", { name: "O‘zgarishlarni saqlash", exact: true })
    .click();
  const result = active(await state(page));
  expect(result.cases).toHaveLength(61);
  expect(result.cases.find((item) => item.id === "cases-recent-60").title).toBe(
    "Saved selected case60",
  );
  expect(result.cases.find((item) => item.id === "cases-recent-61").title).toBe(
    "Unsaved latest case",
  );
});

test("a new unsaved report is preserved when declining to open a recent saved report", async ({
  page,
}) => {
  await setup(page);
  await nav(page, /^Bug-report/);
  await page
    .getByRole("button", { name: "Bug report yozish", exact: true })
    .click();
  await title(page).fill("New report should survive");
  page.once("dialog", (dialog) => dialog.dismiss());
  await openRecent(page, "reports", "reports document 61");
  await expect(title(page)).toHaveValue("New report should survive");
  await expect(
    page.getByRole("button", { name: "Saqlash", exact: true }),
  ).toBeVisible();
  expect(active(await state(page)).reports).toHaveLength(61);
});
