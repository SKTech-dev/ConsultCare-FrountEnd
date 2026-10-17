import { useSelector } from "react-redux";
import { validPhone } from "../../features/consultations/presentation";

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
        {label}{required && <span className="required-mark" aria-hidden="true"> *</span>}
      </label>

      {/* INPUT */}
      <input
        {...props}
        id={id || name}
        aria-label={typeof label === "string" ? label : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id || name}-error` : undefined}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        onInput={type === "tel" ? (event) => event.currentTarget.setCustomValidity(validPhone(event.currentTarget.value) ? "" : "Enter a 10-digit local number (0771234567) or an international number (+94771234567).") : undefined}
        maxLength={type === "tel" ? 25 : props.maxLength}
        placeholder={placeholder}
        className="w-full min-w-0 min-h-11 px-3 sm:px-4 py-2 sm:py-3 rounded-lg border focus:outline-none focus:ring-2 text-base transition"
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
