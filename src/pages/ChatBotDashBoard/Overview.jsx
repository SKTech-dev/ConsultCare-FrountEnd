import { useEffect, useMemo, useState } from "react";
import { Bot, BookOpen, ImageIcon, MessageCircle } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { callApi } from "../../api/apiClient";
import GlobalLoader from "../../components/ui/GlobalLoader";
import { MessageOverlay } from "../../components/ui/MessageBox";

export default function Overview() {
  const colors = useSelector((state) => state.theme.colors);
  const navigate = useNavigate();
  const { botId } = useParams();

  const [bot, setBot] = useState(null);
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageBox, setMessageBox] = useState({
    open: false,
    type: "",
    text: "",
  });

  useEffect(() => {
    async function loadOverview() {
      try {
        setLoading(true);
        const [botResponse, knowledgeResponse] = await Promise.all([
          callApi("GET", `/bots/${botId}`),
          callApi("GET", "/knowledge/", null, { botId }),
        ]);

        const items = knowledgeResponse.data || [];
        const itemsWithImages = await Promise.all(
          items.map(async (item) => {
            try {
              const knowledgeId = item.kid || item.kId;
              const imagesResponse = await callApi("GET", `/images/knowledge/${knowledgeId}`);
              return {
                ...item,
                images: imagesResponse.data || [],
              };
            } catch {
              return {
                ...item,
                images: [],
              };
            }
          })
        );

        setBot(botResponse.data);
        setKnowledgeItems(itemsWithImages);
      } catch (error) {
        setMessageBox({
          open: true,
          type: "error",
          text: error?.message || error?.detail || error?.error || "Failed to load bot overview.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadOverview();
  }, [botId]);

  const stats = useMemo(() => {
    const imageCount = knowledgeItems.reduce((total, item) => total + (item.images?.length || 0), 0);
    return [
      {
        label: "Knowledge Items",
        value: knowledgeItems.length,
        icon: BookOpen,
      },
      {
        label: "Image References",
        value: imageCount,
        icon: ImageIcon,
      },
      {
        label: "Test Tools",
        value: 2,
        icon: MessageCircle,
      },
    ];
  }, [knowledgeItems]);

  return (
    <div className="max-w-6xl mx-auto">
      {loading && <GlobalLoader fullPage message="Loading bot overview..." />}

      {messageBox.open && (
        <MessageOverlay
          type={messageBox.type}
          text={messageBox.text}
          onClose={() => setMessageBox({ open: false, type: "", text: "" })}
        />
      )}

      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2" style={{ color: colors.textPrimary }}>
          {bot?.name || "Bot Overview"}
        </h1>
        <p className="text-sm italic" style={{ color: colors.textSecondary }}>
          A quick look at this bot’s WhatsApp identity, knowledge coverage, and next actions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div
          className="rounded-[2rem] border p-6"
          style={{ background: colors.cardBg, borderColor: colors.border }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="p-3 rounded-2xl"
              style={{ background: `${colors.primary}15`, color: colors.primary }}
            >
              <Bot size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest opacity-60" style={{ color: colors.textSecondary }}>
                Bot Identity
              </p>
              <p className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                {bot?.display_phone_number || "No display number"}
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
            {bot?.description || "No bot description available yet."}
          </p>
        </div>

        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-[2rem] border p-6"
              style={{ background: colors.cardBg, borderColor: colors.border }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black uppercase tracking-widest opacity-60" style={{ color: colors.textSecondary }}>
                  {stat.label}
                </p>
                <Icon size={18} style={{ color: colors.primary }} />
              </div>
              <p className="text-4xl font-bold" style={{ color: colors.textPrimary }}>
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
        <div
          className="rounded-[2rem] border p-6"
          style={{ background: colors.cardBg, borderColor: colors.border }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>
            Recent Knowledge
          </h2>

          <div className="space-y-4">
            {knowledgeItems.slice(0, 5).map((item) => (
              <button
                key={item.kid || item.kId}
                type="button"
                onClick={() => navigate(`/chatBotDashboard/${botId}/knowledge/${item.kid || item.kId}`)}
                className="w-full text-left rounded-[1.5rem] border p-4 transition-colors hover:bg-gray-50"
                style={{ borderColor: colors.border }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold" style={{ color: colors.textPrimary }}>
                      {item.name}
                    </p>
                    <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                      {item.description || item.knowledge}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: `${colors.primary}15`, color: colors.primary }}
                  >
                    {item.images?.length || 0} images
                  </span>
                </div>
              </button>
            ))}

            {knowledgeItems.length === 0 && (
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                No knowledge added yet.
              </p>
            )}
          </div>
        </div>

        <div
          className="rounded-[2rem] border p-6"
          style={{ background: colors.cardBg, borderColor: colors.border }}
        >
          <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>
            Quick Actions
          </h2>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate(`/chatBotDashboard/${botId}/knowledge`)}
              className="w-full py-4 rounded-xl font-bold text-white"
              style={{ background: colors.primary }}
            >
              Open Knowledge Base
            </button>

            <button
              type="button"
              onClick={() => navigate(`/chatBotDashboard/${botId}/whatsapp-config`)}
              className="w-full py-4 rounded-xl font-bold border"
              style={{ borderColor: colors.border, color: colors.textPrimary }}
            >
              Configure WhatsApp
            </button>

            <button
              type="button"
              onClick={() => navigate(`/chatBotDashboard/${botId}/test-chat`)}
              className="w-full py-4 rounded-xl font-bold border"
              style={{ borderColor: colors.border, color: colors.textPrimary }}
            >
              Test Chat Replies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
