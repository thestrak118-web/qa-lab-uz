const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `import-${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Call after validateBackup. Session identities scope documents, assessments,
// cart state and drafts; keeping their internal links preserves the history.
export function prepareImportedSessions(
  backup,
  { asCopy = false, createId = uid, reservedIds = [] } = {},
) {
  if (!asCopy) return backup.sessions;
  const ids = new Set([
    ...reservedIds,
    ...backup.sessions.map((session) => session.id),
  ]);
  return backup.sessions.map((session) => {
    const id = createId();
    if (!id || ids.has(id))
      throw new Error(
        "Import nusxasi uchun yangi ID yaratib bo‘lmadi. Qayta urinib ko‘ring.",
      );
    ids.add(id);
    return { ...session, id, name: `${session.name} — import nusxa` };
  });
}

export function mergeImportedSessions(current, incoming) {
  const known = new Set(current.sessions.map((session) => session.id));
  const extra = incoming.filter((session) => !known.has(session.id));
  return {
    workspace: extra.length
      ? { ...current, sessions: [...current.sessions, ...extra] }
      : current,
    added: extra.length,
    skipped: incoming.length - extra.length,
  };
}
