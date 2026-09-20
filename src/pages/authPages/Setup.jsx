import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer";
import { useDispatch, useSelector } from "react-redux";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { callApi } from "../../api/apiClient";
import GlobalLoader from "../../components/ui/GlobalLoader";
import { MessageOverlay } from "../../components/ui/MessageBox";
import { setAuthUser } from "../../features/auth/authSlice";

export default function Setup() {
  const colors = useSelector((state) => state.theme.colors);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});

  const [messageBox, setMessageBox] = useState({
    open: false,
    type: "",
    text: "",
  });
  const [createdUser, setCreatedUser] = useState(null);

  // ---------------- VALIDATION ----------------
  const validate = (name, value) => {
    let error = "";

    if (name === "name") {
      if (!value) error = "Name required";
    }

    if (name === "email") {
      if (!value) error = "Email required";
      else if (!/\S+@\S+\.\S+/.test(value)) error = "Invalid email";
    }

    if (name === "password") {
      if (!value) error = "Password required";
      else if (value.length < 6) error = "Minimum 6 characters";
    }

    if (name === "confirmPassword") {
      if (!value) error = "Confirm password required";
      else if (value !== formData.password) error = "Passwords do not match";
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
        company: formData.name,
        email: formData.email,
        password: formData.password,
      };

      const response = await callApi("POST", "/auth/company", payload);
      setLoading(false);
      setCreatedUser(response.data);

      setMessageBox({
        open: true,
        type: "success",
        text: response?.message || "Company created successfully",
      });

      // reset form
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        category: "",
      });
    } catch (error) {
      setLoading(false);

      setMessageBox({
        open: true,
        type: "error",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to create company",
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

            if (wasSuccess && createdUser) {
              dispatch(setAuthUser(createdUser));
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
                  Set Up Your Company
                </h1>

                <p
                  className="text-sm sm:text-base"
                  style={{ color: colors.textMuted }}
                >
                  Create your account to get started with CreateBot
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <Input
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your company name"
                  error={errors.name}
                />

                <Input
                  label="Email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                  error={errors.email}
                />

                <Input
                  label="Password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Create a secure password"
                  error={errors.password}
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Re-enter password"
                  error={errors.confirmPassword}
                />

                <Button type="submit">Create Company</Button>
              </form>

              {/* Added Login Link Section */}
              <div className="mt-4 text-center">
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  Already have an account?{" "}
                  <a
                    href="/login"
                    className="font-semibold hover:underline"
                    style={{ color: colors.secondary }}
                  >
                    Log in here
                  </a>
                </p>
              </div>

              <div className="mt-6 text-center">
                <p
                  className="text-xs sm:text-sm"
                  style={{ color: colors.textMuted }}
                >
                  By creating an account, you agree to our Terms of Service and
                  Privacy Policy
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
