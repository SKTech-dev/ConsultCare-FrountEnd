import { Loader2 } from "lucide-react";
import { useSelector } from "react-redux";

const GlobalLoader = ({ fullPage = false, message = "Loading..." }) => {
  const colors = useSelector((state) => state.theme.colors);

  const containerClass = fullPage
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center"
    : "w-full py-12 flex flex-col items-center justify-center";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={containerClass}
      style={{
        backgroundColor: fullPage ? colors.overlay : "transparent",
        backdropFilter: fullPage ? "blur(4px)" : "none",
      }}
    >
      <Loader2
        size={32}
        strokeWidth={3}
        className="animate-spin"
        style={{ color: colors.primary }}
      />

      {message && (
        <p
          className="mt-4 text-sm font-medium animate-pulse"
          style={{ color: colors.textPrimary }}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default GlobalLoader;
