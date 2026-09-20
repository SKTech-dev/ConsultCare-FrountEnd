import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { clearAuthUser } from "../../features/auth/authSlice";
import { callApi } from "../../api/apiClient";

export default function useLogoutFlow() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [messageBox, setMessageBox] = useState({
    open: false,
    type: "",
    text: "",
  });

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await callApi("POST", "/auth/logout");
      setMessageBox({
        open: true,
        type: "success",
        text: "Logged out successfully.",
      });
    } catch (error) {
      setMessageBox({
        open: true,
        type: "error",
        text: error?.message || error?.error || "Failed to log out.",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const closeMessageBox = () => {
    const wasSuccess = messageBox.type === "success";
    setMessageBox({ open: false, type: "", text: "" });

    if (wasSuccess) {
      dispatch(clearAuthUser());
      navigate("/login");
    }
  };

  return {
    loggingOut,
    messageBox,
    handleLogout,
    closeMessageBox,
  };
}
