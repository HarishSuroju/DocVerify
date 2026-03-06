import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import { HiOutlineBellAlert, HiOutlineCheckCircle, HiOutlineArrowTopRightOnSquare } from "react-icons/hi2";

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    try {
      const { data } = await api.get("/notifications", { params: { limit: 100 } });
      setNotifications(data.data || []);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch {
      toast.error("Failed to mark notification as read");
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      toast.error("Failed to mark all notifications");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <DashboardLayout title="Notifications">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500 mt-1">Updates for document sending and signing activity</p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={markingAll}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 cursor-pointer"
        >
          <HiOutlineCheckCircle className="w-4 h-4" />
          {markingAll ? "Marking..." : "Mark all read"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <HiOutlineBellAlert className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No notifications yet</p>
          <p className="text-sm text-gray-400 mt-1">You will see document updates here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {notifications.map((n) => (
            <div key={n._id} className={`px-5 py-4 ${n.read ? "bg-white" : "bg-blue-50/40"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">{n.title}</h3>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <p className="text-sm text-gray-600">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatTime(n.createdAt)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {n.metadata?.documentId && (
                    <Link
                      to={`/documents/${n.metadata.documentId}`}
                      onClick={() => {
                        if (!n.read) markRead(n._id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Open
                      <HiOutlineArrowTopRightOnSquare className="w-3 h-3" />
                    </Link>
                  )}
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => markRead(n._id)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
