import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  ImagePlus,
  Plus,
  Trash2,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { callApi } from "../../api/apiClient";
import GlobalLoader from "../../components/ui/GlobalLoader";
import Input from "../../components/ui/Input";
import { MessageOverlay } from "../../components/ui/MessageBox";

const emptyImage = { imageUrl: "", description: "" };

function buildKnowledgeWithAnswers(knowledge, questions, answers) {
  const answeredLines = questions
    .map((question, index) => {
      const answer = answers[index]?.trim();
      if (!answer) {
        return null;
      }

      return `- ${question.question} ${answer}`;
    })
    .filter(Boolean);

  if (!answeredLines.length) {
    return knowledge;
  }

  return `${knowledge}\n\nAdditional selling details:\n${answeredLines.join("\n")}`;
}

export default function AddKnowledge() {
  const colors = useSelector((state) => state.theme.colors);
  const navigate = useNavigate();
  const { botId, knowledgeId } = useParams();
  const isEditMode = Boolean(knowledgeId);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    knowledge: "",
    images: [emptyImage],
  });
  const [existingImages, setExistingImages] = useState([]);
  const [reviewData, setReviewData] = useState({
    isComplete: false,
    missingSummary: "",
    questions: [],
  });
  const [questionAnswers, setQuestionAnswers] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [reviewing, setReviewing] = useState(false);
  const [answerReviewing, setAnswerReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [messageBox, setMessageBox] = useState({
    open: false,
    type: "",
    text: "",
  });

  useEffect(() => {
    async function loadKnowledgeItem() {
      if (!isEditMode) {
        return;
      }

      try {
        setLoading(true);
        const [knowledgeResponse, imagesResponse] = await Promise.all([
          callApi("GET", `/knowledge/${knowledgeId}`),
          callApi("GET", `/images/knowledge/${knowledgeId}`),
        ]);

        const item = knowledgeResponse.data;
        const images = imagesResponse.data || [];

        setFormData({
          name: item.name || "",
          description: item.description || "",
          knowledge: item.knowledge || "",
          images: images.length
            ? images.map((image) => ({
                imageId: image.imageid || image.imageId,
                imageUrl: image.imageurl || image.imageUrl || "",
                description: image.description || "",
              }))
            : [emptyImage],
        });
        setExistingImages(images);
      } catch (error) {
        setMessageBox({
          open: true,
          type: "error",
          text:
            error?.message ||
            error?.error ||
            "Failed to load the knowledge item.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadKnowledgeItem();
  }, [isEditMode, knowledgeId]);

  const filteredImages = useMemo(
    () =>
      formData.images
        .map((image) => ({
          imageId: image.imageId,
          imageUrl: image.imageUrl.trim(),
          description: image.description.trim(),
        }))
        .filter((image) => image.imageUrl),
    [formData.images],
  );

  const isBusy = loading || reviewing || answerReviewing || saving;

  const updateImage = (index, field, value) => {
    setFormData((current) => {
      const nextImages = [...current.images];
      nextImages[index] = { ...nextImages[index], [field]: value };
      return { ...current, images: nextImages };
    });
  };

  const addImageField = () => {
    setFormData((current) => ({
      ...current,
      images: [...current.images, { ...emptyImage }],
    }));
  };

  const removeImageField = (index) => {
    setFormData((current) => {
      const nextImages = current.images.filter(
        (_, imageIndex) => imageIndex !== index,
      );
      return {
        ...current,
        images: nextImages.length ? nextImages : [{ ...emptyImage }],
      };
    });
  };

  const reviewDraft = async (payload) => {
    const response = await callApi(
      "POST",
      "/knowledge/review-draft",
      payload,
      null,
      {
        timeout: 60000,
      },
    );
    return response.data;
  };

  const syncImages = async () => {
    const originalIds = existingImages
      .map((image) => image.imageid || image.imageId)
      .filter(Boolean);
    const keptIds = filteredImages
      .map((image) => image.imageId)
      .filter(Boolean);

    const removedIds = originalIds.filter(
      (imageId) => !keptIds.includes(imageId),
    );

    for (const imageId of removedIds) {
      await callApi("DELETE", `/images/${imageId}`);
    }

    for (const image of filteredImages.filter((entry) => entry.imageId)) {
      await callApi("DELETE", `/images/${image.imageId}`);
    }

    if (filteredImages.length) {
      await callApi("POST", "/images/", {
        kId: knowledgeId,
        images: filteredImages.map((image) => ({
          imageUrl: image.imageUrl,
          description: image.description,
        })),
      });
    }
  };

  const saveKnowledge = async (payload) => {
    if (isEditMode) {
      await callApi("PUT", `/knowledge/${knowledgeId}`, {
        name: payload.name,
        description: payload.description,
        knowledge: payload.knowledge,
      });
      await syncImages();
      return;
    }

    const knowledgeResponse = await callApi("POST", "/knowledge/", {
      name: payload.name,
      description: payload.description,
      knowledge: payload.knowledge,
      botId,
    });

    const createdKnowledge = knowledgeResponse.data;

    if (payload.images.length) {
      await callApi("POST", "/images/", {
        kId: createdKnowledge.kid || createdKnowledge.kId,
        images: payload.images,
      });
    }
  };

  const handleInitialReview = async (event) => {
    event.preventDefault();

    if (!botId) {
      setMessageBox({
        open: true,
        type: "error",
        text: "Select a bot first before adding knowledge.",
      });
      return;
    }

    setLoading(true);
    setReviewing(true);

    try {
      const reviewPayload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        knowledge: formData.knowledge.trim(),
        images: filteredImages.map((image) => ({
          imageUrl: image.imageUrl,
          description: image.description,
        })),
      };

      const result = await reviewDraft(reviewPayload);

      setFormData((current) => ({
        ...current,
        description: result.updated_description || current.description,
        knowledge: result.updated_knowledge || current.knowledge,
      }));
      setReviewData({
        isComplete: result.is_complete,
        missingSummary: result.missing_summary,
        questions: result.questions || [],
      });
      setQuestionAnswers(new Array((result.questions || []).length).fill(""));
    } catch (error) {
      setMessageBox({
        open: true,
        type: "error",
        text:
          error?.message ||
          error?.detail ||
          error?.error ||
          "Failed to review this knowledge draft.",
      });
    } finally {
      setReviewing(false);
      setLoading(false);
    }
  };

  const handleQuestionReview = async () => {
    const mergedKnowledge = buildKnowledgeWithAnswers(
      formData.knowledge,
      reviewData.questions,
      questionAnswers,
    );

    setLoading(true);
    setAnswerReviewing(true);

    try {
      const result = await reviewDraft({
        name: formData.name.trim(),
        description: formData.description.trim(),
        knowledge: mergedKnowledge,
        images: filteredImages.map((image) => ({
          imageUrl: image.imageUrl,
          description: image.description,
        })),
      });

      setFormData((current) => ({
        ...current,
        description: result.updated_description || current.description,
        knowledge: result.updated_knowledge || mergedKnowledge,
      }));
      setReviewData({
        isComplete: result.is_complete,
        missingSummary: result.missing_summary,
        questions: result.questions || [],
      });
      setQuestionAnswers(new Array((result.questions || []).length).fill(""));
    } catch (error) {
      setMessageBox({
        open: true,
        type: "error",
        text:
          error?.message ||
          error?.detail ||
          error?.error ||
          "Failed to process the follow-up answers.",
      });
    } finally {
      setAnswerReviewing(false);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSaving(true);

    try {
      await saveKnowledge({
        name: formData.name.trim(),
        description: formData.description.trim(),
        knowledge: formData.knowledge.trim(),
        images: filteredImages.map((image) => ({
          imageUrl: image.imageUrl,
          description: image.description,
        })),
      });

      setMessageBox({
        open: true,
        type: "success",
        text: isEditMode
          ? "Knowledge field updated successfully."
          : "Knowledge field created successfully.",
      });
    } catch (error) {
      setMessageBox({
        open: true,
        type: "error",
        text:
          error?.message ||
          error?.error ||
          "Failed to save this knowledge field.",
      });
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  const isQuestionStep =
    reviewData.questions.length > 0 && !reviewData.isComplete;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      {loading && (
        <GlobalLoader fullPage message="Working on your knowledge draft..." />
      )}

      {messageBox.open && (
        <MessageOverlay
          type={messageBox.type}
          text={messageBox.text}
          onClose={() => {
            setMessageBox({ open: false, type: "", text: "" });

            if (messageBox.type === "success") {
              navigate(`/chatBotDashboard/${botId}/knowledge`);
            }
          }}
        />
      )}

      <button
        onClick={() => navigate(`/chatBotDashboard/${botId || ""}/knowledge`)}
        disabled={isBusy}
        className="flex items-center gap-2 mb-8 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity disabled:opacity-40"
        style={{ color: colors.textPrimary }}
      >
        <ArrowLeft size={18} /> BACK TO KNOWLEDGE BASE
      </button>

      <div className="mb-8">
        <h4
          className="uppercase tracking-[0.2em] text-[10px] font-black mb-2 opacity-60"
          style={{ color: colors.textSecondary }}
        >
          Agentic Knowledge Flow
        </h4>
        <h1
          className="text-3xl md:text-5xl font-bold leading-tight mb-4"
          style={{ color: colors.textPrimary }}
        >
          {isEditMode
            ? "Refine the knowledge your"
            : "Add a knowledge field your"}
          <span style={{ color: colors.primary }}>
            {" "}
            bot can actually sell from.
          </span>
        </h1>
        <p
          className="text-base leading-relaxed"
          style={{ color: colors.textSecondary }}
        >
          Start with the basics. The agent reviews the item like a sales rep and
          asks for any missing details before we save it to the bot.
        </p>
      </div>

      <section
        className="w-full rounded-[2.5rem] p-5 sm:p-8 md:p-10 border shadow-lg"
        style={{ background: colors.cardBg, borderColor: colors.border }}
      >
        <form onSubmit={handleInitialReview} className="space-y-6">
          <Input
            label="Knowledge Name"
            name="name"
            value={formData.name}
            onChange={(event) =>
              setFormData({ ...formData, name: event.target.value })
            }
            placeholder="e.g. Oversized graphic t-shirt"
            required
          />

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: colors.secondary }}
            >
              Short Description
            </label>
            <textarea
              required
              rows="4"
              value={formData.description}
              onChange={(event) =>
                setFormData({ ...formData, description: event.target.value })
              }
              placeholder="Write a short sales-ready summary of the item."
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 text-sm transition resize-none"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.outerBackground,
                color: colors.secondary,
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: colors.secondary }}
            >
              Full Knowledge
            </label>
            <textarea
              required
              rows="8"
              value={formData.knowledge}
              onChange={(event) =>
                setFormData({ ...formData, knowledge: event.target.value })
              }
              placeholder="Include all details the bot should know: specifications, materials, sizes, warranty, delivery details, or anything useful for selling."
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 text-sm transition resize-none"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.outerBackground,
                color: colors.secondary,
              }}
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3
                  className="text-base font-bold"
                  style={{ color: colors.textPrimary }}
                >
                  Images
                </h3>
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  Add image links with short descriptions so the bot can use
                  them later.
                </p>
              </div>

              <button
                type="button"
                onClick={addImageField}
                disabled={isBusy}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                style={{
                  background: `${colors.primary}15`,
                  color: colors.primary,
                }}
              >
                <Plus size={16} />
                Add Image
              </button>
            </div>

            {formData.images.map((image, index) => (
              <div
                key={image.imageId || index}
                className="rounded-[1.75rem] border p-4 space-y-4"
                style={{
                  borderColor: colors.border,
                  background: colors.outerBackground,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImagePlus size={16} style={{ color: colors.primary }} />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: colors.textPrimary }}
                    >
                      Image {index + 1}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeImageField(index)}
                    disabled={isBusy}
                    className="p-2 rounded-xl disabled:opacity-60"
                    style={{ color: colors.error }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <Input
                  label="Image URL"
                  name={`imageUrl-${index}`}
                  value={image.imageUrl}
                  onChange={(event) =>
                    updateImage(index, "imageUrl", event.target.value)
                  }
                  placeholder="https://example.com/image.jpg"
                />

                {image.imageUrl?.trim() && (
                  <div
                    className="rounded-[1.25rem] overflow-hidden border"
                    style={{
                      borderColor: colors.border,
                      background: colors.cardBg,
                    }}
                  >
                    <div className="h-44">
                      <img
                        src={image.imageUrl}
                        alt={image.description || `Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: colors.secondary }}
                  >
                    Image Description
                  </label>
                  <textarea
                    rows="3"
                    value={image.description}
                    onChange={(event) =>
                      updateImage(index, "description", event.target.value)
                    }
                    placeholder="What does this image show?"
                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 text-sm transition resize-none"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.cardBg,
                      color: colors.secondary,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full py-4 rounded-[1.25rem] text-white font-bold transition-transform hover:scale-[1.01] disabled:opacity-60"
            style={{
              background: colors.primary,
              boxShadow: `0 15px 30px -10px ${colors.primary}60`,
            }}
          >
            {reviewing ? "Reviewing..." : "Review With Agent"}
          </button>
        </form>

        {(isQuestionStep || reviewData.isComplete) && (
          <div
            className="mt-8 pt-8 border-t space-y-5"
            style={{ borderColor: colors.border }}
          >
            <div className="flex items-start gap-3">
              <div
                className="p-3 rounded-2xl"
                style={{
                  background: reviewData.isComplete
                    ? `${colors.success}15`
                    : `${colors.primary}15`,
                  color: reviewData.isComplete
                    ? colors.success
                    : colors.primary,
                }}
              >
                {reviewData.isComplete ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <HelpCircle size={20} />
                )}
              </div>

              <div>
                <h3
                  className="text-lg font-bold mb-1"
                  style={{ color: colors.textPrimary }}
                >
                  {reviewData.isComplete
                    ? "Knowledge looks ready"
                    : "Agent follow-up questions"}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: colors.textSecondary }}
                >
                  {reviewData.missingSummary}
                </p>
              </div>
            </div>

            {isQuestionStep && (
              <div className="space-y-4">
                {reviewData.questions.map((question, index) => (
                  <div
                    key={`${question.question}-${index}`}
                    className="rounded-[1.5rem] border p-4"
                    style={{
                      borderColor: colors.border,
                      background: colors.outerBackground,
                    }}
                  >
                    <p
                      className="text-sm font-semibold mb-2"
                      style={{ color: colors.textPrimary }}
                    >
                      {question.question}
                    </p>
                    <p
                      className="text-xs mb-3"
                      style={{ color: colors.textSecondary }}
                    >
                      {question.purpose}
                    </p>
                    <textarea
                      rows="3"
                      value={questionAnswers[index] || ""}
                      onChange={(event) => {
                        const nextAnswers = [...questionAnswers];
                        nextAnswers[index] = event.target.value;
                        setQuestionAnswers(nextAnswers);
                      }}
                      placeholder="Type the answer here"
                      className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 text-sm transition resize-none"
                      style={{
                        borderColor: colors.border,
                        backgroundColor: colors.cardBg,
                        color: colors.secondary,
                      }}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleQuestionReview}
                  disabled={isBusy}
                  className="w-full py-4 rounded-[1.25rem] text-white font-bold transition-transform hover:scale-[1.01] disabled:opacity-60"
                  style={{
                    background: colors.secondary,
                    boxShadow: `0 15px 30px -10px ${colors.secondary}35`,
                  }}
                >
                  {answerReviewing
                    ? "Reviewing..."
                    : "Review Updated Knowledge"}
                </button>
              </div>
            )}

            {reviewData.isComplete && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isBusy}
                className="w-full py-4 rounded-[1.25rem] text-white font-bold transition-transform hover:scale-[1.01] disabled:opacity-60"
                style={{
                  background: colors.success,
                  boxShadow: `0 15px 30px -10px ${colors.success}45`,
                }}
              >
                {saving
                  ? isEditMode
                    ? "Saving Knowledge..."
                    : "Creating Knowledge..."
                  : isEditMode
                    ? "Save Knowledge Changes"
                    : "Save Knowledge Field"}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
