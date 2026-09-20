// Local preview document storage. A production API must replace this with
// authenticated uploads, malware scanning, and per-consultation access checks.
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("consultcare-preview-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Document storage is unavailable in this browser."));
  });
}
export async function saveFile(id, file) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(file, id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(new Error("Could not save this document. Browser storage may be full.")); };
  });
}
export async function downloadFile(id, name) {
  const db = await database();
  const file = await new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readonly");
    const request = tx.objectStore("files").get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Could not read this document."));
    tx.oncomplete = () => db.close();
  });
  if (!file) throw new Error("This document is no longer in this browser's storage.");
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
