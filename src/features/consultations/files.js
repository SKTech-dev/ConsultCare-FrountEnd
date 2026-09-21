import { apiClient, callApi } from "../../api/apiClient";

export async function saveFile(bookingId, file, privateNote = false) {
  const data = new FormData();
  data.append("file", file);
  data.append("private", String(privateNote));
  return (await callApi("POST", "/bookings/" + bookingId + "/documents", data)).data;
}

export async function downloadFile(id, name) {
  let response;
  try { response = await apiClient.get("/documents/" + id, { responseType: "blob" }); }
  catch { throw new Error("Could not download this document. Check your session and try again."); }
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
