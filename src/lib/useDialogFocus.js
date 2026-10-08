import { useEffect, useRef } from "react";

const focusable = (root) =>
  [
    ...root.querySelectorAll(
      'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])',
    ),
  ].filter(
    (node) =>
      !node.disabled &&
      !node.closest("[inert]") &&
      node.getClientRects().length,
  );

/** Keep modal controls reachable, hide the background, restore the opener. */
export function useDialogFocus(ref, enabled, onClose) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const root = ref.current;
    if (!enabled || !root) return;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const siblings = [];
    for (
      let branch = root;
      branch.parentElement && branch.parentElement !== document.documentElement;
      branch = branch.parentElement
    ) {
      for (const sibling of branch.parentElement.children) {
        if (
          sibling === branch ||
          !(sibling instanceof HTMLElement) ||
          sibling.hasAttribute("data-dialog-backdrop")
        )
          continue;
        siblings.push([sibling, sibling.inert]);
        sibling.inert = true;
      }
    }
    const focusFirst = () =>
      (
        root.querySelector("[data-dialog-focus]") ||
        focusable(root)[0] ||
        root
      ).focus();
    focusFirst();
    const keydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current?.();
      }
      if (event.key !== "Tab") return;
      const items = focusable(root),
        first = items[0],
        last = items.at(-1);
      if (!first) {
        event.preventDefault();
        root.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !root.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !root.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      for (const [node, inert] of siblings) node.inert = inert;
      document.body.style.overflow = overflow;
      if (
        opener instanceof HTMLElement &&
        opener.isConnected &&
        !opener.closest("[inert]")
      )
        opener.focus();
    };
  }, [ref, enabled]);
}
