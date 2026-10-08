import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  loadWorkspaceSnapshot,
  saveWorkspace,
  validateBackup,
} from "./storage.js";

// Serialize writes from this tab and check the database revision inside the
// write transaction. An older tab must never silently replace newer work.
export function useWorkspace(makeInitial) {
  const [data, setData] = useState(null);
  const [saveState, setSaveState] = useState("loading");
  const [storageError, setStorageError] = useState("");
  const [conflict, setConflict] = useState(false);
  const current = useRef(null),
    saved = useRef(null),
    pending = useRef(null);
  const revision = useRef(0),
    running = useRef(false),
    blocked = useRef(false);
  const loaded = useRef(false),
    mounted = useRef(true);
  const recovering = useRef(false);
  const saveTimer = useRef(null);
  const safeError = (value) =>
    value && typeof value.message === "string"
      ? value
      : new Error("Saqlash xizmatida noma’lum xato yuz berdi.");

  async function drain() {
    if (running.current || blocked.current || !loaded.current) return;
    running.current = true;
    while (pending.current && mounted.current) {
      const snapshot = pending.current;
      pending.current = null;
      setSaveState("saving");
      try {
        revision.current = await saveWorkspace(snapshot, {
          expectedRevision: revision.current,
        });
        saved.current = snapshot;
        if (!mounted.current) break;
        setStorageError("");
        if (!pending.current) setSaveState("saved");
        // Further typing gets its own short quiet period instead of cloning a
        // multi-megabyte workspace for every keystroke.
        if (pending.current && saveTimer.current !== null) break;
      } catch (caught) {
        const error = safeError(caught);
        pending.current = current.current;
        blocked.current = true;
        if (!mounted.current) break;
        setSaveState("error");
        setConflict(error.name === "WorkspaceConflictError");
        setStorageError(
          error.name === "WorkspaceConflictError"
            ? `${error.message} Bu oynadagi ish ham hozircha ochiq turibdi. Uni zaxiraga yuklab, yangi saqlangan nusxani oching.`
            : `Brauzerga saqlash muvaffaqiyatsiz. Ishingiz shu oynada turibdi; zaxirani yuklang yoki qayta urinib ko‘ring. ${error.message}`,
        );
        break;
      }
    }
    running.current = false;
  }

  useEffect(() => {
    mounted.current = true;
    loadWorkspaceSnapshot()
      .then(({ data: stored, revision: value }) => {
        if (!mounted.current) return;
        if (stored) validateBackup(stored);
        revision.current = value;
        saved.current = stored;
        loaded.current = true;
        setData(stored || makeInitial());
        if (stored) setSaveState("saved");
      })
      .catch((caught) => {
        const error = safeError(caught);
        if (!mounted.current) return;
        blocked.current = true;
        setSaveState("error");
        setStorageError(
          `Saqlangan ishlarni o‘qib bo‘lmadi. Eski ma’lumot ustiga yozilmaydi. Bu oynadagi yangi ishni JSON orqali eksport qiling. ${error.message}`,
        );
        setData(makeInitial());
      });
    return () => {
      mounted.current = false;
      clearTimeout(saveTimer.current);
    };
  }, []);

  useLayoutEffect(() => {
    current.current = data;
    if (!data || data === saved.current) return;
    pending.current = data;
    if (blocked.current || !loaded.current) return;
    clearTimeout(saveTimer.current);
    if (!saved.current) {
      saveTimer.current = null;
      drain();
      return;
    }
    setSaveState("saving");
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      drain();
    }, 200);
  }, [data]);

  useEffect(() => {
    const flush = () => {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      drain();
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const warn = (event) => {
      if (pending.current || running.current || blocked.current) {
        flush();
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);

  const retrySave = () => {
    if (!loaded.current || conflict) return;
    blocked.current = false;
    pending.current = current.current;
    clearTimeout(saveTimer.current);
    saveTimer.current = null;
    drain();
  };
  const openSaved = async () => {
    if (recovering.current) return false;
    recovering.current = true;
    const before = current.current;
    try {
      const snapshot = await loadWorkspaceSnapshot();
      if (!snapshot.data) throw new Error("Saqlangan nusxa topilmadi.");
      validateBackup(snapshot.data);
      if (current.current !== before) {
        setStorageError(
          "Nusxani ochish paytida yangi o‘zgarish kiritildi. Yangi yozuvlar yo‘qolmasligi uchun bu oyna almashtirilmadi. Zaxirani qayta yuklab, yana urinib ko‘ring.",
        );
        return false;
      }
      revision.current = snapshot.revision;
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      pending.current = null;
      saved.current = snapshot.data;
      blocked.current = false;
      loaded.current = true;
      setConflict(false);
      setStorageError("");
      setSaveState("saved");
      setData(snapshot.data);
      return true;
    } catch (caught) {
      const error = safeError(caught);
      setStorageError(
        `Saqlangan nusxani ochib bo‘lmadi. Hozirgi ish saqlanib turibdi. ${error.message}`,
      );
      return false;
    } finally {
      recovering.current = false;
    }
  };
  return {
    data,
    setData,
    saveState:
      saveState === "error"
        ? "error"
        : data && data !== saved.current
          ? "saving"
          : saveState,
    storageError,
    conflict,
    retrySave,
    openSaved,
    canRetry: loaded.current && !conflict,
  };
}
