import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bot, MessageSquare, Sparkles } from "lucide-react";

import Navbar from "../../components/bots/Navbar";
import Input from "../../components/ui/Input";
import { MessageOverlay } from "../../components/ui/MessageBox";
import { callApi } from "../../api/apiClient";
import GlobalLoader from "../../components/ui/GlobalLoader";

const initialFormData = {
  name: "",
  description: "",
  phone_number_id: "",
  display_phone_number: "",
};

export default function CreateChatBot() {
  const colors = useSelector((state) => state.theme.colors);
  const navigate = useNavigate();
  const { botId } = useParams();
  const isEditMode = Boolean(botId);

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [messageBox, setMessageBox] = useState({
    open: false,
    type: "",
    text: "",
  });

  useEffect(() => {
    async function loadBot() {
      if (!isEditMode) {
        return;
      }

      try {
        setLoading(true);
        const response = await callApi("GET", `/bots/${botId}`);
        const bot = response.data;

        setFormData({
          name: bot.name || "",
          description: bot.description || "",
          phone_number_id: bot.phone_number_id || "",
          display_phone_number: bot.display_phone_number || "",
        });
      } catch (error) {
        setMessageBox({
          open: true,
          type: "error",
          text: error?.message || error?.error || "Failed to load bot details.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadBot();
  }, [botId, isEditMode]);

  const validateField = (name, value) => {
    if (name === "name" && !value.trim()) {
      return "Bot name required";
    }

    if (name === "description" && !value.trim()) {
      return "Description required";
    }

    if (name === "display_phone_number" && !value.trim()) {
      return "Display number required";
    }

    return "";
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: validateField(name, value),
    }));
  };

  const validateForm = () => {
    const nextErrors = {
      name: validateField("name", formData.name),
      description: validateField("description", formData.description),
      display_phone_number: validateField("display_phone_number", formData.display_phone_number),
    };

    setErrors(nextErrors);
    return Object.values(nextErrors).every((error) => !error);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        phone_number_id: formData.phone_number_id.trim() || null,
        display_phone_number: formData.display_phone_number.trim(),
      };

      const response = isEditMode
        ? await callApi("PUT", `/bots/${botId}`, payload)
        : await callApi("POST", "/bots/", payload);

      setMessageBox({
        open: true,
        type: "success",
        text:
          response?.message ||
          (isEditMode ? "Bot updated successfully" : "Bot created successfully"),
      });

      if (!isEditMode) {
        setFormData(initialFormData);
      }
    } catch (error) {
      setMessageBox({
        open: true,
        type: "error",
        text:
          error?.message ||
          error?.error ||
          (isEditMode ? "Failed to update bot" : "Failed to create bot"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen transition-colors duration-300 pb-20"
      style={{ background: colors.background }}
    >
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-8 md:pt-10">
        {(loading || saving) && (
          <GlobalLoader
            fullPage
            message={
              loading
                ? "Loading bot details..."
                : isEditMode
                  ? "Updating bot..."
                  : "Creating bot..."
            }
          />
        )}

        {messageBox.open && (
          <MessageOverlay
            type={messageBox.type}
            text={messageBox.text}
            onClose={() => {
              setMessageBox({ open: false, type: "", text: "" });

              if (messageBox.type === "success") {
                navigate("/chatBots");
              }
            }}
          />
        )}

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-8 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: colors.textPrimary }}
        >
          <ArrowLeft size={18} /> BACK TO BOTS
        </button>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          <div className="flex-1">
            <h4
              className="uppercase tracking-[0.2em] text-[10px] font-black mb-2 opacity-60"
              style={{ color: colors.textSecondary }}
            >
              {isEditMode ? "Bot Update" : "New Automation"}
            </h4>
            <h1
              className="text-4xl md:text-5xl font-bold leading-tight mb-6"
              style={{ color: colors.textPrimary }}
            >
              {isEditMode ? "Refine Your" : "Create Your"} <br />
              <span style={{ color: colors.primary }}>AI Assistant.</span>
            </h1>
            <p className="text-lg leading-relaxed mb-8" style={{ color: colors.textSecondary }}>
              Keep the bot identity and WhatsApp details together so your automation stays easy to
              manage.
            </p>

            <div className="space-y-4">
              <div
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 border border-dashed"
                style={{ borderColor: colors.border }}
              >
                <div className="p-3 rounded-xl bg-orange-100 text-orange-600">
                  <Bot size={20} />
                </div>
                <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                  WhatsApp-ready bot identity
                </p>
              </div>

              <div
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 border border-dashed"
                style={{ borderColor: colors.border }}
              >
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                  <Sparkles size={20} />
                </div>
                <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                  Reusable setup for future channels
                </p>
              </div>
            </div>
          </div>

          <div
            className="w-full md:w-[480px] rounded-[3rem] p-6 sm:p-8 md:p-10 shadow-2xl border"
            style={{ background: colors.cardBg, borderColor: colors.border }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Bot Identity Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. ClothShop Sales Pro"
                required
                error={errors.name}
              />

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.secondary }}>
                  Service Description
                </label>
                <textarea
                  name="description"
                  required
                  rows="5"
                  placeholder="Briefly describe what this bot does for customers."
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 text-sm transition resize-none"
                  style={{
                    borderColor: errors.description ? "#ef4444" : colors.border,
                    backgroundColor: colors.outerBackground,
                    color: colors.secondary,
                  }}
                  value={formData.description}
                  onChange={handleChange}
                />
                {errors.description && (
                  <p className="text-[10px] font-bold text-red-500 mt-1 ml-1 uppercase">
                    {errors.description}
                  </p>
                )}
              </div>

              <Input
                label="Phone Number ID"
                name="phone_number_id"
                value={formData.phone_number_id}
                onChange={handleChange}
                placeholder="Optional Meta phone number ID"
              />

              <Input
                label="Display Phone Number"
                name="display_phone_number"
                value={formData.display_phone_number}
                onChange={handleChange}
                placeholder="e.g. +94 77 123 4567"
                required
                error={errors.display_phone_number}
              />

              <button
                type="submit"
                disabled={saving || loading}
                className="w-full py-5 rounded-[1.5rem] text-white font-bold flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                style={{
                  background: colors.primary,
                  boxShadow: `0 15px 30px -10px ${colors.primary}60`,
                }}
              >
                <MessageSquare size={20} />
                {saving
                  ? isEditMode
                    ? "SAVING BOT..."
                    : "CREATING BOT..."
                  : isEditMode
                    ? "SAVE BOT CHANGES"
                    : "INITIALIZE BOT"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
