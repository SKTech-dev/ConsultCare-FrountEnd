import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Navbar from "../../components/bots/Navbar";
import BotCard from "../../components/bots/BotCard";
import { fetchBots } from "../../features/bots/botsSlice";
import { callApi } from "../../api/apiClient";
import GlobalLoader from "../../components/ui/GlobalLoader";
import { MessageOverlay } from "../../components/ui/MessageBox";

export default function ChatBots() {
  const colors = useSelector((state) => state.theme.colors);
  const bots = useSelector((state) => state.bots.bots);
  const loading = useSelector((state) => state.bots.loading);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [messageBox, setMessageBox] = useState({
    open: false,
    type: "",
    text: "",
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingBotId, setDeletingBotId] = useState(null);

  useEffect(() => {
    dispatch(fetchBots());
  }, [dispatch]);

  const filteredBots = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return bots;
    }

    return bots.filter((bot) => {
      const searchableText = `${bot.name || ""} ${bot.description || ""} ${bot.display_phone_number || ""}`.toLowerCase();
      return searchableText.includes(query);
    });
  }, [bots, search]);

  const handleDelete = async (bot) => {
    setDeleteTarget(bot);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeletingBotId(deleteTarget.bid);
      await callApi("DELETE", `/bots/${deleteTarget.bid}`);
      setDeleteTarget(null);
      setMessageBox({
        open: true,
        type: "success",
        text: "Bot deleted successfully.",
      });
      dispatch(fetchBots());
    } catch (error) {
      setMessageBox({
        open: true,
        type: "error",
        text: error?.message || error?.error || "Failed to delete bot.",
      });
    } finally {
      setDeletingBotId(null);
    }
  };

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: colors.background }}
    >
      {loading && <GlobalLoader fullPage message="Loading bots..." />}

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
          title="Delete bot?"
          text={`This will remove "${deleteTarget.name}" from your workspace.`}
          confirmText="Delete Bot"
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          isProcessing={deletingBotId === deleteTarget.bid}
        />
      )}

      <Navbar />

      <main className="p-6 md:p-12 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h4
              className="uppercase tracking-[0.2em] text-[10px] font-black mb-2 opacity-60"
              style={{ color: colors.textSecondary }}
            >
              Automation Dashboard
            </h4>
            <h1
              className="text-4xl md:text-5xl font-bold leading-tight"
              style={{ color: colors.textPrimary }}
            >
              WhatsApp Bot <br /> Management
            </h1>
          </div>

          <button
            className="px-8 py-4 rounded-2xl text-white flex gap-2 items-center font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: colors.primary,
              boxShadow: `0 12px 24px -10px ${colors.primary}80`,
            }}
            onClick={() => navigate("/createChatBot")}
          >
            <Plus size={20} />
            CREATE NEW BOT
          </button>
        </div>

        <div
          className="p-3 rounded-[1.5rem] mb-10 flex flex-wrap md:flex-nowrap gap-4 shadow-sm border border-opacity-10"
          style={{ background: colors.cardBg, borderColor: colors.border }}
        >
          <div className="relative flex-1 min-w-[280px]">
            <Search
              className="absolute left-4 top-3.5 opacity-40"
              size={20}
              style={{ color: colors.textPrimary }}
            />
            <input
              className="w-full pl-12 pr-4 py-3 rounded-xl outline-none border-none text-sm"
              placeholder="Find a bot by name or phone number..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ background: colors.inputBg, color: colors.textPrimary }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
          {Array.isArray(filteredBots) &&
            filteredBots.map((bot) => (
              <BotCard
                key={bot.bid}
                bot={bot}
                onDelete={handleDelete}
                isDeleting={deletingBotId === bot.bid}
              />
            ))}
        </div>

        {!loading && filteredBots.length === 0 && (
          <div
            className="mt-10 rounded-[2rem] border border-dashed p-10 text-center"
            style={{ background: colors.cardBg, borderColor: colors.border }}
          >
            <h3 className="text-xl font-bold mb-2" style={{ color: colors.textPrimary }}>
              No bots found
            </h3>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Create your first bot or adjust the search to find an existing one.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
