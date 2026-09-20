import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer";
import { useDispatch, useSelector } from "react-redux";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { callApi } from "../../api/apiClient";
import { MessageOverlay } from "../../components/ui/MessageBox";
import GlobalLoader from "../../components/ui/GlobalLoader";
import { setAuthUser } from "../../features/auth/authSlice";

export default function Login() {
  const colors = useSelector((state) => state.theme.colors);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({});

  const [messageBox, setMessageBox] = useState({
    open: false,
    type: "",
    text: "",
  });
  const [loggedInUser, setLoggedInUser] = useState(null);

  // ---------------- VALIDATION ----------------
  const validate = (name, value) => {
    let error = "";

    if (name === "email") {
      if (!value) error = "Email required";
      else if (!/\S+@\S+\.\S+/.test(value)) error = "Invalid email";
    }

    if (name === "password") {
      if (!value) error = "Password required";
      else if (value.length < 6) error = "Minimum 6 characters";
    }

    return error;
  };

  // ---------------- HANDLE CHANGE ----------------
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

  // ---------------- HANDLE SUBMIT ----------------
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

      const payload = {
        email: formData.email,
        password: formData.password,
      };

      const response = await callApi("POST", "/auth/login", payload);
      setLoading(false);
      setLoggedInUser(response.data);

      setMessageBox({
        open: true,
        type: "success",
        text: response?.message || "Login successfully",
      });

      // reset form
      setFormData({
        email: "",
        password: "",
      });
    } catch (error) {
      setLoading(false);

      setMessageBox({
        open: true,
        type: "error",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Failed login to company",
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
            const wasSuccess = messageBox.type === "success";
            setMessageBox({ open: false, type: "", text: "" });

            if (wasSuccess && loggedInUser) {
              dispatch(setAuthUser(loggedInUser));
              navigate("/chatBots");
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
                  Login to Your Company Account
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
                  label="Email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                  error={errors.email}
                />

                <div className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <label
                      className="text-sm font-medium"
                      style={{ color: colors.secondary }}
                    >
                      Password
                    </label>
                    <button
                      onClick={() => navigate("/forgot-password")}
                      className="text-xs hover:underline"
                      style={{ color: colors.secondary }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                    error={errors.password}
                  />
                </div>
                <Button type="submit">Login</Button>
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
