import { useSelector } from "react-redux";

export default function Button({
  children,
  type = "button",
  className = "",
  ...props
}) {
  const colors = useSelector((state) => state.theme.colors);

  return (
    <button
      {...props}
      type={type}
      className={`w-full transition text-white font-semibold px-4 py-3 rounded-lg shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${className}`}
      style={{ backgroundColor: colors.accent }}
    >
      {children}
    </button>
  );
}
