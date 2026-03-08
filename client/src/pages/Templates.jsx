import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import {
  HiOutlineRectangleStack,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineDocumentPlus,
} from "react-icons/hi2";
// Removed duplicate CameraModal import

export default function Templates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    api
      .get("/templates")
      .then((res) => setTemplates(res.data.data))
      .catch(() => toast.error("Failed to load templates"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    try {
      await api.delete(`/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t._id !== id));
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleUseTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    setCameraOpen(true);
  };

  const handleCameraCapture = async (capturedImage) => {
    setCameraOpen(false);
    // Send capturedImage to server for face matching
    const formData = new FormData();
    formData.append("livePhoto", capturedImage);
    try {
      const res = await api.post("/auth/face-match", formData);
      if (res.data.data.match) {
        window.location.href = `/documents/new?templateId=${selectedTemplateId}`;
      } else {
        const confidence = Number(res?.data?.data?.confidence ?? 0);
        toast.error(`Face is not recognized (confidence ${confidence.toFixed(2)}). Please try again.`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Face verification failed. Please try again.");
    }
  };

  return (
    <DashboardLayout title="Templates">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Templates</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your reusable document templates</p>
        </div>
        {user.role === "admin" && (
          <Link
            to="/templates/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm shadow-blue-200"
          >
            <HiOutlinePlus className="w-4 h-4" />
            New Template
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
          <HiOutlineRectangleStack className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No templates yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first template to get started.</p>
          {user.role === "admin" && (
            <Link
              to="/templates/new"
              className="inline-flex items-center gap-2 mt-5 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Create Template
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t) => (
            <div
              key={t._id}
              className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50/50 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <HiOutlineRectangleStack className="w-5 h-5 text-blue-600" />
                </div>
                {user.role === "admin" && (
                  <button
                    onClick={() => handleDelete(t._id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{t.title}</h3>
              <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                {t.placeholders?.slice(0, 4).map((p) => (
                  <span key={p} className="text-[11px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md border border-gray-100">
                    {p}
                  </span>
                ))}
                {(t.placeholders?.length || 0) > 4 && (
                  <span className="text-[11px] text-gray-400 px-1">+{t.placeholders.length - 4}</span>
                )}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <p className="text-xs text-gray-400">
                  {new Date(t.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <button
                  className="flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 rounded-xl hover:shadow-lg hover:shadow-indigo-200/50 transition-all duration-300"
                  onClick={() => handleUseTemplate(t._id)}
                >
                  <HiOutlineDocumentPlus className="w-4 h-4" />
                  Use
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </DashboardLayout>
  );
}

function CameraModal({ open, onClose, onCapture }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [captured, setCaptured] = useState(null);

  useEffect(() => {
    if (open && !stream) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((s) => {
          setStream(s);
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(() => toast.error("Unable to access camera"));
    }
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [open, stream]);

  const handleCapture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      setCaptured(blob);
    }, "image/jpeg", 0.95);
  };

  const handleVerify = () => {
    if (!captured) return;
    onCapture(captured);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 shadow-xl w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Identity Verification</h2>
        {!captured ? (
          <>
            <video ref={videoRef} autoPlay className="w-full rounded-xl mb-4" />
            <button className="bg-blue-600 text-white px-4 py-2 rounded-xl mt-4" onClick={handleCapture}>Capture Photo</button>
          </>
        ) : (
          <>
            <img src={URL.createObjectURL(captured)} alt="Captured" className="w-full rounded-xl mb-4" />
            <button className="bg-green-600 text-white px-4 py-2 rounded-xl mt-4" onClick={handleVerify}>Verify & Continue</button>
            <button className="mt-2 text-gray-500" onClick={() => setCaptured(null)}>Retake</button>
          </>
        )}
        <button className="mt-2 text-gray-500" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
