const PREFIX = "qa-lab-draft-v1:";
const tabs = new Set(["checklist", "cases", "reports"]);
const text = (value) => typeof value === "string";
const record = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
function validEvidence(item) {
  if (
    !record(item) ||
    !["id", "name", "type", "dataUrl"].every((key) => text(item[key])) ||
    !item.id ||
    !item.name.trim()
  )
    return false;
  const match = item.dataUrl.match(
    /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/,
  );
  if (!match || match[1] !== item.type || match[2].length % 4 !== 0)
    return false;
  const bytes =
    (match[2].length / 4) * 3 -
    (match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0);
  return (
    bytes > 0 &&
    bytes <= 1024 * 1024 &&
    (item.size === undefined || item.size === bytes)
  );
}

export const draftKey = (sessionId, tab) => `${PREFIX}${sessionId}:${tab}`;
// Evidence is immutable after attachment; its ID changes when replaced. Avoid
// storing the same multi-megabyte image in the draft and both baselines.
export const draftSnapshot = (value) =>
  JSON.stringify(value, (key, field) =>
    key === "dataUrl" && text(field) ? `${field.length} characters` : field,
  );

// Drafts belong to this browser tab, not to the submitted QA documents. The
// baseline prevents an old editor from replacing a newer saved document.
export function readDraft(storage, session, tab) {
  try {
    const value = JSON.parse(
      storage.getItem(draftKey(session.id, tab)) || "null",
    );
    if (!record(value) || value.version !== 1 || !tabs.has(tab)) return null;
    const draft = value.draft;
    if (
      !record(draft) ||
      !text(draft.id) ||
      !draft.id ||
      !["title", "expected", "actual", "status"].every((key) =>
        text(draft[key]),
      ) ||
      typeof value.editing !== "boolean" ||
      !text(value.baseline)
    )
      return null;
    const statuses =
      tab === "reports"
        ? ["Open", "In progress", "Ready for retest", "Closed", "Reopened"]
        : ["Not run", "Passed", "Failed", "Blocked"];
    if (!statuses.includes(draft.status)) return null;
    for (const key of [
      "requirementId",
      "checkId",
      "preconditions",
      "data",
      "module",
      "environment",
      "steps",
      "priority",
      "severity",
    ])
      if (draft[key] !== undefined && !text(draft[key])) return null;
    if (tab !== "checklist" && !text(draft.steps)) return null;
    for (const key of ["createdAt", "updatedAt"])
      if (
        draft[key] !== undefined &&
        (!text(draft[key]) ||
          !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(draft[key]) ||
          !Number.isFinite(Date.parse(draft[key])))
      )
        return null;
    if (
      draft.requirementId &&
      !session.scenario.requirements.some(
        (item) => item.id === draft.requirementId,
      )
    )
      return null;
    if (draft.checkId && !/^AT-(0[1-9]|1[0-4])$/.test(draft.checkId))
      return null;
    if (draft.priority && !["P1", "P2", "P3"].includes(draft.priority))
      return null;
    if (
      tab === "reports" &&
      !["Critical", "High", "Medium", "Low"].includes(draft.severity)
    )
      return null;
    if (
      draft.evidence !== undefined &&
      (!Array.isArray(draft.evidence) ||
        draft.evidence.length > 3 ||
        draft.evidence.some((item) => !validEvidence(item)) ||
        new Set(draft.evidence.map((item) => item.id)).size !==
          draft.evidence.length)
    )
      return null;
    const saved = (session[tab] || []).find((item) => item.id === draft.id);
    const savedContent = (item) =>
      draftSnapshot({
        ...item,
        title: item.title.trim(),
        updatedAt: undefined,
      });
    if (!value.editing && saved && savedContent(saved) === savedContent(draft))
      return null;
    if (
      (value.editing &&
        (!saved || draftSnapshot(saved) !== value.savedBaseline)) ||
      (!value.editing && saved)
    ) {
      // A newer saved record must win, but local unsaved text is still the
      // learner's work. Recover it as a new unsaved copy, including new image
      // identities, so explicit Save cannot overwrite the other record.
      return {
        ...value,
        editing: false,
        baseline: "",
        savedBaseline: "",
        recovery: { reason: saved ? "updated" : "deleted", sourceId: draft.id },
        draft: {
          ...draft,
          id: uid(),
          createdAt: new Date().toISOString(),
          ...(draft.evidence
            ? {
                evidence: draft.evidence.map((item) => ({
                  ...item,
                  id: uid(),
                })),
              }
            : {}),
        },
      };
    }
    return value;
  } catch {
    return null;
  }
}

export function writeDraft(storage, sessionId, tab, value) {
  try {
    const key = draftKey(sessionId, tab);
    if (value) storage.setItem(key, JSON.stringify({ ...value, version: 1 }));
    else storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
