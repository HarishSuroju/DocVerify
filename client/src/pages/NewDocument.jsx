import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../lib/api";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import RichTextEditor from "../components/RichTextEditor";
import {
  HiOutlineArrowLeft,
  HiOutlineRectangleStack,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlineArrowUpTray,
  HiOutlineDocumentText,
  HiOutlineArrowsPointingOut,
  HiOutlineArrowsPointingIn,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from "react-icons/hi2";
import { useAuth } from "../context/AuthContext";

const DATE_PLACEHOLDER_REGEX = /(date|dob|birth|expiry|expiration|issue_date|start_date|end_date)/i;

const isDatePlaceholder = (placeholderName = "") => DATE_PLACEHOLDER_REGEX.test(placeholderName);

const toDisplayDate = (isoDate) => {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

const toIsoDate = (displayDate) => {
  if (!displayDate || !/^\d{2}\/\d{2}\/\d{4}$/.test(displayDate)) return "";
  const [day, month, year] = displayDate.split("/").map(Number);
  const candidate = new Date(year, month - 1, day);

  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const escapeHtml = (text = "") =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toPreviewHtml = (content = "") => {
  if (!content) return "";
  if (/<[^>]+>/.test(content)) return content;
  return `<p>${escapeHtml(content).replace(/\n/g, "<br />")}</p>`;
};

const toIsoStartOfDay = (dateOnly) => {
  if (!dateOnly) return null;
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export default function NewDocument() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role === "admin" && !user.identityVerified) {
      toast("Identity verification required before creating documents.", { icon: "🔒" });
      navigate("/verify-identity");
    }
  }, [user, navigate]);

  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState("template"); // template | scratch | upload
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [values, setValues] = useState({});
  const [dateErrors, setDateErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [templateExpiresAt, setTemplateExpiresAt] = useState("");
  const [templateSigningMode, setTemplateSigningMode] = useState("both");

  // Scratch mode
  const [scratchTitle, setScratchTitle] = useState("");
  const [scratchContent, setScratchContent] = useState("");
  const [scratchExpiresAt, setScratchExpiresAt] = useState("");
  const [scratchSigningMode, setScratchSigningMode] = useState("both");

  // Upload mode
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadExpiresAt, setUploadExpiresAt] = useState("");
  const [uploadSigningMode, setUploadSigningMode] = useState("both");

  useEffect(() => {
    api.get("/templates").then((res) => {
      setTemplates(res.data.data);
      const preselect = searchParams.get("templateId");
      if (preselect) {
        api.get(`/templates/${preselect}`).then((r) => {
          setSelectedTemplate(r.data.data);
          const init = {};
          r.data.data.placeholders.forEach((p) => (init[p] = ""));
          setValues(init);
          setDateErrors({});
        });
      }
    });
  }, [searchParams]);

  const handleSelectTemplate = async (id) => {
    const { data } = await api.get(`/templates/${id}`);
    setSelectedTemplate(data.data);
    const init = {};
    data.data.placeholders.forEach((p) => (init[p] = ""));
    setValues(init);
    setDateErrors({});
  };

  const handleTemplateSubmit = async (e) => {
    e.preventDefault();

    let mergedDateErrors = { ...dateErrors };

    if (selectedTemplate?.placeholders?.length) {
      const nextErrors = {};
      for (const placeholder of selectedTemplate.placeholders) {
        if (!isDatePlaceholder(placeholder)) continue;
        const value = values[placeholder] || "";
        if (!value) continue;

        if (!toIsoDate(value)) {
          nextErrors[placeholder] = "Use a valid date in dd/mm/yyyy";
        }
      }
      if (Object.keys(nextErrors).length) {
        mergedDateErrors = { ...mergedDateErrors, ...nextErrors };
        setDateErrors(mergedDateErrors);
      }
    }

    const invalidDate = Object.values(mergedDateErrors).some(Boolean);
    if (invalidDate) {
      toast.error("Fix date fields using dd/mm/yyyy format");
      return;
    }

    setLoading(true);
    try {
      await api.post("/documents/generate", {
        templateId: selectedTemplate._id,
        values,
        expiresAt: toIsoStartOfDay(templateExpiresAt),
        signingMode: templateSigningMode,
      });
      toast.success("Document generated");
      navigate("/documents");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const handleScratchSubmit = async (e) => {
    e.preventDefault();
    if (!scratchTitle.trim() || !scratchContent.trim()) {
      return toast.error("Title and content are required");
    }
    setLoading(true);
    try {
      await api.post("/documents/create-custom", {
        title: scratchTitle,
        content: scratchContent,
        expiresAt: toIsoStartOfDay(scratchExpiresAt),
        signingMode: scratchSigningMode,
      });
      toast.success("Document created");
      navigate("/documents");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) return toast.error("Please select a PDF file");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadTitle.trim()) formData.append("title", uploadTitle);
      if (uploadExpiresAt) {
        const normalized = toIsoStartOfDay(uploadExpiresAt);
        if (normalized) formData.append("expiresAt", normalized);
      }
      formData.append("signingMode", uploadSigningMode);

      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Document uploaded");
      navigate("/documents");
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const [previewExpanded, setPreviewExpanded] = useState(false);

  /* Build highlighted preview HTML — preserves paragraphs, newlines, and signature lines */
  const highlightedPreview = useMemo(() => {
    if (!selectedTemplate) return "";
    let html = selectedTemplate.content;
    // Replace signature placeholders with lines or signed values
    for (const [key, val] of Object.entries(values)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      if (key === "sender_signature" || key === "receiver_signature") {
        if (val) {
          html = html.replace(regex, `<span class='doc-signature-value'>${escapeHtml(val)}</span>`);
        } else {
          html = html.replace(regex, `<span class='doc-signature-line'></span>`);
        }
      } else if (val) {
        html = html.replace(regex, `<span class='doc-filled-value'>${escapeHtml(val)}</span>`);
      } else {
        html = html.replace(regex, `<span class='doc-placeholder-badge'>${key.replace(/_/g, " ")}</span>`);
      }
    }
    // Convert newlines to paragraphs and <br>
    html = html
      .split(/\n{2,}/g)
      .map((para) => `<p>${para.replace(/\n/g, '<br />')}</p>`)
      .join("");
    return html;
  }, [selectedTemplate, values]);

  const filledCount = selectedTemplate
    ? Object.values(values).filter((v) => v.trim()).length
    : 0;
  const totalFields = selectedTemplate?.placeholders?.length || 0;

  const modes = [
    { key: "template", label: "From Template", icon: HiOutlineRectangleStack },
    { key: "scratch", label: "Create from Scratch", icon: HiOutlinePencilSquare },
    { key: "upload", label: "Upload PDF", icon: HiOutlineArrowUpTray },
  ];

  return (
    <DashboardLayout title="New Document">
      <Link
        to="/documents"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition mb-6"
      >
        <HiOutlineArrowLeft className="w-4 h-4" />
        Back to Documents
      </Link>

      {/* Mode Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-50 rounded-xl p-1 w-fit">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setSelectedTemplate(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition cursor-pointer ${
              mode === m.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <m.icon className="w-4 h-4" />
            {m.label}
          </button>
        ))}
      </div>

      {/* ===== FROM TEMPLATE ===== */}
      {mode === "template" && !selectedTemplate && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Choose a Template</h2>
            <p className="text-sm text-gray-500 mt-1">Select a template to generate your document from</p>
          </div>
          {templates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
              <HiOutlineRectangleStack className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No templates available</p>
              <p className="text-sm text-gray-400 mt-1">Ask an admin to create templates first.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map((t) => (
                <button
                  key={t._id}
                  onClick={() => handleSelectTemplate(t._id)}
                  className="text-left bg-white rounded-2xl border border-gray-100 p-6 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/50 transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                    <HiOutlineRectangleStack className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition">{t.title}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {t.placeholders?.slice(0, 3).map((p) => (
                      <span key={p} className="text-[11px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md border border-gray-100">
                        {p}
                      </span>
                    ))}
                    {(t.placeholders?.length || 0) > 3 && (
                      <span className="text-[11px] text-gray-400">+{t.placeholders.length - 3}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "template" && selectedTemplate && (
        <div className="flex flex-col lg:flex-row gap-0 lg:gap-0 -mx-4 sm:-mx-6 lg:-mx-8">
          {/* ====== LEFT PANEL — Form ====== */}
          <div className={`${previewExpanded ? "hidden lg:block lg:w-[380px]" : "w-full lg:w-[45%]"} shrink-0 border-r border-slate-200 transition-all duration-300`}>
            <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                      <HiOutlineRectangleStack className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{selectedTemplate.title}</h2>
                      <p className="text-xs text-slate-400">{totalFields} fields to fill</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mt-4 mb-6">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">
                      {filledCount === totalFields ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                          All fields complete
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          <HiOutlineExclamationCircle className="w-3.5 h-3.5" />
                          {filledCount} of {totalFields} filled
                        </span>
                      )}
                    </span>
                    <span className="text-slate-400">{Math.round((filledCount / totalFields) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${totalFields ? (filledCount / totalFields) * 100 : 0}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Form fields */}
                <form onSubmit={handleTemplateSubmit} className="space-y-4">
                  <div className="space-y-3">
                    {selectedTemplate.placeholders.map((p, idx) => (
                      <motion.div
                        key={p}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="group"
                      >
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                          <span className="w-5 h-5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-400 flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="capitalize">{p.replace(/_/g, " ")}</span>
                          {values[p]?.trim() && (
                            <HiOutlineCheckCircle className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                          )}
                        </label>
                        {isDatePlaceholder(p) ? (
                          <div>
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                              <input
                                value={values[p] || ""}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9/]/g, "").slice(0, 10);
                                  setValues((prev) => ({ ...prev, [p]: raw }));
                                  if (!raw || /^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
                                    setDateErrors((prev) => ({ ...prev, [p]: "" }));
                                    return;
                                  }
                                  setDateErrors((prev) => ({ ...prev, [p]: "Use dd/mm/yyyy format" }));
                                }}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                                placeholder="dd/mm/yyyy"
                                inputMode="numeric"
                              />
                              <input
                                type="date"
                                value={toIsoDate(values[p] || "")}
                                onChange={(e) => {
                                  setValues((prev) => ({ ...prev, [p]: toDisplayDate(e.target.value) }));
                                  setDateErrors((prev) => ({ ...prev, [p]: "" }));
                                }}
                                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                aria-label={`${p} date picker`}
                              />
                            </div>
                            {dateErrors[p] && <p className="text-red-500 text-xs mt-1.5">{dateErrors[p]}</p>}
                          </div>
                        ) : (
                          <input
                            value={values[p] || ""}
                            onChange={(e) => setValues((prev) => ({ ...prev, [p]: e.target.value }))}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                            placeholder={`Enter ${p.replace(/_/g, " ")}`}
                          />
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiry Date (optional)</label>
                      <input
                        type="date"
                        value={templateExpiresAt}
                        onChange={(e) => setTemplateExpiresAt(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Signature Requirement</label>
                      <select
                        value={templateSigningMode}
                        onChange={(e) => setTemplateSigningMode(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                      >
                        <option value="both">Both parties must sign</option>
                        <option value="sender_only">Sender only (single signature)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-indigo-200/50 disabled:opacity-50 transition-all duration-300 cursor-pointer"
                    >
                      {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {loading ? "Generating PDF..." : "Generate PDF"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* ====== RIGHT PANEL — Live Document Preview ====== */}
          <div className={`${previewExpanded ? "w-full" : "w-full lg:w-[55%]"} bg-slate-100 transition-all duration-300`}>
            <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
              {/* Preview toolbar */}
              <div className="flex items-center justify-between px-6 py-3 bg-slate-800 text-white">
                <div className="flex items-center gap-2">
                  <HiOutlineEye className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium">Document Preview</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                    LIVE
                  </span>
                </div>
                <button
                  onClick={() => setPreviewExpanded((prev) => !prev)}
                  className="p-1.5 rounded-lg hover:bg-slate-700 transition cursor-pointer"
                  title={previewExpanded ? "Collapse" : "Expand"}
                >
                  {previewExpanded ? (
                    <HiOutlineArrowsPointingIn className="w-4 h-4" />
                  ) : (
                    <HiOutlineArrowsPointingOut className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* A4 Document page */}
              <div className="p-6 md:p-10 flex justify-center">
                <div className="doc-page w-full max-w-[720px]">
                  {/* Document header */}
                  <div className="doc-page-header">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <HiOutlineDocumentText className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-bold text-indigo-700 tracking-wide uppercase">VerifyHub</span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-1">{selectedTemplate.title}</h1>
                    <p className="text-xs text-slate-400">
                      Generated on {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    <div className="mt-4 border-b-2 border-indigo-600 w-16" />
                  </div>

                  {/* Document body */}
                  <div
                    className="doc-page-body"
                    dangerouslySetInnerHTML={{ __html: toPreviewHtml(highlightedPreview) }}
                  />

                  {/* Document footer */}
                  <div className="doc-page-footer">
                    <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-400">
                      <span>VerifyHub &middot; Secure Document Platform</span>
                      <span>Page 1 of 1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CREATE FROM SCRATCH ===== */}
      {mode === "scratch" && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Create from Scratch</h2>
            <p className="text-xs text-gray-400 mb-6">Write your document content and generate a PDF</p>
            <form onSubmit={handleScratchSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Document Title</label>
                <input
                  value={scratchTitle}
                  onChange={(e) => setScratchTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="My Custom Document"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
                <RichTextEditor
                  value={scratchContent}
                  onChange={setScratchContent}
                  minHeight={340}
                  placeholder="Type your document content with formatting..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={scratchExpiresAt}
                  onChange={(e) => setScratchExpiresAt(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Signature Requirement</label>
                <select
                  value={scratchSigningMode}
                  onChange={(e) => setScratchSigningMode(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="both">Both parties must sign</option>
                  <option value="sender_only">Sender only (single signature)</option>
                </select>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm shadow-blue-200 cursor-pointer"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {loading ? "Creating..." : "Create Document"}
                </button>
              </div>
            </form>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                <HiOutlineEye className="w-4 h-4 text-gray-500" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Live Preview</h3>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 min-h-[300px]">
              {scratchTitle && <p className="font-bold text-gray-900 text-base mb-3">{scratchTitle}</p>}
              <div className="text-sm text-gray-700 leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                {scratchContent ? (
                  <div dangerouslySetInnerHTML={{ __html: toPreviewHtml(scratchContent) }} />
                ) : (
                  <span className="text-gray-300">Your content will appear here...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== UPLOAD PDF ===== */}
      {mode === "upload" && (
        <div className="max-w-lg">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Upload PDF</h2>
            <p className="text-xs text-gray-400 mb-6">Upload your own PDF document to manage and track</p>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Document Title (optional)</label>
                <input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Leave blank to use filename"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">PDF File</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition">
                  <HiOutlineDocumentText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  {uploadFile ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{uploadFile.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                      <button
                        type="button"
                        onClick={() => setUploadFile(null)}
                        className="text-xs text-red-500 hover:underline mt-2 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Drag and drop or click to select</p>
                      <label className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-100 transition">
                        <HiOutlineArrowUpTray className="w-4 h-4" />
                        Choose File
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => setUploadFile(e.target.files[0])}
                        />
                      </label>
                      <p className="text-[11px] text-gray-400 mt-2">PDF only, max 10 MB</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={uploadExpiresAt}
                  onChange={(e) => setUploadExpiresAt(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Signature Requirement</label>
                <select
                  value={uploadSigningMode}
                  onChange={(e) => setUploadSigningMode(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="both">Both parties must sign</option>
                  <option value="sender_only">Sender only (single signature)</option>
                </select>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !uploadFile}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm shadow-blue-200 cursor-pointer"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {loading ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
