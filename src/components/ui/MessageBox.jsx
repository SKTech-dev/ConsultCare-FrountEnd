import { useEffect, useId, useRef } from "react";
import { useSelector } from "react-redux";

const focusable = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const MessageOverlay = ({
  type,
  text,
  onClose,
  title,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  isProcessing = false,
}) => {
  const colors = useSelector((state) => state.theme.colors);
  const dialog = useRef(null);
  const initialFocus = useRef(null);
  const headingId = useId();
  const textId = useId();

  const isSuccess = type === "success";
  const isConfirm = type === "confirm";
  const borderColor = isSuccess ? colors.success : isConfirm ? colors.primary : colors.error;
  const headingColor = isSuccess ? colors.success : isConfirm ? colors.primary : colors.error;
  const headingText =
    title || (isSuccess ? "Success" : isConfirm ? "Please confirm" : "Something went wrong");

  useEffect(() => {
    initialFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => dialog.current?.querySelector("button:not([disabled])")?.focus(), 0);
    return () => {
      window.clearTimeout(timer);
      initialFocus.current?.focus?.();
    };
  }, []);

  function keyDown(event) {
    event.stopPropagation();
    if (event.key === "Escape" && !isProcessing) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const buttons = [...dialog.current.querySelectorAll(focusable)];
    if (!buttons.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center"
      style={{ backgroundColor: colors.overlay }}
    >
      <div ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={textId}
        tabIndex={-1}
        onKeyDown={keyDown}
        className="w-[90%] max-w-md max-h-[90dvh] overflow-y-auto break-words rounded-2xl p-5 sm:p-6 shadow-xl text-center"
        style={{
          backgroundColor: colors.cardBg,
          border: `1px solid ${borderColor}`,
        }}
      >
        <h2 id={headingId} className="text-xl font-semibold mb-3" style={{ color: headingColor }}>
          {headingText}
        </h2>

        <p id={textId} className="mb-6" style={{ color: colors.textPrimary }}>
          {text}
        </p>

        {isConfirm ? (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-6 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-60"
              style={{
                backgroundColor: colors.outerBackground,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
              }}
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className="px-6 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-60"
              style={{
                backgroundColor: colors.primary,
                color: colors.textInverse,
              }}
            >
              {isProcessing ? "Please wait..." : confirmText}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full text-sm font-medium transition-colors"
            style={{
              backgroundColor: isSuccess ? colors.success : colors.error,
              color: colors.textInverse,
            }}
          >
            {confirmText}
          </button>
        )}
      </div>
    </div>
  );
};
