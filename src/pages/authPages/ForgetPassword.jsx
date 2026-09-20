import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer";
import { useSelector } from "react-redux";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { callApi } from "../../api/apiClient";
import { MessageOverlay } from "../../components/ui/MessageBox";
import GlobalLoader from "../../components/ui/GlobalLoader";

export default function ForgetPassword() {
  const colors = useSelector((state) => state.theme.colors);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
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
    let error = "";

    if (name === "email") {
      if (!value) error = "Email required";
      else if (!/\S+@\S+\.\S+/.test(value)) error = "Invalid email";
    }

    return error;
  };

  /* ---------------- HANDLE CHANGE ---------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    const error = validate(name, value);

    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  /* ---------------- HANDLE SUBMIT ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validate(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);

      const response = await callApi(
        "POST",
        "/auth/forget-password",
        formData
      );

      setLoading(false);

      setMessageBox({
        open: true,
        type: "success",
        text: response?.message || "OTP sent successfully",
      });

    } catch (error) {
      setLoading(false);

      setMessageBox({
        open: true,
        type: "error",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Failed sending OTP",
      });
    }
  };

  return (
    <main
      className="min-h-screen font-sans flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6"
      style={{ backgroundColor: colors.outerBackground }}
    >
      {loading && (
        <GlobalLoader fullPage message="Sending OTP..." />
      )}

      {messageBox.open && (
        <MessageOverlay
          type={messageBox.type}
          text={messageBox.text}
          onClose={() => {
            setMessageBox({ open: false, type: "", text: "" });

            if (messageBox.type === "success") {
              navigate("/verify-otp", {
                state: { email: formData.email },
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
                  Forget Password
                </h1>

                <p
                  className="text-sm sm:text-base"
                  style={{ color: colors.textMuted }}
                >
                  Enter your registered email to receive an OTP.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

                <Input
                  label="Email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                  error={errors.email}
                />

                <Button type="submit">
                  Send OTP
                </Button>

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