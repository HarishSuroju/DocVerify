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
} from "react-icons/hi2";

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

  const canvasRef = useRef(null);
  const sigPadRef = useRef(null);

  const loadDocument = async () => {
    const { data } = await api.get(`/documents/${id}`);
    setDoc(data.data);

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

  const senderSigned = Boolean(signatures.sender);
  const receiverSigned = Boolean(signatures.receiver);

  const canSenderSign = isSender && !senderSigned && !receiverId;
  const canReceiverSign = isReceiver && senderSigned && !receiverSigned;
  const canCurrentUserSign = canSenderSign || canReceiverSign;

  useEffect(() => {
    if (signing && canvasRef.current) {
      sigPadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: "rgb(255,255,255)",
      });
    }
  }, [signing]);

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
      const signatureImage = sigPadRef.current.toDataURL("image/png");
      const { data } = await api.post(`/signatures/${id}`, { signatureImage });
      setDoc(data.data.document);
      setSignatures(data.data.signatures || { sender: null, receiver: null });
      setSigning(false);
      toast.success(canSenderSign ? "Sender signature added" : "Receiver signature added");
    } catch (err) {
      toast.error(err.response?.data?.message || "Signing failed");
    }
  };

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

          {signing && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Draw {canSenderSign ? "Sender" : "Receiver"} Signature
              </h3>
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="border border-gray-200 rounded-xl w-full bg-white"
              />
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

              <div className={`rounded-xl p-3 border ${receiverSigned ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Receiver</p>
                <p className={`text-sm font-semibold mt-1 ${receiverSigned ? "text-green-700" : "text-gray-500"}`}>
                  {receiverSigned ? "Signed" : "Pending"}
                </p>
                {receiverSigned && (
                  <p className="text-xs text-green-700 mt-1">By {signatures.receiver?.signedBy?.name || "Receiver"}</p>
                )}
              </div>
            </div>
          </div>

          {isSender && !receiverId && (
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
