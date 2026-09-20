import { useSelector } from "react-redux";

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

  const isSuccess = type === "success";
  const isConfirm = type === "confirm";
  const borderColor = isSuccess ? colors.success : isConfirm ? colors.primary : colors.error;
  const headingColor = isSuccess ? colors.success : isConfirm ? colors.primary : colors.error;
  const headingText =
    title || (isSuccess ? "Success" : isConfirm ? "Please confirm" : "Something went wrong");

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center"
      style={{ backgroundColor: colors.overlay }}
    >
      <div
        className="w-[90%] max-w-md rounded-2xl p-6 shadow-xl text-center"
        style={{
          backgroundColor: colors.cardBg,
          border: `1px solid ${borderColor}`,
        }}
      >
        <h2 className="text-xl font-semibold mb-3" style={{ color: headingColor }}>
          {headingText}
        </h2>

        <p className="mb-6" style={{ color: colors.textPrimary }}>
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
