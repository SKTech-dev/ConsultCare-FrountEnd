import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Edit3, ImageOff } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { callApi } from "../../api/apiClient";
import GlobalLoader from "../../components/ui/GlobalLoader";
import { MessageOverlay } from "../../components/ui/MessageBox";

export default function KnowledgeDetails() {
  const colors = useSelector((state) => state.theme.colors);
  const navigate = useNavigate();
  const { botId, knowledgeId } = useParams();

  const [item, setItem] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [messageBox, setMessageBox] = useState({
    open: false,
    type: "",
    text: "",
  });

  useEffect(() => {
    async function loadDetails() {
      try {
        setLoading(true);

        const [knowledgeResponse, imagesResponse] = await Promise.all([
          callApi("GET", `/knowledge/${knowledgeId}`),
          callApi("GET", `/images/knowledge/${knowledgeId}`),
        ]);

        setItem(knowledgeResponse.data);
        setImages(imagesResponse.data || []);
      } catch (error) {
        setMessageBox({
          open: true,
          type: "error",
          text: error?.message || error?.detail || error?.error || "Failed to load knowledge details.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadDetails();
  }, [knowledgeId]);

  const normalizedImages = useMemo(
    () =>
      images.map((image) => ({
        id: image.imageid || image.imageId,
        url: image.imageurl || image.imageUrl,
        description: image.description || "",
      })),
    [images]
  );

  const selectedImage = normalizedImages[selectedImageIndex];

  return (
    <div className="max-w-6xl mx-auto">
      {loading && <GlobalLoader message="Loading knowledge details..." />}

      {messageBox.open && (
        <MessageOverlay
          type={messageBox.type}
          text={messageBox.text}
          onClose={() => setMessageBox({ open: false, type: "", text: "" })}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate(`/chatBotDashboard/${botId}/knowledge`)}
            className="flex items-center gap-2 mb-4 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: colors.textPrimary }}
          >
            <ArrowLeft size={18} /> BACK TO KNOWLEDGE BASE
          </button>

          <h1 className="text-4xl font-bold mb-2" style={{ color: colors.textPrimary }}>
            {item?.name || "Knowledge details"}
          </h1>
          <p className="text-sm italic" style={{ color: colors.textSecondary }}>
            Full product context, images, and selling knowledge for this bot.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/chatBotDashboard/${botId}/knowledge/${knowledgeId}/edit`)}
          className="px-6 py-3 rounded-2xl text-white flex gap-2 items-center font-bold transition-all hover:scale-105 self-start"
          style={{
            background: colors.primary,
            boxShadow: `0 10px 20px -5px ${colors.primary}60`,
          }}
        >
          <Edit3 size={18} />
          EDIT KNOWLEDGE
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8">
        <section
          className="rounded-[2.5rem] border overflow-hidden"
          style={{ background: colors.cardBg, borderColor: colors.border }}
        >
          <div className="h-[360px] md:h-[440px] overflow-hidden flex items-center justify-center" style={{ background: `${colors.primary}08` }}>
            {selectedImage ? (
              <img
                src={selectedImage.url}
                alt={item?.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-3" style={{ color: colors.primary }}>
                <ImageOff size={40} />
                <p className="text-sm font-semibold">No image preview available</p>
              </div>
            )}
          </div>

          {normalizedImages.length > 0 && (
            <div className="p-6 border-t space-y-4" style={{ borderColor: colors.border }}>
              <div className="flex items-center gap-2">
                <BookOpen size={16} style={{ color: colors.primary }} />
                <span className="text-[11px] uppercase font-black tracking-widest opacity-60" style={{ color: colors.textSecondary }}>
                  Image Notes
                </span>
              </div>

              {normalizedImages.map((image, index) => (
                <div
                  key={image.id || index}
                  className="rounded-[1.5rem] border p-4"
                  style={{
                    borderColor: selectedImageIndex === index ? colors.primary : colors.border,
                    background: selectedImageIndex === index ? `${colors.primary}08` : colors.outerBackground,
                  }}
                >
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className="w-20 h-20 rounded-2xl overflow-hidden border flex-shrink-0"
                      style={{ borderColor: selectedImageIndex === index ? colors.primary : colors.border }}
                    >
                      <img
                        src={image.url}
                        alt={image.description || item?.name}
                        className="w-full h-full object-cover"
                      />
                    </button>

                    <div>
                      <p className="text-sm font-bold mb-1" style={{ color: colors.textPrimary }}>
                        Image {index + 1}
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                        {image.description || "No image description added."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div
            className="rounded-[2rem] border p-6"
            style={{ background: colors.cardBg, borderColor: colors.border }}
          >
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} style={{ color: colors.primary }} />
              <span className="text-[11px] uppercase font-black tracking-widest opacity-60" style={{ color: colors.textSecondary }}>
                Summary
              </span>
            </div>
            <p className="text-base leading-relaxed" style={{ color: colors.textPrimary }}>
              {item?.description || "No short description available."}
            </p>
          </div>

          <div
            className="rounded-[2rem] border p-6"
            style={{ background: colors.cardBg, borderColor: colors.border }}
          >
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} style={{ color: colors.primary }} />
              <span className="text-[11px] uppercase font-black tracking-widest opacity-60" style={{ color: colors.textSecondary }}>
                Full Knowledge
              </span>
            </div>
            <div
              className="text-sm leading-7 whitespace-pre-wrap"
              style={{ color: colors.textSecondary }}
            >
              {item?.knowledge || "No detailed knowledge available."}
            </div>
          </div>

          <div
            className="rounded-[2rem] border p-6"
            style={{ background: colors.cardBg, borderColor: colors.border }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase font-black tracking-widest opacity-60" style={{ color: colors.textSecondary }}>
                Media
              </span>
              <span className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                {normalizedImages.length} image{normalizedImages.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Use this page to inspect exactly what image references the bot can use in future replies.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
