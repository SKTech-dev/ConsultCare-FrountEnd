import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../../components/ChatBotDashBoard/NavBar";
import Sidebar from "../../components/ChatBotDashBoard/Sidebar";

export default function ChatBotDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col">
      {/* Navbar */}
      <Navbar onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (desktop) */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />

            <div className="fixed left-0 top-0 h-full w-72 bg-white z-50 md:hidden">
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
