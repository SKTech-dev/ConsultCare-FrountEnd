import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Footer from "../../components/Footer";
import { useSelector } from "react-redux";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { callApi } from "../../api/apiClient";
import { MessageOverlay } from "../../components/ui/MessageBox";
import GlobalLoader from "../../components/ui/GlobalLoader";

export default function VerifyOTP() {
  const colors = useSelector((state) => state.theme.colors);
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";

  const [formData, setFormData] = useState({
    otp: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [messageBox, setMessageBox] = useState({
    open: false,
    type: "",
    text: "",
  });

  /* ---------------- VALIDATION ---------------- */
  const validate = (value) => {
    if (!value) return "OTP required";
    if (value.length !== 6) return "OTP must be 6 digits";
    return "";
  };

  /* ---------------- HANDLE CHANGE ---------------- */
  const handleChange = (e) => {
    const value = e.target.value;

    setFormData({ otp: value });

    setErrors({
      otp: validate(value),
    });
  };

  /* ---------------- HANDLE SUBMIT ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validate(formData.otp);
    if (error) {
      setErrors({ otp: error });
      return;
    }

    try {
      setLoading(true);

      const response = await callApi("POST", "/auth/confirm-otp", {
        email,
        token: formData.otp,
      });

      setLoading(false);

      setMessageBox({
        open: true,
        type: "success",
        text: response?.message || "OTP verified successfully",
      });
    } catch (error) {
      setLoading(false);

      setMessageBox({
        open: true,
        type: "error",
        text: error?.response?.data?.message || error?.message || "Invalid OTP",
      });
    }
  };

  return (
    <main
      className="min-h-screen font-sans flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6"
      style={{ backgroundColor: colors.outerBackground }}
    >
      {loading && <GlobalLoader fullPage message="Sending OTP..." />}

      {messageBox.open && (
        <MessageOverlay
          type={messageBox.type}
          text={messageBox.text}
          onClose={() => {
            setMessageBox({ open: false, type: "", text: "" });

            if (messageBox.type === "success") {
              navigate("/change-password", {
                state: {
                  email,
                  token: formData.otp,
                },
              });
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
                  Verify OTP
                </h1>

                <p
                  className="text-sm sm:text-base"
                  style={{ color: colors.textMuted }}
                >
                  Enter the OTP sent to your email.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <Input
                  label="OTP Code"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  placeholder="Enter 6-digit OTP"
                  error={errors.otp}
                />

                <Button type="submit">Verify OTP</Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate("/login")}
                  className="text-sm hover:underline"
                  style={{ color: colors.secondary }}
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        </section>

        <Footer colors={colors} />
      </div>
    </main>
  );
}
