import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { MessageOverlay } from "./MessageBox";

const Context = createContext(null);

export function UnsavedChangesProvider({ children }) {
  const entries = useRef(new Map());
  const [pending, setPending] = useState(null);
  const [revision, setRevision] = useState(0);
  const dirty = useCallback(() => [...entries.current.values()].some(Boolean), []);
  const register = useCallback((id, value) => {
    if (entries.current.get(id) === value) return;
    entries.current.set(id, value);
    setRevision((n) => n + 1);
  }, []);
  const unregister = useCallback((id) => { if (entries.current.delete(id)) setRevision((n) => n + 1); }, []);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty() && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state === "blocked" && !dirty()) blocker.proceed();
  }, [blocker, dirty, revision]);
  const confirmLeave = useCallback((action) => { if (dirty()) setPending(() => action); else action(); }, [dirty]);
  useEffect(() => {
    const beforeUnload = (event) => { if (dirty()) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  return <Context.Provider value={{ register, unregister, confirmLeave }}>
    {children}
    {(blocker.state === "blocked" || pending) && <MessageOverlay type="confirm" title="Leave without saving?" text="You have unsaved changes. Stay on this page to save them, or leave and discard your changes." confirmText="Leave without saving" cancelText="Stay and save" onClose={() => { blocker.reset?.(); setPending(null); }} onConfirm={() => {
      entries.current.clear();
      if (pending) { const action = pending; setPending(null); action(); }
      else blocker.proceed();
    }} />}
  </Context.Provider>;
}

export function useUnsavedChanges(value, enabled = true) {
  const context = useContext(Context);
  const id = useId();
  const serialized = JSON.stringify(value);
  const baseline = useRef(serialized);
  const [, render] = useState(0);
  useLayoutEffect(() => { context?.register(id, enabled && serialized !== baseline.current); });
  useEffect(() => () => context?.unregister(id), [context?.unregister, id]);
  return useCallback((savedValue) => {
    baseline.current = savedValue === undefined ? serialized : JSON.stringify(savedValue);
    context?.register(id, false);
    render((n) => n + 1);
  }, [context?.register, id, serialized]);
}

export function useConfirmLeave() { return useContext(Context).confirmLeave; }
