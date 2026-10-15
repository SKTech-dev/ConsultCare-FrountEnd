import GlobalLoader from "../ui/GlobalLoader";
import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { apiClient } from "../../api/apiClient";
import { MessageOverlay } from "../ui/MessageBox";

export default function DocumentPreview({ file, onClose }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    apiClient.get("/documents/" + file.id, { responseType: "blob", signal: controller.signal }).then((response) => {
      if (controller.signal.aborted) return;
      const type = response.data.type;
      if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(type)) throw new Error("Unsupported preview");
      objectUrl = URL.createObjectURL(response.data);
      setPreview({ url: objectUrl, type });
    }).catch(() => { if (!controller.signal.aborted) setError("Could not load this document. Close the preview and try again."); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.id]);
  return <Modal title={file.name} onClose={onClose}>
    {!preview && !error && <GlobalLoader compact message="Loading document…" />}
    {preview && (preview.type.startsWith("image/") ? <img className="document-preview" src={preview.url} alt={file.name} onError={() => setError("This image could not be displayed.")} /> : <iframe className="document-preview" src={preview.url} title={file.name} />)}
    {preview && <p className="ws-muted mt-3">If your browser cannot display this report, close this preview and use Download.</p>}
    {error && <MessageOverlay type="error" text={error} onClose={onClose} />}
  </Modal>;
}
