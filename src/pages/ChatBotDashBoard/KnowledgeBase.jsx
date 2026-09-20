import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  BookOpen,
  Trash2,
  ImageOff,
  Edit3,
  Eye,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { callApi } from "../../api/apiClient";
import GlobalLoader from "../../components/ui/GlobalLoader";
import { MessageOverlay } from "../../components/ui/MessageBox";

function getKnowledgeId(item) {
  return item.kid || item.kId || item.id;
}

export default function KnowledgeBase() {
  const colors = useSelector((state) => state.theme.colors);
  const navigate = useNavigate();
  const { botId } = useParams();

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [messageBox, setMessageBox] = useState({
    open: false,
    type: "",
    text: "",
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingKnowledgeId, setDeletingKnowledgeId] = useState(null);

  useEffect(() => {
    async function loadKnowledge() {
      if (!botId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const knowledgeResponse = await callApi("GET", "/knowledge/", null, {
          botId,
        });
        const knowledgeItems = knowledgeResponse.data || [];

        const itemsWithImages = await Promise.all(
          knowledgeItems.map(async (item) => {
            const knowledgeId = getKnowledgeId(item);

            if (!knowledgeId) {
              return {
                ...item,
                images: [],
              };
            }

            try {
              const imageResponse = await callApi(
                "GET",
                `/images/knowledge/${knowledgeId}`,
              );

              return {
                ...item,
                images: imageResponse.data || [],
              };
            } catch {
              return {
                ...item,
                images: [],
              };
            }
          }),
        );

        setItems(itemsWithImages);
      } catch (error) {
        setMessageBox({
          open: true,
          type: "error",
          text:
            error?.message ||
            error?.detail ||
            error?.error ||
            "Failed to load knowledge items.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadKnowledge();
  }, [botId]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!query) {
        return true;
      }

      const combinedText =
        `${item.name || ""} ${item.description || ""} ${item.knowledge || ""}`.toLowerCase();
      return combinedText.includes(query);
    });
  }, [items, search]);

  const handleDelete = (knowledgeId) => {
    setDeleteTarget(knowledgeId);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeletingKnowledgeId(deleteTarget);
      await callApi("DELETE", `/knowledge/${deleteTarget}`);
      setItems((current) =>
        current.filter((item) => getKnowledgeId(item) !== deleteTarget),
      );
      setDeleteTarget(null);
      setMessageBox({
        open: true,
        type: "success",
        text: "Knowledge item deleted successfully.",
      });
    } catch (error) {
      setMessageBox({
        open: true,
        type: "error",
        text:
          error?.message ||
          error?.error ||
          "Failed to delete the knowledge item.",
      });
    } finally {
      setDeletingKnowledgeId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {loading && <GlobalLoader fullPage message="Loading knowledge base..." />}

      {messageBox.open && (
        <MessageOverlay
          type={messageBox.type}
          text={messageBox.text}
          onClose={() => setMessageBox({ open: false, type: "", text: "" })}
        />
      )}

      {deleteTarget && (
        <MessageOverlay
          type="confirm"
          title="Delete knowledge?"
          text="This knowledge item will be removed from the bot."
          confirmText="Delete Item"
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          isProcessing={deletingKnowledgeId === deleteTarget}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: colors.textPrimary }}
          >
            Bot Knowledge Base
          </h1>
          <p className="text-sm italic" style={{ color: colors.textSecondary }}>
            Train your bot by adding product details it can use to reply to
            customers.
          </p>
        </div>

        <button
          className="w-full md:w-auto px-6 py-3 rounded-2xl text-white flex gap-2 items-center justify-center font-bold transition-all hover:scale-105"
          style={{
            background: colors.primary,
            boxShadow: `0 10px 20px -5px ${colors.primary}60`,
          }}
          onClick={() => navigate(`/chatBotDashboard/${botId}/knowledge/add`)}
        >
          <Plus size={20} />
          ADD KNOWLEDGE FIELD
        </button>
      </div>

      <div className="mb-8 relative group">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40"
          size={20}
          style={{ color: colors.textPrimary }}
        />
        <input
          type="text"
          placeholder="Search products or keywords..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] outline-none border-none shadow-sm transition-shadow focus:shadow-md"
          style={{ background: colors.cardBg, color: colors.textPrimary }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {!botId && !loading && (
          <div
            className="col-span-full rounded-[2rem] border border-dashed p-10 text-center"
            style={{ background: colors.cardBg, borderColor: colors.border }}
          >
            <h3
              className="text-xl font-bold mb-2"
              style={{ color: colors.textPrimary }}
            >
              Select a bot first
            </h3>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Open a bot from the management page so we know where to save its
              knowledge.
            </p>
          </div>
        )}

        {botId && !loading && filteredItems.length === 0 && (
          <div
            className="col-span-full rounded-[2rem] border border-dashed p-10 text-center"
            style={{ background: colors.cardBg, borderColor: colors.border }}
          >
            <h3
              className="text-xl font-bold mb-2"
              style={{ color: colors.textPrimary }}
            >
              No knowledge yet
            </h3>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Add your first item and let the agent help complete the missing
              selling details.
            </p>
          </div>
        )}

        {filteredItems.map((item) => {
          const knowledgeId = getKnowledgeId(item);
          const previewImage = item.images?.[0];
          const isDeleting = deletingKnowledgeId === knowledgeId;

          return (
            <div
              key={knowledgeId}
              className="rounded-[2.5rem] overflow-hidden border transition-all duration-300 hover:shadow-xl group"
              style={{ background: colors.cardBg, borderColor: colors.border }}
            >
              <div className="h-44 overflow-hidden relative">
                {previewImage ? (
                  <>
                    <img
                      src={previewImage.imageurl || previewImage.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {item.images?.length > 1 && (
                      <div
                        className="absolute left-4 bottom-4 px-3 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur-sm"
                        style={{ color: colors.textPrimary }}
                      >
                        +{item.images.length - 1} more
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      background: `${colors.primary}10`,
                      color: colors.primary,
                    }}
                  >
                    <ImageOff size={30} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(knowledgeId)}
                  disabled={isDeleting}
                  className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-sm cursor-pointer hover:text-red-500 transition-colors disabled:opacity-60"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={14} style={{ color: colors.primary }} />
                  <span
                    className="text-[10px] uppercase font-black tracking-widest opacity-50"
                    style={{ color: colors.textSecondary }}
                  >
                    {item.images?.length
                      ? `${item.images.length} image references`
                      : "Knowledge field"}
                  </span>
                </div>

                <h3
                  className="text-xl font-bold mb-3"
                  style={{ color: colors.textPrimary }}
                >
                  {item.name}
                </h3>

                <p
                  className="text-sm leading-relaxed mb-6"
                  style={{ color: colors.textSecondary }}
                >
                  {item.description || item.knowledge}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/chatBotDashboard/${botId}/knowledge/${knowledgeId}`,
                      )
                    }
                    disabled={isDeleting}
                    className="py-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs uppercase transition-colors hover:bg-gray-50 disabled:opacity-60"
                    style={{
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    }}
                  >
                    <Eye size={14} /> View
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/chatBotDashboard/${botId}/knowledge/${knowledgeId}/edit`,
                      )
                    }
                    disabled={isDeleting}
                    className="py-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs uppercase transition-colors hover:bg-gray-50 disabled:opacity-60"
                    style={{
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    }}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
