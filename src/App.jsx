import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

import Home from "./pages/Home";
import Setup from "./pages/authPages/Setup";
import Login from "./pages/authPages/Login";
import ForgetPassword from "./pages/authPages/ForgetPassword";
import VerifyOTP from "./pages/authPages/VerifyOTP";
import ChangePassword from "./pages/authPages/ChangePassword";
import ChatBots from "./pages/bots/ChatBots";
import DestinationManager from "./pages/Dumby/ChatBotDumby";
import ChatBotDashboard from "./pages/ChatBotDashBoard/ChatBotDashBoard";
import AddKnowledge from "./pages/ChatBotDashBoard/AddKnowledge";
import KnowledgeDetails from "./pages/ChatBotDashBoard/KnowledgeDetails";
import KnowledgeBase from "./pages/ChatBotDashBoard/KnowledgeBase";
import Overview from "./pages/ChatBotDashBoard/Overview";
import TestChat from "./pages/ChatBotDashBoard/TestChat";
import WhatsAppConfig from "./pages/ChatBotDashBoard/WhatsAppConfig";
import CreateChatBot from "./pages/bots/CreateChatBot";
import Payment from "./pages/pay/Payment";
import Consultation from "./pages/Consultation";
import RoleDashboard from "./pages/RoleDashboard";
import AccessDenied from "./pages/AccessDenied";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import { fetchCurrentUser } from "./features/auth/authSlice";

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/consult/doctors" element={<Consultation profession="doctor" />} />
        <Route path="/consult/lawyers" element={<Consultation profession="lawyer" />} />
        <Route path="/access-denied" element={<AccessDenied />} />
        {Object.entries({ user: "/dashboard", doctor: "/doctor/dashboard", lawyer: "/lawyer/dashboard", admin: "/admin/dashboard" }).map(([role, path]) => (
          <Route key={role} element={<ProtectedRoute roles={[role]} />}>
            <Route path={path} element={<RoleDashboard />} />
          </Route>
        ))}

        <Route element={<PublicRoute />}>
          <Route path="/setup" element={<Setup />} />
          <Route path="/signup" element={<Setup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgetPassword />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/change-password" element={<ChangePassword />} />
        </Route>

        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="/chatBots" element={<ChatBots />} />
          <Route path="/createChatBot" element={<CreateChatBot />} />
          <Route path="/editChatBot/:botId" element={<CreateChatBot />} />

          <Route path="/chatBotDashboard/:botId" element={<ChatBotDashboard />}>
            <Route index element={<Overview />} />
            <Route path="knowledge" element={<KnowledgeBase />} />
            <Route path="knowledge/add" element={<AddKnowledge />} />
            <Route path="knowledge/:knowledgeId" element={<KnowledgeDetails />} />
            <Route path="knowledge/:knowledgeId/edit" element={<AddKnowledge />} />
            <Route path="whatsapp-config" element={<WhatsAppConfig />} />
            <Route path="test-chat" element={<TestChat />} />
          </Route>

          <Route path="/payment" element={<Payment />} />
          <Route path="/dumbyChatbot" element={<DestinationManager />} />
        </Route>
      </Routes>
    </Router>
  );
}
