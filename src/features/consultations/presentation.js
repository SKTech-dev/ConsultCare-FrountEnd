export function matchesLanguage(languages, selected) {
  const normalize = (value) => String(value).trim().toLocaleLowerCase();
  return !selected || (languages || []).some((value) => normalize(value) === normalize(selected));
}

export function ageLabel(dob, onDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob || "") || !/^\d{4}-\d{2}-\d{2}$/.test(onDate || "") || dob > onDate) return "Not provided";
  const [year, month, day] = dob.split("-").map(Number);
  const [nowYear, nowMonth, nowDay] = onDate.split("-").map(Number);
  const months = Math.max(0, (nowYear - year) * 12 + nowMonth - month - (nowDay < day ? 1 : 0));
  return `${Math.floor(months / 12)} years, ${months % 12} months`;
}

export function validPhone(value) {
  const text = String(value || "").trim();
  if (!text) return true; // Required fields are checked separately.
  if (!/^\+?[\d ()-]+$/.test(text)) return false;
  const compact = text.replace(/[ ()-]/g, "");
  return /^(?:0\d{9}|\+[1-9]\d{7,14})$/.test(compact);
}
