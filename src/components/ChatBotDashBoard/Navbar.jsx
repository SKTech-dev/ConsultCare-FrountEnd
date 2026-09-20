import { Bell, LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import GlobalLoader from "../ui/GlobalLoader";
import { MessageOverlay } from "../ui/MessageBox";
import useLogoutFlow from "../auth/useLogoutFlow";

export default function Navbar({ onMenuClick }) {
  const colors = useSelector((state) => state.theme.colors);
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const { loggingOut, messageBox, handleLogout, closeMessageBox } = useLogoutFlow();

  return (
    <>
      {loggingOut && <GlobalLoader fullPage message="Logging out..." />}
      {messageBox.open && (
        <MessageOverlay
          type={messageBox.type}
          text={messageBox.text}
          onClose={closeMessageBox}
        />
      )}

      <nav
        className="flex items-center justify-between px-4 md:px-12 py-6 border-b"
        style={{
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
        }}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-full"
            style={{ color: colors.textPrimary }}
          >
            <Menu size={20} />
          </button>

          <div
            className="text-3xl font-bold tracking-tighter"
            style={{ color: colors.textPrimary }}
          >
            CBot<span style={{ color: colors.primary }}>.</span>
          </div>
        </div>

        <div className="hidden md:flex space-x-10 items-center font-semibold text-sm uppercase tracking-widest">
          <button
            onClick={() => navigate("/chatBots")}
            className="hover:opacity-70 transition-opacity"
            style={{ color: colors.primary }}
          >
            Bots
          </button>
          <button
            className="hover:opacity-70 transition-opacity"
            style={{ color: colors.textPrimary }}
          >
            WhatsApp
          </button>
          <button
            className="hover:opacity-70 transition-opacity"
            style={{ color: colors.textPrimary }}
          >
            Knowledge
          </button>
        </div>

        <div className="flex items-center space-x-6">
          <div className="relative cursor-pointer hidden md:block" style={{ color: colors.textPrimary }}>
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
          </div>

          <div className="flex items-center space-x-3 pl-6 border-l" style={{ borderColor: colors.border }}>
            <div
              className="w-10 h-10 rounded-full overflow-hidden border-2"
              style={{ borderColor: colors.primary }}
            >
              <img src="https://i.pravatar.cc/150?u=cbot" alt="User Profile" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold" style={{ color: colors.textPrimary }}>
                {user?.company || "Company"}
              </p>
              <p
                className="text-[10px] uppercase font-bold opacity-50"
                style={{ color: colors.textSecondary }}
              >
                {user?.email || "Signed in"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-full transition-colors hover:bg-white/60"
              style={{ color: colors.textSecondary }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
