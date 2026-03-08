import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [organization, setOrganization] = useState(user?.organization || "");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(user?.profileImageUrl || "");
  const [verificationImageFile, setVerificationImageFile] = useState(null);
  const [verificationImagePreview, setVerificationImagePreview] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [saving, setSaving] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const verificationLocked = Boolean(user?.verificationImageUrl);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  const startCamera = async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (err) {
      setCameraError("Unable to access camera. Please allow permission and retry.");
      stopCamera();
    }
  };

  const captureVerificationImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Could not capture image. Try again.");
          return;
        }
        const file = new File([blob], `verification-${Date.now()}.jpg`, { type: "image/jpeg" });
        setVerificationImageFile(file);
        setVerificationImagePreview(URL.createObjectURL(file));
        stopCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  useEffect(() => {
    if (!profileImageFile) {
      setProfileImagePreview(user?.profileImageUrl || "");
      return undefined;
    }
    const url = URL.createObjectURL(profileImageFile);
    setProfileImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profileImageFile, user?.profileImageUrl]);

  useEffect(() => () => stopCamera(), []);

  const handleEdit = () => {
    setEditing(true);
    if (!verificationLocked && !verificationImageFile && !cameraOn) {
      startCamera();
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setName(user?.name || "");
    setOrganization(user?.organization || "");
    setProfileImageFile(null);
    setVerificationImageFile(null);
    setVerificationImagePreview("");
    setCameraError("");
    stopCamera();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!organization.trim()) {
      toast.error("Organization is required");
      return;
    }
    if (!verificationLocked && !verificationImageFile) {
      toast.error("Verification image capture is required");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        organization: organization.trim(),
        profileImage: profileImageFile || undefined,
        verificationImage: verificationLocked ? undefined : verificationImageFile,
      });
      toast.success("Profile updated");
      setEditing(false);
      setProfileImageFile(null);
      setVerificationImageFile(null);
      setVerificationImagePreview("");
      stopCamera();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleRetake = () => {
    setVerificationImageFile(null);
    setVerificationImagePreview("");
    startCamera();
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <DashboardLayout title="Profile">
      <div className="max-w-xl mx-auto mt-12 bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              disabled={!editing}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-xl px-4 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input disabled value={user?.email || ""} className="w-full border rounded-xl px-4 py-2 bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Organization</label>
            <input
              disabled={!editing}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full border rounded-xl px-4 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <input disabled value={user?.role || ""} className="w-full border rounded-xl px-4 py-2 bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Profile Image</label>
            {profileImagePreview ? (
              <img src={profileImagePreview} alt="Profile" className="w-24 h-24 rounded-full object-cover mb-2" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs mb-2">
                No image
              </div>
            )}
            {editing && (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5"
              />
            )}
          </div>
          {!verificationLocked && (
            <div>
              <label className="block text-sm font-medium mb-1">Verification Image (Live Camera)</label>
              {!editing && (
                <p className="text-xs text-slate-500">
                  This is required once and captured from your live camera.
                </p>
              )}
              {editing && (
                <>
                  {verificationImagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={verificationImagePreview}
                        alt="Verification capture"
                        className="w-24 h-24 rounded-full object-cover border-2 border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleRetake}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
                      >
                        Retake
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <video ref={videoRef} className="w-full max-w-xs rounded-xl border bg-black" muted playsInline />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="flex gap-2">
                        {!cameraOn && (
                          <button
                            type="button"
                            onClick={startCamera}
                            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Start Camera
                          </button>
                        )}
                        {cameraOn && (
                          <>
                            <button
                              type="button"
                              onClick={captureVerificationImage}
                              className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700"
                            >
                              Capture
                            </button>
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
                            >
                              Stop
                            </button>
                          </>
                        )}
                      </div>
                      {cameraError && <p className="text-xs text-red-600">{cameraError}</p>}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-4 mt-8">
          {!editing && (
            <button className="bg-blue-600 text-white px-6 py-2 rounded-xl" onClick={handleEdit}>
              Edit Profile
            </button>
          )}
          {editing && (
            <>
              <button className="bg-green-600 text-white px-6 py-2 rounded-xl" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button className="bg-gray-400 text-white px-6 py-2 rounded-xl" onClick={handleCancel}>
                Cancel
              </button>
            </>
          )}
          <button className="bg-purple-600 text-white px-6 py-2 rounded-xl" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </button>
          <button className="bg-red-600 text-white px-6 py-2 rounded-xl" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
