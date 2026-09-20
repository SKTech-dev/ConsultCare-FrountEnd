import { useSelector } from "react-redux";

export default function Input({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  id,
  ...props
}) {
  const colors = useSelector((state) => state.theme.colors);

  return (
    <div>
      {/* LABEL */}
      <label
        htmlFor={id || name}
        className="block text-sm font-medium mb-2"
        style={{ color: colors.secondary }}
      >
        {label}
      </label>

      {/* INPUT */}
      <input
        {...props}
        id={id || name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id || name}-error` : undefined}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border focus:outline-none focus:ring-2 text-sm sm:text-base transition"
        style={{
          borderColor: error ? "#ef4444" : colors.border,
          backgroundColor: colors.outerBackground,
          color: colors.secondary,
        }}
      />

      {/* ERROR MESSAGE */}
      {error && (
        <p id={`${id || name}-error`} className="text-xs text-red-500 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
