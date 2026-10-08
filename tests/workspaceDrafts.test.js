import test from "node:test";
import assert from "node:assert/strict";
import {
  draftKey,
  draftSnapshot,
  readDraft,
  writeDraft,
} from "../src/lib/workspaceDrafts.js";

function storage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}
const session = {
  id: "s1",
  scenario: { requirements: [{ id: "REQ-01" }] },
  checklist: [],
  cases: [],
  reports: [],
};
const draft = {
  id: "draft",
  title: "Unfinished work",
  expected: "Same result",
  actual: "",
  status: "Not run",
  requirementId: "REQ-01",
  checkId: "AT-01",
};
const value = {
  draft,
  editing: false,
  baseline: draftSnapshot({ ...draft, title: "" }),
  savedBaseline: "",
};

test("draft recovery is isolated by exercise and document collection", () => {
  const db = storage();
  assert.equal(writeDraft(db, "s1", "checklist", value), true);
  assert.deepEqual(readDraft(db, session, "checklist").draft, draft);
  assert.equal(readDraft(db, { ...session, id: "s2" }, "checklist"), null);
  assert.equal(readDraft(db, session, "cases"), null);
  writeDraft(db, "s1", "checklist", null);
  assert.equal(readDraft(db, session, "checklist"), null);
});

test("a stale editing draft is recovered as an explicit new copy instead of overwriting current work", () => {
  const db = storage();
  const saved = {
    ...draft,
    title: "Original record",
    updatedAt: "2026-10-08T00:00:00.000Z",
  };
  const current = { ...session, checklist: [saved] };
  writeDraft(db, "s1", "checklist", {
    ...value,
    editing: true,
    savedBaseline: draftSnapshot(saved),
  });
  assert.equal(readDraft(db, current, "checklist").draft.title, draft.title);
  const changed = { ...current, checklist: [{ ...saved, status: "Passed" }] };
  const restored = readDraft(db, changed, "checklist");
  assert.equal(restored.editing, false);
  assert.equal(restored.recovery.reason, "updated");
  assert.equal(restored.recovery.sourceId, draft.id);
  assert.notEqual(restored.draft.id, draft.id);
  assert.equal(restored.draft.title, draft.title);
  assert.equal(changed.checklist[0].status, "Passed");
  writeDraft(db, "s1", "checklist", restored);
  assert.equal(readDraft(db, changed, "checklist").draft.id, restored.draft.id);
});

test("a deleted record's local draft is preserved without resurrecting its old document or evidence IDs", () => {
  const db = storage();
  const evidence = {
    id: "old-evidence",
    name: "screen.png",
    type: "image/png",
    dataUrl: "data:image/png;base64,iVBORw0KGgo=",
  };
  const report = {
    ...draft,
    status: "Open",
    severity: "Medium",
    steps: "1. Open the shop",
    evidence: [evidence],
  };
  writeDraft(db, "s1", "reports", {
    draft: report,
    editing: true,
    baseline: draftSnapshot({ ...report, actual: "Before" }),
    savedBaseline: draftSnapshot(report),
  });
  const restored = readDraft(db, session, "reports");
  assert.equal(restored.editing, false);
  assert.equal(restored.recovery.reason, "deleted");
  assert.notEqual(restored.draft.id, report.id);
  assert.notEqual(restored.draft.evidence[0].id, evidence.id);
  assert.equal(restored.draft.evidence[0].dataUrl, evidence.dataUrl);
  assert.deepEqual(session.reports, []);
});

test("a saved new draft cannot be restored as a duplicate new record", () => {
  const db = storage();
  writeDraft(db, "s1", "checklist", value);
  assert.equal(
    readDraft(db, { ...session, checklist: [draft] }, "checklist"),
    null,
  );
  assert.equal(
    readDraft(
      db,
      {
        ...session,
        checklist: [{ ...draft, updatedAt: "2026-10-08T00:30:00.000Z" }],
      },
      "checklist",
    ),
    null,
  );
  const changed = readDraft(
    db,
    { ...session, checklist: [{ ...draft, actual: "Saved in another tab" }] },
    "checklist",
  );
  assert.notEqual(changed.draft.id, draft.id);
  assert.equal(changed.draft.actual, draft.actual);
  assert.equal(changed.recovery.reason, "updated");
});

test("unavailable storage and malformed recovery entries do not crash the editor", () => {
  const broken = {
    getItem: () => {
      throw new Error("Access denied");
    },
    setItem: () => {
      throw new Error("Quota");
    },
    removeItem: () => {
      throw new Error("Access denied");
    },
  };
  assert.equal(readDraft(broken, session, "checklist"), null);
  assert.equal(writeDraft(broken, "s1", "checklist", value), false);
  assert.equal(writeDraft(null, "s1", "checklist", value), false);
  const db = storage();
  for (const entry of [
    "{broken",
    "null",
    JSON.stringify({ version: 1, ...value, draft: { ...draft, title: null } }),
    JSON.stringify({
      version: 1,
      ...value,
      draft: { ...draft, status: "Invented" },
    }),
  ]) {
    db.setItem(draftKey("s1", "checklist"), entry);
    assert.equal(readDraft(db, session, "checklist"), null);
  }
});

test("large evidence is stored only once, not duplicated inside change baselines", () => {
  const photo = {
    id: "image1",
    name: "screen.png",
    type: "image/png",
    dataUrl: "data:image/png;base64," + "A".repeat(1_000_000),
  };
  const value = { ...draft, evidence: [photo] };
  assert.ok(draftSnapshot(value).length < 500);
  assert.notEqual(
    draftSnapshot(value),
    draftSnapshot({ ...value, title: "Edited" }),
  );
  assert.notEqual(
    draftSnapshot(value),
    draftSnapshot({ ...value, evidence: [{ ...photo, id: "image2" }] }),
  );
});
