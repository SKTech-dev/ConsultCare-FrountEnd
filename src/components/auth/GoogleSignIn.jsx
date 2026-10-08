import { useEffect, useRef, useState } from "react";
import { callApi } from "../../api/apiClient";

let scriptPromise;
function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => { script.remove(); scriptPromise = null; reject(new Error("Google sign-in could not load. Please retry.")); };
    document.head.append(script);
  });
  return scriptPromise;
}

export default function GoogleSignIn({ mode = "login", role = "user", onSuccess, onError, onBusyChange, disabled = false, separator = false }) {
  const holder = useRef(null);
  const handlers = useRef({ onSuccess, onError, onBusyChange, disabled });
  handlers.current = { onSuccess, onError, onBusyChange, disabled };
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let submitting = false;
    let available = false;
    let observer;
    const controller = new AbortController();
    async function prepare() {
      try {
        const providers = await callApi("GET", "/auth/providers", null, null, { signal: controller.signal });
        if (!active || !providers.data?.google) return;
        available = true;
        setEnabled(true); setLoading(true); setFailed(false);
        if (holder.current) holder.current.replaceChildren();
        const challenge = await callApi("POST", "/auth/google/challenge", { mode, role }, null, { signal: controller.signal });
        await loadGoogle();
        if (!active || !holder.current) return;
        window.google.accounts.id.initialize({ client_id: challenge.data.clientId, nonce: challenge.data.nonce,
          auto_select: false, callback: async ({ credential }) => {
            if (!active || submitting || handlers.current.disabled) return;
            submitting = true;
            handlers.current.onBusyChange?.(true);
            try {
              await callApi("POST", "/auth/google", { credential });
              const result = await callApi("GET", "/auth/me");
              if (active) handlers.current.onSuccess(result.data);
            } catch (error) { if (active) { holder.current?.replaceChildren(); observer?.disconnect(); setFailed(true); handlers.current.onError(error.message); } }
            finally { submitting = false; if (active) handlers.current.onBusyChange?.(false); }
          } });
        let previousWidth = 0;
        const render = () => {
          if (!active || !holder.current) return;
          const width = Math.min(400, Math.floor(holder.current.clientWidth));
          if (!width || width === previousWidth) return;
          previousWidth = width;
          holder.current.replaceChildren();
          window.google.accounts.id.renderButton(holder.current, { type: "standard", theme: "outline", size: "large", shape: "rectangular", text: mode === "signup" ? "signup_with" : "signin_with", width });
        };
        observer = new ResizeObserver(render);
        observer.observe(holder.current);
        render();
        setLoading(false);
      } catch (error) { if (active && !controller.signal.aborted) { setFailed(true); setLoading(false); if (available) handlers.current.onError(error.message); } }
    }
    // Avoid duplicate nonce requests during StrictMode's development remount.
    const timer = setTimeout(prepare, 0);
    return () => { active = false; clearTimeout(timer); controller.abort(); observer?.disconnect(); };
  }, [mode, role, retry]);
  return <div hidden={!enabled} className="w-full min-w-0" inert={disabled ? "" : undefined}>
    {loading && <p role="status">Loading Google sign-in...</p>}
    <div ref={holder} className="w-full max-w-[400px] mx-auto min-h-10" />
    {failed && <button type="button" className="w-full border rounded-lg px-4 py-3 text-sm font-semibold" disabled={disabled} onClick={() => setRetry(retry + 1)}>Retry Google sign-in</button>}
    {separator && <div className="flex items-center gap-3 mt-6 text-xs"><span className="flex-1 border-t" /><span>{mode === "signup" ? "or sign up with email" : "or sign in with email"}</span><span className="flex-1 border-t" /></div>}
  </div>;
}
