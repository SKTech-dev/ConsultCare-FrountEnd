import { Edit, Settings, Trash2 } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

export default function BotCard({ bot, onDelete, isDeleting = false }) {
  const colors = useSelector((state) => state.theme.colors);
  const navigate = useNavigate();

  return (
    <div
      className="rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-300 border p-5 group"
      style={{
        background: colors.cardBg,
        borderColor: colors.border,
      }}
    >
      <div className="relative overflow-hidden rounded-[1.8rem] mb-5">
        <img
          src={"https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80"}
          alt={bot.name}
          className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      <div className="px-2">
        <h3
          className="text-xl font-bold mb-1"
          style={{ color: colors.textPrimary, fontFamily: "Volkhov, serif" }}
        >
          {bot.name}
        </h3>

        <p className="text-sm mb-4 line-clamp-2 italic" style={{ color: colors.textSecondary }}>
          {bot.description}
        </p>

        <div className="flex justify-between items-center mb-6">
          <span
            className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-opacity-10"
            style={{ backgroundColor: colors.primary, color: colors.primary }}
          >
            WhatsApp Bot
          </span>
          <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
            {bot.users} Users
          </p>
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
            style={{ borderColor: colors.border, color: colors.textPrimary }}
            onClick={() => navigate(`/editChatBot/${bot.bid}`)}
            disabled={isDeleting}
          >
            <Edit size={16} />
            Edit
          </button>

          <button
            className="flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
            style={{ borderColor: colors.border, color: colors.textPrimary }}
            onClick={() => navigate(`/chatBotDashboard/${bot.bid}`)}
            disabled={isDeleting}
          >
            <Settings size={16} />
            Manage
          </button>
        </div>

        <button
          className="w-full mt-3 py-3 rounded-xl border flex items-center justify-center gap-2 font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
          style={{ borderColor: colors.border, color: colors.error }}
          onClick={() => onDelete?.(bot)}
          disabled={isDeleting}
        >
          <Trash2 size={16} />
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
