import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import SignaturePad from "signature_pad";
import api from "../lib/api";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowDownTray,
  HiOutlinePencilSquare,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlinePaperAirplane,
  HiOutlineSparkles,
} from "react-icons/hi2";

const PDF_WIDTH = 595.28;
const PDF_HEIGHT = 841.89;
const PREVIEW_WIDTH = 420;
const PREVIEW_HEIGHT = Math.round((PDF_HEIGHT / PDF_WIDTH) * PREVIEW_WIDTH);

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const cropSignatureDataUrl = (signaturePad) => {
  const sourceCanvas = signaturePad.canvas;
  const srcCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = sourceCanvas;
  const imageData = srcCtx.getImageData(0, 0, width, height).data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasInk = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = imageData[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        hasInk = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasInk) {
    return null;
  }

  const padding = 8;
  minX = clamp(minX - padding, 0, width);
  minY = clamp(minY - padding, 0, height);
  maxX = clamp(maxX + padding, 0, width - 1);
  maxY = clamp(maxY + padding, 0, height - 1);

  const cropW = Math.max(1, maxX - minX + 1);
  const cropH = Math.max(1, maxY - minY + 1);

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext("2d");
  croppedCtx.drawImage(sourceCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  return {
    dataUrl: croppedCanvas.toDataURL("image/png"),
    width: cropW,
    height: cropH,
  };
};

export default function DocumentDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [doc, setDoc] = useState(null);
  const [signatures, setSignatures] = useState({ sender: null, receiver: null });
  const [users, setUsers] = useState([]);
  const [assignTo, setAssignTo] = useState("");
  const [signing, setSigning] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [signaturePlacement, setSignaturePlacement] = useState({ page: 1 });
  const [signatureBox, setSignatureBox] = useState({ x: 120, y: 130, width: 140 });
  const [signatureAspect, setSignatureAspect] = useState(0.4);
  const [signPreviewUrl, setSignPreviewUrl] = useState("");

  const canvasRef = useRef(null);
  const sigPadRef = useRef(null);
  const previewRef = useRef(null);
  const interactionRef = useRef(null);
  const [dragMode, setDragMode] = useState(null);

  const loadDocument = async () => {
    const { data } = await api.get(`/documents/${id}`);
    setDoc(data.data);
    setAiInsights(data.data?.metadata?.aiInsights || null);

    const { data: sigData } = await api.get(`/signatures/${id}`);
    setSignatures(sigData.data || { sender: null, receiver: null });
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadDocument();
      } catch {
        toast.error("Document not found");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const senderId = useMemo(() => {
    if (!doc) return null;
    return String(doc.assignedBy?._id || doc.assignedBy || "");
  }, [doc]);

  const receiverId = useMemo(() => {
    if (!doc?.assignedTo) return null;
    return String(doc.assignedTo?._id || doc.assignedTo || "");
  }, [doc]);

  const currentUserId = String(user?.id || "");
  const isSender = senderId && currentUserId === senderId;
  const isReceiver = receiverId && currentUserId === receiverId;
  const signingMode = doc?.metadata?.signingMode === "sender_only" ? "sender_only" : "both";

  const senderSigned = Boolean(signatures.sender);
  const receiverSigned = Boolean(signatures.receiver);

  const canSenderSign = isSender && !senderSigned && (signingMode === "sender_only" || !receiverId);
  const canReceiverSign = signingMode === "both" && isReceiver && senderSigned && !receiverSigned;
  const canCurrentUserSign = canSenderSign || canReceiverSign;

  useEffect(() => {
    if (signing && canvasRef.current) {
      sigPadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: "rgb(255,255,255)",
      });
    }
  }, [signing]);

  useEffect(() => {
    const loadPreview = async () => {
      if (!signing) {
        setSignPreviewUrl("");
        return;
      }

      try {
        const { data } = await api.get(`/documents/${id}/download`);
        setSignPreviewUrl(data.data?.url || "");
      } catch {
        setSignPreviewUrl("");
      }
    };

    loadPreview();
  }, [signing, id]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!isSender || !senderSigned || receiverId) return;

      try {
        const { data } = await api.get("/admin/users");
        const potential = (data.data || []).filter(
          (u) => u.role === "user" && u.id !== currentUserId && u._id !== currentUserId
        );
        setUsers(potential);
      } catch {
        setUsers([]);
      }
    };

    loadUsers();
  }, [isSender, senderSigned, receiverId, currentUserId]);

  const handleSign = async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      return toast.error("Please draw your signature");
    }

    try {
      const cropped = cropSignatureDataUrl(sigPadRef.current);
      if (!cropped) {
        return toast.error("Please draw your signature");
      }

      const boxHeight = signatureBox.width * signatureAspect;
      const xPdf = (signatureBox.x / PREVIEW_WIDTH) * PDF_WIDTH;
      const yPdf = PDF_HEIGHT - ((signatureBox.y + boxHeight) / PREVIEW_HEIGHT) * PDF_HEIGHT;
      const widthPdf = (signatureBox.width / PREVIEW_WIDTH) * PDF_WIDTH;

      const placement = {
        page: signaturePlacement.page,
        x: Number(xPdf.toFixed(2)),
        y: Number(yPdf.toFixed(2)),
        width: Number(widthPdf.toFixed(2)),
      };

      const { data } = await api.post(`/signatures/${id}`, {
        signatureImage: cropped.dataUrl,
        signaturePlacement: placement,
      });
      setDoc(data.data.document);
      setSignatures(data.data.signatures || { sender: null, receiver: null });
      setSigning(false);
      toast.success(canSenderSign ? "Sender signature added" : "Receiver signature added");
    } catch (err) {
      toast.error(err.response?.data?.message || "Signing failed");
    }
  };

  const handlePlacementClick = (e) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = ((e.clientX - rect.left) / rect.width) * PREVIEW_WIDTH;
    const clickY = ((e.clientY - rect.top) / rect.height) * PREVIEW_HEIGHT;
    const nextHeight = signatureBox.width * signatureAspect;

    setSignatureBox((prev) => ({
      ...prev,
      x: clamp(clickX - prev.width / 2, 0, PREVIEW_WIDTH - prev.width),
      y: clamp(clickY - nextHeight / 2, 0, PREVIEW_HEIGHT - nextHeight),
    }));
  };

  const startMove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.pointerId !== undefined) {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    interactionRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: signatureBox.x,
      startY: signatureBox.y,
      startWidth: signatureBox.width,
    };
    setDragMode("move");
  };

  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.pointerId !== undefined) {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    interactionRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: signatureBox.x,
      startY: signatureBox.y,
      startWidth: signatureBox.width,
    };
    setDragMode("resize");
  };

  useEffect(() => {
    if (!dragMode) return;

    const onMove = (e) => {
      if (!interactionRef.current || !previewRef.current) return;

      const rect = previewRef.current.getBoundingClientRect();
      const scaleX = PREVIEW_WIDTH / rect.width;
      const scaleY = PREVIEW_HEIGHT / rect.height;
      const dx = (e.clientX - interactionRef.current.startClientX) * scaleX;
      const dy = (e.clientY - interactionRef.current.startClientY) * scaleY;

      if (dragMode === "move") {
        const nextHeight = interactionRef.current.startWidth * signatureAspect;
        setSignatureBox((prev) => ({
          ...prev,
          x: clamp(interactionRef.current.startX + dx, 0, PREVIEW_WIDTH - prev.width),
          y: clamp(interactionRef.current.startY + dy, 0, PREVIEW_HEIGHT - nextHeight),
        }));
        return;
      }

      const rawWidth = interactionRef.current.startWidth + dx;
      const maxByX = PREVIEW_WIDTH - interactionRef.current.startX;
      const maxByY = (PREVIEW_HEIGHT - interactionRef.current.startY) / signatureAspect;
      const nextWidth = clamp(rawWidth, 80, Math.max(80, Math.min(260, maxByX, maxByY)));

      setSignatureBox((prev) => ({
        ...prev,
        width: nextWidth,
      }));
    };

    const onUp = () => {
      setDragMode(null);
      interactionRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragMode, signatureAspect]);

  const handleAssign = async () => {
    if (!assignTo) return toast.error("Please choose a receiver");

    setAssigning(true);
    try {
      const { data } = await api.patch(`/documents/${id}/assign`, { assignTo });
      setDoc(data.data);
      toast.success("Agreement sent to receiver");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send agreement");
    } finally {
      setAssigning(false);
    }
  };

  const handleDownload = async () => {
    try {
      const { data } = await api.get(`/documents/${id}/download`);
      window.open(data.data.url, "_blank");
    } catch {
      toast.error("Download failed");
    }
  };

  const handleGenerateAiInsights = async () => {
    setAiLoading(true);
    try {
      const { data } = await api.get(`/documents/${id}/ai-insights`);
      setAiInsights(data.data);
      toast.success("AI insights ready");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate AI insights");
    } finally {
      setAiLoading(false);
    }
  };

  const statusStyles = {
    draft: "bg-gray-50 text-gray-600 border-gray-200",
    signed: "bg-amber-50 text-amber-700 border-amber-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    viewed: "bg-cyan-50 text-cyan-700 border-cyan-200",
    completed: "bg-green-50 text-green-700 border-green-200",
  };

  if (loading) {
    return (
      <DashboardLayout title="Document">
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!doc) {
    return (
      <DashboardLayout title="Document">
        <div className="text-center py-20">
          <p className="text-gray-400">Document not found</p>
          <Link to="/documents" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            Back to Documents
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Agreement Details">
      <Link
        to="/documents"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition mb-6"
      >
        <HiOutlineArrowLeft className="w-4 h-4" />
        Back to Documents
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{doc.title}</h2>
            <p className="text-sm text-gray-400 mt-1">
              Created {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              {" "}· Template: {doc.templateId?.title || "-"}
            </p>
          </div>
          <span
            className={`text-[11px] px-3 py-1.5 rounded-lg font-semibold uppercase tracking-wide border ${
              statusStyles[doc.status] || "bg-gray-50 text-gray-600 border-gray-200"
            }`}
          >
            {doc.status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-gray-50">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm shadow-blue-200 cursor-pointer"
          >
            <HiOutlineArrowDownTray className="w-4 h-4" />
            Download PDF
          </button>

          {!signing && canCurrentUserSign && (
            <button
              onClick={() => setSigning(true)}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition cursor-pointer"
            >
              <HiOutlinePencilSquare className="w-4 h-4" />
              {canSenderSign ? "Sign as Sender" : "Sign as Receiver"}
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Agreement Content</h3>
            <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{doc.content}</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">AI Insights</h3>
              <button
                type="button"
                onClick={handleGenerateAiInsights}
                disabled={aiLoading}
                className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-violet-700 disabled:opacity-60 cursor-pointer"
              >
                <HiOutlineSparkles className="w-4 h-4" />
                {aiLoading ? "Analyzing..." : aiInsights ? "Refresh AI Insights" : "Generate AI Insights"}
              </button>
            </div>

            {!aiInsights ? (
              <p className="text-sm text-gray-400">Run AI analysis to get summary, risk flags, and recommendations.</p>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Summary</p>
                  <p className="text-gray-800">{aiInsights.summary || "No summary generated."}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                    <p className="text-xs font-semibold text-amber-800 mb-2 uppercase tracking-wide">Risk Flags</p>
                    {aiInsights.risks?.length ? (
                      <ul className="space-y-1 text-amber-900">
                        {aiInsights.risks.map((risk, idx) => (
                          <li key={`${risk}-${idx}`}>• {risk}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-amber-900">No major risk flags detected.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <p className="text-xs font-semibold text-blue-800 mb-2 uppercase tracking-wide">Recommendations</p>
                    {aiInsights.recommendations?.length ? (
                      <ul className="space-y-1 text-blue-900">
                        {aiInsights.recommendations.map((item, idx) => (
                          <li key={`${item}-${idx}`}>• {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-blue-900">No recommendations generated.</p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Provider: <span className="font-medium text-gray-700">{aiInsights.provider || "unknown"}</span>
                  {" · "}
                  Confidence: <span className="font-medium text-gray-700">{Math.round((aiInsights.confidence || 0) * 100)}%</span>
                </p>
              </div>
            )}
          </div>

          {signing && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Draw {canSenderSign ? "Sender" : "Receiver"} Signature
              </h3>

              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Page Number</label>
                  <input
                    type="number"
                    min={1}
                    value={signaturePlacement.page}
                    onChange={(e) => setSignaturePlacement((prev) => ({ ...prev, page: Number(e.target.value || 1) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Signature Box Size</label>
                  <input
                    type="range"
                    min={80}
                    max={220}
                    step={2}
                    value={signatureBox.width}
                    onChange={(e) => {
                      const nextWidth = Number(e.target.value || 140);
                      const nextHeight = nextWidth * signatureAspect;
                      setSignatureBox((prev) => ({
                        ...prev,
                        width: nextWidth,
                        x: clamp(prev.x, 0, PREVIEW_WIDTH - nextWidth),
                        y: clamp(prev.y, 0, PREVIEW_HEIGHT - nextHeight),
                      }));
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Click to place, drag to move, and drag the corner handle to resize.</p>
                <div
                  ref={previewRef}
                  onClick={handlePlacementClick}
                  className="relative mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white"
                  style={{ width: `min(100%, ${PREVIEW_WIDTH}px)`, aspectRatio: `${PDF_WIDTH} / ${PDF_HEIGHT}` }}
                >
                  {signPreviewUrl ? (
                    <iframe
                      title="Document Preview"
                      src={signPreviewUrl}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    />
                  ) : (
                    <div className="absolute inset-0 p-5 text-xs text-gray-700 whitespace-pre-wrap overflow-hidden">
                      {String(doc.content || "").slice(0, 2400)}
                    </div>
                  )}

                  <div
                    onPointerDown={startMove}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute border-2 border-emerald-500 bg-emerald-500/10 rounded-md cursor-move touch-none"
                    style={{
                      left: `${signatureBox.x}px`,
                      top: `${signatureBox.y}px`,
                      width: `${signatureBox.width}px`,
                      height: `${signatureBox.width * signatureAspect}px`,
                    }}
                  >
                    <div className="absolute -top-5 left-0 text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                      Signature Area
                    </div>
                    <button
                      type="button"
                      onPointerDown={startResize}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute -right-1 -bottom-1 w-3.5 h-3.5 rounded-sm bg-emerald-600 border border-white cursor-nwse-resize touch-none"
                      aria-label="Resize signature area"
                    />
                  </div>
                </div>
              </div>

              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="border border-gray-200 rounded-xl w-full bg-white"
              />
              <p className="text-xs text-gray-400 mt-2">Signature image is auto-cropped before embedding into selected area.</p>
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleSign}
                  className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition cursor-pointer"
                >
                  <HiOutlineCheckCircle className="w-4 h-4" />
                  Confirm Signature
                </button>
                <button
                  onClick={() => sigPadRef.current?.clear()}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={() => setSigning(false)}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  <HiOutlineXMark className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Signing Progress</h3>

            <div className="space-y-3">
              <div className={`rounded-xl p-3 border ${senderSigned ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sender</p>
                <p className={`text-sm font-semibold mt-1 ${senderSigned ? "text-green-700" : "text-gray-500"}`}>
                  {senderSigned ? "Signed" : "Pending"}
                </p>
                {senderSigned && (
                  <p className="text-xs text-green-700 mt-1">By {signatures.sender?.signedBy?.name || "Sender"}</p>
                )}
              </div>

              {signingMode === "both" ? (
                <div className={`rounded-xl p-3 border ${receiverSigned ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Receiver</p>
                  <p className={`text-sm font-semibold mt-1 ${receiverSigned ? "text-green-700" : "text-gray-500"}`}>
                    {receiverSigned ? "Signed" : "Pending"}
                  </p>
                  {receiverSigned && (
                    <p className="text-xs text-green-700 mt-1">By {signatures.receiver?.signedBy?.name || "Receiver"}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl p-3 border bg-blue-50 border-blue-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Receiver</p>
                  <p className="text-sm font-semibold mt-1 text-blue-700">Not Required</p>
                </div>
              )}
            </div>
          </div>

          {signingMode === "both" && isSender && !receiverId && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Send To Receiver</h3>

              {!senderSigned ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Sign as sender first, then you can send this agreement to a receiver.
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Receiver</label>
                  <select
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select receiver</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAssign}
                    disabled={assigning || !assignTo}
                    className="mt-3 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                  >
                    <HiOutlinePaperAirplane className="w-4 h-4" />
                    {assigning ? "Sending..." : "Send Agreement"}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400">Sender</dt>
                <dd className="text-sm text-gray-900 font-medium">{doc.assignedBy?.name || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Receiver</dt>
                <dd className="text-sm text-gray-900 font-medium">{doc.assignedTo?.name || "Not assigned"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Template</dt>
                <dd className="text-sm text-gray-900 font-medium">{doc.templateId?.title || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Signature Requirement</dt>
                <dd className="text-sm text-gray-900 font-medium">
                  {signingMode === "sender_only" ? "Sender only" : "Both parties"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Created</dt>
                <dd className="text-sm text-gray-900 font-medium">
                  {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
