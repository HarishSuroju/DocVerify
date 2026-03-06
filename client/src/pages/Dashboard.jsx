import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import {
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlinePlus,
  HiOutlineArrowRight,
} from "react-icons/hi2";

const statConfig = [
  { key: "totalUsers", label: "Total Users", icon: HiOutlineUsers, color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-100" },
  { key: "totalDocuments", label: "Documents", icon: HiOutlineDocumentText, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" },
  { key: "totalSigned", label: "Signed", icon: HiOutlineCheckCircle, color: "text-violet-600", bg: "bg-violet-50", ring: "ring-violet-100" },
  { key: "totalPending", label: "Pending", icon: HiOutlineClock, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-100" },
];

const statusColors = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-50 text-blue-700",
  viewed: "bg-amber-50 text-amber-700",
  signed: "bg-emerald-50 text-emerald-700",
  completed: "bg-violet-50 text-violet-700",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (user.role === "admin") {
          const { data } = await api.get("/admin/dashboard");
          setStats(data.data.stats);
        }
        const { data } = await api.get("/documents");
        setRecentDocs(data.data.slice(0, 6));
      } catch {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.role]);

  return (
    <DashboardLayout title="Dashboard">
      {/* Greeting */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"},{" "}
          {user.name?.split(" ")[0]} 👋
        </h2>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s happening with your documents today.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {statConfig.map((s) => (
            <div
              key={s.key}
              className={`bg-white rounded-2xl border border-gray-100 p-5 ring-1 ${s.ring} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats[s.key]}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Link
          to="/documents/new"
          className="group flex items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-5 hover:shadow-lg hover:shadow-blue-200 transition-all"
        >
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm">
            <HiOutlinePlus className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold">New Document</p>
            <p className="text-blue-100 text-sm">Generate from a template</p>
          </div>
          <HiOutlineArrowRight className="w-5 h-5 ml-auto opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Link>
        {user.role === "admin" && (
          <Link
            to="/templates/new"
            className="group flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-5 hover:border-blue-200 hover:shadow-md transition-all"
          >
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <HiOutlinePlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">New Template</p>
              <p className="text-gray-500 text-sm">Create a document template</p>
            </div>
            <HiOutlineArrowRight className="w-5 h-5 ml-auto text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
          </Link>
        )}
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-2xl border border-gray-100 ring-1 ring-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">Recent Documents</h3>
          <Link to="/documents" className="text-sm text-blue-600 font-medium hover:underline">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : recentDocs.length === 0 ? (
          <div className="py-12 text-center">
            <HiOutlineDocumentText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No documents yet. Create your first one!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentDocs.map((doc) => (
              <Link
                key={doc._id}
                to={`/documents/${doc._id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                    <HiOutlineDocumentText className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition">
                      {doc.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(doc.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-lg font-medium shrink-0 ${statusColors[doc.status]}`}>
                  {doc.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
