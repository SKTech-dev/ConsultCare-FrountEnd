function launchUrl(value, scheme, fallback) {
  try {
    const url = new URL(value || fallback);
    return ["https:", scheme + ":"].includes(url.protocol) && !url.username && !url.password ? url.href : fallback;
  } catch { return fallback; }
}

export const deliveryLinks = {
  uber: launchUrl(import.meta.env?.VITE_UBER_APP_URL, "uber", "https://m.uber.com/looking"),
};
