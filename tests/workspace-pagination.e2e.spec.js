import { test, expect } from "@playwright/test";

async function seedDocuments(page, count = 101) {
  await page.goto("/");
  await expect(page.locator(".storage-label")).toHaveText(
    "Ishlaringiz saqlangan",
  );
  await page.evaluate(async (count) => {
    const { loadWorkspace, saveWorkspace } =
      await import("/src/lib/storage.js");
    const data = await loadWorkspace();
    const session = data.sessions.find((item) => item.id === data.activeId);
    for (const kind of ["checklist", "cases", "reports"])
      session[kind] = Array.from({ length: count }, (_, index) => ({
        id: `${kind}-pagination-${index + 1}`,
        title: `${kind} row ${String(index + 1).padStart(3, "0")}`,
        expected: "Talab bajariladi.",
        actual: "Tekshirildi.",
        status: kind === "reports" ? "Open" : index % 2 ? "Passed" : "Not run",
        priority: "P2",
        steps: "Mahsulotni oching va tekshiring.",
        ...(kind === "reports" ? { severity: "Medium", evidence: [] } : {}),
      }));
    await saveWorkspace(data);
  }, count);
  await page.reload();
  await expect(page.locator(".storage-label")).toHaveText(
    "Ishlaringiz saqlangan",
  );
}
async function nav(page, label) {
  if (
    await page.getByRole("button", { name: "Menyu", exact: true }).isVisible()
  )
    await page.getByRole("button", { name: "Menyu", exact: true }).click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: new RegExp(`^${label}`) })
    .click();
}
const pagination = (page) =>
  page.getByRole("navigation", { name: "Yozuvlar sahifalari", exact: true });

test("all document types paginate after filtering and searches include the final row", async ({
  page,
}) => {
  await seedDocuments(page, 123);
  for (const [label, kind] of [
    ["Checklist", "checklist"],
    ["Test-case’lar", "cases"],
    ["Bug-report’lar", "reports"],
  ]) {
    await nav(page, label);
    await expect(page.locator(".workspace-record")).toHaveCount(50);
    await expect(pagination(page)).toContainText("1–50 / 123 yozuv");
    await expect(
      pagination(page).getByRole("button", {
        name: "Oldingi yozuvlar sahifasi",
      }),
    ).toBeDisabled();
    await page
      .getByRole("navigation", {
        name: "Yozuvlar sahifalari, ro‘yxat oxiri",
        exact: true,
      })
      .getByRole("button", { name: "Keyingi yozuvlar sahifasi" })
      .click();
    await expect(pagination(page)).toContainText("51–100 / 123 yozuv");
    await expect(page.locator(".workspace-header h2")).toBeFocused();
    await pagination(page)
      .getByRole("button", { name: "Oxirgi yozuvlar sahifasi" })
      .click();
    await expect(page.locator(".workspace-record")).toHaveCount(23);
    await expect(pagination(page)).toContainText("101–123 / 123 yozuv");
    await expect(
      pagination(page).getByRole("button", {
        name: "Keyingi yozuvlar sahifasi",
      }),
    ).toBeDisabled();
    await page
      .getByRole("textbox", { name: "Yozuvlarni qidirish" })
      .fill("row 123");
    await expect(page.locator(".workspace-record")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: `${kind} row 123`, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: `${kind} row 123: holati`, exact: true })
      .selectOption(kind === "reports" ? "Closed" : "Blocked");
    await page.getByRole("textbox", { name: "Yozuvlarni qidirish" }).fill("");
    await expect(pagination(page)).toContainText("1–50 / 123 yozuv");
    if (kind !== "reports") {
      await page
        .getByRole("combobox", { name: "Holat bo‘yicha filtrlash" })
        .selectOption("Passed");
      await expect(pagination(page)).toContainText("1–50 / 61 yozuv");
      await pagination(page)
        .getByRole("button", { name: "Keyingi yozuvlar sahifasi" })
        .click();
      await expect(page.locator(".workspace-record")).toHaveCount(11);
      await page
        .getByRole("combobox", { name: "Holat bo‘yicha filtrlash" })
        .selectOption("Blocked");
      await expect(page.locator(".workspace-record")).toHaveCount(1);
      await expect(
        page.getByRole("heading", { name: `${kind} row 123`, exact: true }),
      ).toBeVisible();
    }
  }
});

test("save, rename, delete and undo keep the affected document reachable across page boundaries", async ({
  page,
}) => {
  await seedDocuments(page);
  await nav(page, "Checklist");
  await pagination(page)
    .getByRole("button", { name: "Oxirgi yozuvlar sahifasi" })
    .click();
  await page
    .getByRole("button", { name: "checklist row 101: o‘chirish", exact: true })
    .click();
  await expect(pagination(page)).toContainText("51–100 / 100 yozuv");
  await page.getByRole("button", { name: "Qaytarish", exact: true }).click();
  await expect(pagination(page)).toContainText("101–101 / 101 yozuv");
  await expect(
    page.getByRole("heading", { name: "checklist row 101", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Yozuvlarni qidirish" })
    .fill("row 101");
  await page
    .getByRole("button", { name: "checklist row 101: tahrirlash", exact: true })
    .click();
  await page
    .getByLabel("Sarlavha *", { exact: true })
    .fill("Renamed final document");
  await page
    .getByRole("button", { name: "O‘zgarishlarni saqlash", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Yozuvlarni qidirish" }),
  ).toHaveValue("");
  await expect(pagination(page)).toContainText("101–101 / 101 yozuv");
  await expect(
    page.getByRole("heading", { name: "Renamed final document", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tekshiruv qo‘shish", exact: true })
    .click();
  await page
    .getByLabel("Sarlavha *", { exact: true })
    .fill("New document after page 2");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect(pagination(page)).toContainText("101–102 / 102 yozuv");
  await expect(
    page.getByRole("heading", {
      name: "New document after page 2",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Yozuvlarni qidirish" })
    .fill("New document");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV eksport", exact: true }).click();
  const download = await downloadPromise;
  let csv = "";
  for await (const chunk of await download.createReadStream())
    csv += chunk.toString();
  expect(csv).toContain("checklist row 001");
  expect(csv).toContain("New document after page 2");
  expect(csv.trim().split("\r\n")).toHaveLength(103);
  await expect(page.locator(".storage-label")).toHaveText(
    "Ishlaringiz saqlangan",
  );
  await page.reload();
  await nav(page, "Checklist");
  await pagination(page)
    .getByRole("button", { name: "Oxirgi yozuvlar sahifasi" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "New document after page 2",
      exact: true,
    }),
  ).toBeVisible();
});

test("pagination fits a 320px screen and reaches the last saved row", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await seedDocuments(page);
  await nav(page, "Checklist");
  await pagination(page)
    .getByRole("button", { name: "Oxirgi yozuvlar sahifasi" })
    .click();
  await expect(
    page.getByRole("heading", { name: "checklist row 101", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "checklist row 101: holati", exact: true })
    .selectOption("Passed");
  await expect(page.locator(".storage-label")).toHaveText(
    "Ishlaringiz saqlangan",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  await pagination(page)
    .getByRole("button", { name: "Birinchi yozuvlar sahifasi" })
    .click();
  await expect(
    page.getByRole("heading", { name: "checklist row 001", exact: true }),
  ).toBeVisible();
});

test("shared-prefix and UUID document references stay distinct through filtering, paging and reordering", async ({
  page,
}) => {
  await seedDocuments(page);
  // These two valid IDs were generated by crypto.randomUUID(); their old
  // six-character display prefixes collide even though the full IDs differ.
  await page.evaluate(async () => {
    const { loadWorkspace, saveWorkspace } =
      await import("/src/lib/storage.js");
    const data = await loadWorkspace();
    const session = data.sessions.find((item) => item.id === data.activeId);
    session.checklist[0].id = "222151bd-bc01-4c15-846a-bac29a164ca1";
    session.checklist[1].id = "22215130-b24d-44e7-a7c1-377e1275426d";
    // A second pair has the same compact checksum. Collection-level
    // disambiguation must still keep the displayed references unique.
    session.checklist[2].id = "fd7adee0-6258-4340-a31a-86877d04a39e";
    session.checklist[3].id = "b26cf4d2-80be-4a6b-a01b-fa24a6ff280c";
    await saveWorkspace(data);
  });
  await page.reload();
  await nav(page, "Checklist");
  const references = async () =>
    page
      .locator(".workspace-record")
      .evaluateAll((rows) =>
        Object.fromEntries(
          rows.map((row) => [
            row.querySelector("h3").textContent,
            row.querySelector(".workspace-record-index").textContent,
          ]),
        ),
      );
  const first = await references();
  expect(new Set(Object.values(first)).size).toBe(50);
  await pagination(page)
    .getByRole("button", { name: "Oxirgi yozuvlar sahifasi" })
    .click();
  const last = (await references())["checklist row 101"];
  expect(Object.values(first)).not.toContain(last);
  await page
    .getByRole("textbox", { name: "Yozuvlarni qidirish" })
    .fill("row 101");
  expect((await references())["checklist row 101"]).toBe(last);
  await page
    .getByRole("combobox", { name: "checklist row 101: holati", exact: true })
    .selectOption("Blocked");
  await expect(page.locator(".storage-label")).toHaveText(
    "Ishlaringiz saqlangan",
  );
  const reordered = await page.evaluate(async () => {
    const { loadWorkspace, saveWorkspace } =
      await import("/src/lib/storage.js");
    const data = await loadWorkspace();
    const session = data.sessions.find((item) => item.id === data.activeId);
    const result = {
      lastId: session.checklist.at(-1).id,
      lastStatus: session.checklist.at(-1).status,
      firstStatus: session.checklist[0].status,
    };
    session.checklist.reverse();
    await saveWorkspace(data);
    return result;
  });
  expect(reordered).toEqual({
    lastId: "checklist-pagination-101",
    lastStatus: "Blocked",
    firstStatus: "Not run",
  });
  await page.reload();
  await nav(page, "Checklist");
  expect((await references())["checklist row 101"]).toBe(last);
  await page
    .getByRole("textbox", { name: "Yozuvlarni qidirish" })
    .fill("row 001");
  expect((await references())["checklist row 001"]).toBe(
    first["checklist row 001"],
  );
  await page
    .getByRole("textbox", { name: "Yozuvlarni qidirish" })
    .fill("row 003");
  expect((await references())["checklist row 003"]).toBe(
    first["checklist row 003"],
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV eksport", exact: true }).click();
  let csv = "";
  for await (const chunk of await (await downloadPromise).createReadStream())
    csv += chunk.toString();
  expect(csv).toContain('"222151bd-bc01-4c15-846a-bac29a164ca1"');
  expect(csv).toContain('"checklist-pagination-101"');
});
