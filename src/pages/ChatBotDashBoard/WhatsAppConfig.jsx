import { useEffect, useState } from "react";
import { KeyRound, MessageSquare, Phone } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { callApi } from "../../api/apiClient";
import GlobalLoader from "../../components/ui/GlobalLoader";
import { MessageOverlay } from "../../components/ui/MessageBox";

export default function WhatsAppConfig() {
  const colors = useSelector((state) => state.theme.colors);
  const navigate = useNavigate();
  const { botId } = useParams();

  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [publicKeyInfo, setPublicKeyInfo] = useState(null);
  const [messageBox, setMessageBox] = useState({
    open: false,
    type: "",
    text: "",
  });

  useEffect(() => {
    async function loadBot() {
      try {
        setLoading(true);
        const response = await callApi("GET", `/bots/${botId}`);
        setBot(response.data);
      } catch (error) {
        setMessageBox({
          open: true,
          type: "error",
          text: error?.message || error?.detail || error?.error || "Failed to load WhatsApp configuration.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadBot();
  }, [botId]);

  const fetchPublicKey = async () => {
    try {
      setActionLoading(true);
      const response = await callApi("GET", "/WhatsAppConfig/get-public-key");
      setPublicKeyInfo(response);
    } catch (error) {
      setMessageBox({
        open: true,
        type: "error",
        text: error?.message || error?.detail || error?.error || "Failed to fetch WhatsApp public key.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const setPublicKey = async () => {
    try {
      setActionLoading(true);
      await callApi("POST", "/WhatsAppConfig/set-public-key");
      setMessageBox({
        open: true,
        type: "success",
        text: "WhatsApp public key submitted successfully.",
      });
    } catch (error) {
      setMessageBox({
        open: true,
        type: "error",
        text: error?.message || error?.detail || error?.error || "Failed to submit WhatsApp public key.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {(loading || actionLoading) && (
        <GlobalLoader fullPage message={loading ? "Loading WhatsApp config..." : "Syncing WhatsApp config..."} />
      )}

      {messageBox.open && (
        <MessageOverlay
          type={messageBox.type}
          text={messageBox.text}
          onClose={() => setMessageBox({ open: false, type: "", text: "" })}
        />
      )}

      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2" style={{ color: colors.textPrimary }}>
          WhatsApp Configuration
        </h1>
        <p className="text-sm italic" style={{ color: colors.textSecondary }}>
          Review the connected WhatsApp identity and handle the encryption/public key steps from one place.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-8">
        <div className="space-y-6">
          <div
            className="rounded-[2rem] border p-6"
            style={{ background: colors.cardBg, borderColor: colors.border }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Phone size={18} style={{ color: colors.primary }} />
              <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                Bot Phone Setup
              </h2>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="font-bold mb-1" style={{ color: colors.textPrimary }}>
                  Display Phone Number
                </p>
                <p style={{ color: colors.textSecondary }}>
                  {bot?.display_phone_number || "Not configured yet"}
                </p>
              </div>

              <div>
                <p className="font-bold mb-1" style={{ color: colors.textPrimary }}>
                  Phone Number ID
                </p>
                <p style={{ color: colors.textSecondary }}>
                  {bot?.phone_number_id || "Not configured yet"}
                </p>
              </div>

              <div>
                <p className="font-bold mb-1" style={{ color: colors.textPrimary }}>
                  Local Webhook Path
                </p>
                <p style={{ color: colors.textSecondary }}>
                  `/webhook`
                </p>
              </div>
            </div>
          </div>

          <div
            className="rounded-[2rem] border p-6"
            style={{ background: colors.cardBg, borderColor: colors.border }}
          >
            <div className="flex items-center gap-3 mb-4">
              <KeyRound size={18} style={{ color: colors.primary }} />
              <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                Encryption Tools
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={fetchPublicKey}
                className="py-4 rounded-xl font-bold border"
                style={{ borderColor: colors.border, color: colors.textPrimary }}
              >
                Get Public Key
              </button>

              <button
                type="button"
                onClick={setPublicKey}
                className="py-4 rounded-xl font-bold text-white"
                style={{ background: colors.primary }}
              >
                Set Public Key
              </button>
            </div>
          </div>
        </div>

        <div
          className="rounded-[2rem] border p-6"
          style={{ background: colors.cardBg, borderColor: colors.border }}
        >
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare size={18} style={{ color: colors.primary }} />
            <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
              Connection Notes
            </h2>
          </div>

          <div className="space-y-4 text-sm" style={{ color: colors.textSecondary }}>
            <p>
              Keep the bot phone details updated here before testing live WhatsApp conversations.
            </p>
            <p>
              If you change the phone number or phone number ID, update the bot details from the edit bot page.
            </p>
            <p>
              Use the encryption tools only when you are working through the Meta setup flow.
            </p>
          </div>

          {publicKeyInfo && (
            <div
              className="mt-6 rounded-[1.5rem] border p-4 text-sm whitespace-pre-wrap"
              style={{ borderColor: colors.border, background: colors.outerBackground, color: colors.textSecondary }}
            >
              {JSON.stringify(publicKeyInfo, null, 2)}
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate(`/editChatBot/${botId}`)}
            className="w-full mt-6 py-4 rounded-xl font-bold border"
            style={{ borderColor: colors.border, color: colors.textPrimary }}
          >
            Edit Bot WhatsApp Details
          </button>
        </div>
      </div>
    </div>
  );
}
