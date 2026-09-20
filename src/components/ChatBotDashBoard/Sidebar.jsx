import { NavLink, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { X, LayoutDashboard, BookOpen, MessageCircle, Smartphone } from "lucide-react";

const navItems = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, path: "" },
  { key: "knowledge", label: "Knowledge", icon: BookOpen, path: "knowledge" },
  { key: "whatsapp", label: "WhatsApp Config", icon: Smartphone, path: "whatsapp-config" },
  { key: "test-chat", label: "Test Chat", icon: MessageCircle, path: "test-chat" },
];

export default function Sidebar({ onClose }) {
  const colors = useSelector((state) => state.theme.colors);
  const { botId } = useParams();

  const getNavLinkClass = ({ isActive }) => {
    const base = "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold mb-1";
    return isActive ? `${base} shadow-sm border-l-4` : `${base} hover:bg-gray-50`;
  };

  const activeStyle = (isActive) =>
    isActive
      ? {
          backgroundColor: `${colors.primary}15`,
          color: colors.primary,
          borderColor: colors.primary,
        }
      : {
          color: colors.textSecondary,
        };

  return (
    <aside
      className="w-72 h-full border-r p-6 flex flex-col gap-8 overflow-y-auto transition-colors duration-300"
      style={{ background: colors.cardBg, borderColor: colors.border }}
    >
      {onClose && (
        <button
          className="md:hidden self-end p-2 rounded-full hover:bg-gray-100"
          onClick={onClose}
          style={{ color: colors.textPrimary }}
        >
          <X size={20} />
        </button>
      )}

      <section>
        <div className="flex items-center gap-2 mb-6 px-2">
          <h3
            className="uppercase tracking-widest text-[10px] font-black opacity-50"
            style={{ color: colors.textSecondary }}
          >
            Bot Menu
          </h3>
        </div>

        <nav className="flex flex-col">
          {navItems.map((item) => {
            const Icon = item.icon;
            const to = item.path
              ? `/chatBotDashboard/${botId}/${item.path}`
              : `/chatBotDashboard/${botId}`;

            return (
              <NavLink
                key={item.key}
                to={to}
                end={item.path === ""}
                className={getNavLinkClass}
                style={({ isActive }) => activeStyle(isActive)}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </section>

      <div
        className="mt-auto p-4 rounded-2xl text-center border border-dashed"
        style={{ background: colors.outerBackground, borderColor: colors.border }}
      >
        <p className="text-[10px] font-bold opacity-40 uppercase" style={{ color: colors.textPrimary }}>
          CBot Dashboard
        </p>
      </div>
    </aside>
  );
}
