import { useEffect, useState } from "react";
import { Bot, ImageOff, Send } from "lucide-react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";

import { callApi } from "../../api/apiClient";
import GlobalLoader from "../../components/ui/GlobalLoader";
import { MessageOverlay } from "../../components/ui/MessageBox";

export default function TestChat() {
  const colors = useSelector((state) => state.theme.colors);
  const { botId } = useParams();

  const [bot, setBot] = useState(null);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
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
          text: error?.message || error?.detail || error?.error || "Failed to load test chat data.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadBot();
  }, [botId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    try {
      setTesting(true);
      const response = await callApi("POST", `/bots/${botId}/test-reply`, {
        message: message.trim(),
      });
      setResult(response.data);
    } catch (error) {
      setMessageBox({
        open: true,
        type: "error",
        text: error?.message || error?.detail || error?.error || "Failed to test the bot reply.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {(loading || testing) && (
        <GlobalLoader fullPage message={loading ? "Loading test chat..." : "Generating bot reply..."} />
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
          Test Chat
        </h1>
        <p className="text-sm italic" style={{ color: colors.textSecondary }}>
          Try customer questions against this bot before using the real WhatsApp conversation flow.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-8">
        <div
          className="rounded-[2rem] border p-6"
          style={{ background: colors.cardBg, borderColor: colors.border }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Bot size={18} style={{ color: colors.primary }} />
            <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
              Ask the Bot
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              rows="8"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type a sample customer message like: Do you have this in red? or Show me the white shoe pair."
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 text-sm transition resize-none"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.outerBackground,
                color: colors.textPrimary,
              }}
            />

            <button
              type="submit"
              className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2"
              style={{ background: colors.primary }}
            >
              <Send size={16} />
              Generate Test Reply
            </button>
          </form>

          <div className="mt-6 text-sm" style={{ color: colors.textSecondary }}>
            <p>Bot: {bot?.name || "Unknown bot"}</p>
            <p>Phone Number ID: {bot?.phone_number_id || "Not configured"}</p>
          </div>
        </div>

        <div
          className="rounded-[2rem] border p-6"
          style={{ background: colors.cardBg, borderColor: colors.border }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>
            Bot Reply Preview
          </h2>

          {!result && (
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Run a test message to preview how the bot will respond.
            </p>
          )}

          {result && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-2" style={{ color: colors.textSecondary }}>
                  Response
                </p>
                <div
                  className="rounded-[1.5rem] p-4 text-sm leading-7"
                  style={{ background: colors.outerBackground, color: colors.textPrimary }}
                >
                  {result.response || "No text reply returned."}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-2" style={{ color: colors.textSecondary }}>
                  Response Types
                </p>
                <div className="flex flex-wrap gap-2">
                  {(result.responce_types || []).map((type) => (
                    <span
                      key={type}
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: `${colors.primary}15`, color: colors.primary }}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-2" style={{ color: colors.textSecondary }}>
                  Image Output
                </p>

                {result.imageurls?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {result.imageurls.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="rounded-[1.5rem] overflow-hidden border"
                        style={{ borderColor: colors.border }}
                      >
                        <img src={url} alt={`Result ${index + 1}`} className="w-full h-48 object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border p-6 text-sm flex items-center gap-3" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                    <ImageOff size={18} />
                    No image response returned.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
