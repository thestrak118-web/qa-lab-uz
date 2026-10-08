import test from "node:test";
import assert from "node:assert/strict";
import {
  prepareImportedSessions,
  mergeImportedSessions,
} from "../src/lib/importWorkspace.js";
const original = {
  id: "existing",
  name: "QA exercise",
  notes: "Remote saved work",
  checklist: [{ id: "doc1" }],
  reports: [{ id: "report1", evidence: [{ id: "image1" }] }],
  findingLinks: { "BUG-01": "report1" },
  assessments: [{ id: "attempt1", comparisons: [{ id: "doc1" }] }],
};
const current = { version: 1, activeId: "existing", sessions: [original] };

test("ordinary imports remain idempotent and never replace a same-ID exercise", () => {
  const input = {
    sessions: [
      { ...original, notes: "Local conflict copy" },
      { id: "new", name: "New exercise" },
    ],
  };
  const incoming = prepareImportedSessions(input);
  const first = mergeImportedSessions(current, incoming);
  assert.equal(first.added, 1);
  assert.equal(first.skipped, 1);
  assert.equal(first.workspace.activeId, current.activeId);
  assert.equal(first.workspace.sessions[0], original);
  assert.equal(first.workspace.sessions[0].notes, "Remote saved work");
  const repeated = mergeImportedSessions(first.workspace, incoming);
  assert.equal(repeated.added, 0);
  assert.equal(repeated.skipped, 2);
  assert.equal(repeated.workspace, first.workspace);
});

test("explicit copy import retains internal document, evidence and grade links under a fresh session identity", () => {
  const local = { ...original, notes: "Local conflict copy" };
  const backup = { sessions: [local] };
  const before = structuredClone(backup);
  const incoming = prepareImportedSessions(backup, {
    asCopy: true,
    createId: () => "restored-copy",
    reservedIds: ["existing"],
  });
  assert.equal(incoming[0].id, "restored-copy");
  assert.equal(incoming[0].name, "QA exercise — import nusxa");
  assert.deepEqual(incoming[0].findingLinks, local.findingLinks);
  assert.deepEqual(incoming[0].assessments, local.assessments);
  assert.deepEqual(incoming[0].reports, local.reports);
  assert.deepEqual(backup, before);
  const result = mergeImportedSessions(current, incoming);
  assert.equal(result.added, 1);
  assert.equal(result.skipped, 0);
  assert.equal(result.workspace.activeId, "existing");
  assert.equal(result.workspace.sessions[0].notes, "Remote saved work");
  assert.equal(result.workspace.sessions[1].notes, "Local conflict copy");
});

test("copy ID collisions are rejected without changing the current workspace", () => {
  const before = structuredClone(current);
  assert.throws(
    () =>
      prepareImportedSessions(
        { sessions: [original] },
        { asCopy: true, createId: () => "existing" },
      ),
    /yangi ID/,
  );
  assert.throws(
    () =>
      prepareImportedSessions(
        { sessions: [original] },
        { asCopy: true, createId: () => "reserved", reservedIds: ["reserved"] },
      ),
    /yangi ID/,
  );
  assert.deepEqual(current, before);
});
