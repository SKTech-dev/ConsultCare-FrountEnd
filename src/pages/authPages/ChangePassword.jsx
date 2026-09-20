import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Footer from "../../components/Footer";
import { useSelector } from "react-redux";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { callApi } from "../../api/apiClient";
import { MessageOverlay } from "../../components/ui/MessageBox";
import GlobalLoader from "../../components/ui/GlobalLoader";

export default function ChangePassword() {
  const colors = useSelector((state) => state.theme.colors);
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;
  const token = location.state?.token;

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [messageBox, setMessageBox] = useState({
    open: false,
    type: "",
    text: "",
  });

  /* ---------------- VALIDATION ---------------- */
  const validate = (name, value) => {
    if (name === "password") {
      if (!value) return "Password required";
      if (value.length < 6) return "Minimum 6 characters";
    }

    if (name === "confirmPassword") {
      if (value !== formData.password) {
        return "Passwords do not match";
      }
    }

    return "";
  };

  /* ---------------- HANDLE CHANGE ---------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: validate(name, value),
    }));
  };

  /* ---------------- HANDLE SUBMIT ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await callApi("POST", "/auth/change-password", {
        email,
        token,
        new_password: formData.password,
      });

      setLoading(false);

      setMessageBox({
        open: true,
        type: "success",
        text: response?.message || "Password updated successfully",
      });
    } catch (error) {
      setLoading(false);

      setMessageBox({
        open: true,
        type: "error",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Password change failed",
      });
    }
  };

  return (
    <main
      className="min-h-screen font-sans flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6"
      style={{ backgroundColor: colors.outerBackground }}
    >
      {loading && <GlobalLoader fullPage message="Logging in..." />}
      {messageBox.open && (
        <MessageOverlay
          type={messageBox.type}
          text={messageBox.text}
          onClose={() => {
            setMessageBox({ open: false, type: "", text: "" });

            if (messageBox.type === "success") {
              navigate("/login");
            }
          }}
        />
      )}

      <div
        className="rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl w-full max-w-6xl overflow-hidden"
        style={{ backgroundColor: colors.background }}
      >
        <section className="flex items-center justify-center py-8 sm:py-12 lg:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-md w-full">
            <div className="p-6 sm:p-8">
              <div className="text-center mb-6 sm:mb-8">
                <h1
                  className="text-2xl sm:text-3xl font-bold mb-2"
                  style={{ color: colors.secondary }}
                >
                  Change Password
                </h1>

                <p
                  className="text-sm sm:text-base"
                  style={{ color: colors.textMuted }}
                >
                  Log in to your account to get started.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <Input
                  label="New Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  placeholder="Enter new password"
                />

                <Input
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  placeholder="Confirm password"
                />
                <Button type="submit">Update Password</Button>
              </form>

              {/* Added Login Link Section */}
              <div className="mt-4 text-center">
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  Don't have an account?{" "}
                  <a
                    href="/setup"
                    className="font-semibold hover:underline"
                    style={{ color: colors.secondary }}
                  >
                    Set up here
                  </a>
                </p>
              </div>

              <div className="mt-6 text-center">
                <p
                  className="text-xs sm:text-sm"
                  style={{ color: colors.textMuted }}
                >
                  By logging in, you agree to our Terms of Service and Privacy
                  Policy.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Footer colors={colors} />
      </div>
    </main>
  );
}
