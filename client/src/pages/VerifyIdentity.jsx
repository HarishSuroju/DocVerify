import { useEffect, useRef, useState } from "react";
import api from "../lib/api";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import {
  HiOutlineShieldCheck,
  HiOutlineCheckCircle,
  HiOutlineCamera,
  HiOutlineArrowPath,
  HiOutlineXMark,
} from "react-icons/hi2";

export default function VerifyIdentity() {
  const [documentType, setDocumentType] = useState("aadhaar");
  const [documentFile, setDocumentFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [verificationId, setVerificationId] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [history, setHistory] = useState([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState(false);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState("");
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const readyPollRef = useRef(null);
  const readyTimeoutRef = useRef(null);

  const loadHistory = async () => {
    try {
      const { data } = await api.get("/verifications/me");
      setHistory(data.data || []);
    } catch {
      // Keep page usable even if history fails.
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    return () => {
      if (readyPollRef.current) {
        clearInterval(readyPollRef.current);
        readyPollRef.current = null;
      }
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (selfiePreviewUrl) {
        URL.revokeObjectURL(selfiePreviewUrl);
      }
    };
  }, [selfiePreviewUrl]);

  const updateSelfieFile = (file, captured = false) => {
    if (selfiePreviewUrl) {
      URL.revokeObjectURL(selfiePreviewUrl);
    }
    setSelfieFile(file);
    setCapturedSelfie(captured);
    setSelfiePreviewUrl(file ? URL.createObjectURL(file) : "");
  };

  const stopCamera = () => {
    if (readyPollRef.current) {
      clearInterval(readyPollRef.current);
      readyPollRef.current = null;
    }
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.onloadedmetadata = null;
      videoRef.current.oncanplay = null;
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
    setCameraReady(false);
  };

  const attachStreamToVideo = async () => {
    if (!videoRef.current || !streamRef.current) return;

    const videoEl = videoRef.current;

    const markReady = async () => {
      if (!videoRef.current) return;
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return;

      try {
        await videoRef.current.play();
      } catch {
        // Browser may auto-play once enough data is available.
      }

      if (readyPollRef.current) {
        clearInterval(readyPollRef.current);
        readyPollRef.current = null;
      }
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
      setCameraReady(true);
    };

    videoEl.onloadedmetadata = markReady;
    videoEl.oncanplay = markReady;
    videoEl.srcObject = streamRef.current;

    videoEl
      .play()
      .then(markReady)
      .catch(() => {
        // Polling fallback below covers browsers that delay play readiness.
      });

    readyPollRef.current = setInterval(() => {
      if (!videoRef.current) return;
      const hasFrame = videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0;
      const hasData = videoRef.current.readyState >= 2;
      if (hasFrame || hasData) {
        markReady();
      }
    }, 250);

    readyTimeoutRef.current = setTimeout(() => {
      const currentVideoEl = videoRef.current;
      const stillNotReady = Boolean(currentVideoEl) && (currentVideoEl.videoWidth === 0 || currentVideoEl.videoHeight === 0);
      if (stillNotReady) {
        setCameraError("Camera is taking too long to initialize. Close other apps using camera and retry.");
      }
    }, 6000);
  };

  useEffect(() => {
    if (!cameraOn) return;
    if (!streamRef.current) return;
    if (!videoRef.current) return;

    attachStreamToVideo();
  }, [cameraOn]);

  const startCamera = async () => {
    setCameraError("");
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setCameraError("Camera access failed. Allow camera permission and try again.");
      setCameraOn(false);
    }
  };

  const captureSelfieFromCamera = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!cameraReady || !video.videoWidth || !video.videoHeight) {
      try {
        await video.play();
      } catch {
        // Keep existing error path below.
      }
    }

    if (!video.videoWidth || !video.videoHeight) {
      toast.error("Camera not ready yet. Try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) {
      toast.error("Could not capture selfie. Try again.");
      return;
    }

    const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
    updateSelfieFile(file, true);
    stopCamera();
    toast.success("Selfie captured from camera");
  };

  const clearSelfie = () => {
    updateSelfieFile(null, false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!documentFile) {
      toast.error("Government ID file is required");
      return;
    }
    if (!selfieFile) {
      toast.error("Selfie is required");
      return;
    }
    if (!capturedSelfie) {
      toast.error("Selfie must be captured using camera");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("documentType", documentType);
      formData.append("document", documentFile);
      formData.append("selfie", selfieFile);
      formData.append("selfieSource", "camera");

      const { data } = await api.post("/verifications/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setVerificationId(data.data.verificationId);
      toast.success("Submitted. Enter OTP sent to your email.");
      await loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (!verificationId) return toast.error("Submit verification first");
    if (!otp || otp.length !== 6) return toast.error("Enter a valid 6-digit OTP");

    setConfirming(true);
    try {
      await api.post("/verifications/confirm-otp", { verificationId, otp });
      toast.success("Identity OTP confirmed. Awaiting admin review.");
      setOtp("");
      await loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "OTP confirmation failed");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <DashboardLayout title="Identity Verification">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Identity Verification</h2>
          <p className="text-sm text-gray-500 mb-6">Upload your government ID, then confirm OTP for review.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Document type</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="aadhaar">Aadhaar</option>
                <option value="passport">Passport</option>
                <option value="driving_license">Driving License</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Government ID file (required)</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <div className="rounded-xl border border-gray-200 p-3.5">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <label className="block text-sm font-medium text-gray-700">Selfie (required)</label>
                <div className="flex gap-2">
                  {!cameraOn ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-xs font-semibold"
                    >
                      <HiOutlineCamera className="w-4 h-4" /> Use Camera
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100 text-xs font-semibold"
                    >
                      <HiOutlineXMark className="w-4 h-4" /> Stop Camera
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-2.5">Selfie capture is camera-only. File uploads are disabled.</p>

              {cameraError && <p className="text-xs text-red-600 mb-2">{cameraError}</p>}

              {cameraOn && (
                <div
                  className="rounded-xl overflow-hidden border border-gray-200 bg-black mb-2.5 mx-auto"
                  style={{ width: "500px", height: "500px", maxWidth: "100%" }}
                >
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
              )}

              {cameraOn && (
                <button
                  type="button"
                  onClick={captureSelfieFromCamera}
                  disabled={!cameraReady}
                  className="mb-3 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {cameraReady ? "Capture Selfie" : "Initializing Camera..."}
                </button>
              )}

              {selfiePreviewUrl && (
                <div className="mt-3 rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs text-gray-600">
                      {capturedSelfie ? "Captured via camera" : "Selected file"}: {selfieFile?.name}
                    </p>
                    <button
                      type="button"
                      onClick={clearSelfie}
                      className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      <HiOutlineArrowPath className="w-4 h-4" /> Reset
                    </button>
                  </div>
                  <img src={selfiePreviewUrl} alt="Selfie preview" className="w-full max-h-52 object-cover rounded-lg" />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Submitting..." : "Submit Verification"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Confirm OTP</h3>
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={verificationId}
                onChange={(e) => setVerificationId(e.target.value)}
                placeholder="Verification ID"
                className="min-w-[220px] border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
              />
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit OTP"
                className="w-36 border border-gray-200 rounded-xl px-3 py-2.5 text-sm tracking-[0.2em]"
              />
              <button
                type="button"
                onClick={handleConfirmOtp}
                disabled={confirming}
                className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
              >
                {confirming ? "Confirming..." : "Confirm OTP"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Recent Requests</h3>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-gray-400">No verification requests yet.</p>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 6).map((item) => (
                <div key={item._id} className="rounded-xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{item.documentType.replace(/_/g, " ")}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{item.status}</p>
                  <div className="mt-1 text-xs text-gray-500">
                    OTP: {item.otpVerified ? "Confirmed" : "Pending"}
                  </div>
                  {item.status === "verified" && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                      <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Identity verified
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
