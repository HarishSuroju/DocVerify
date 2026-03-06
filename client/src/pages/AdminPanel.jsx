import { useEffect, useState } from "react";
import api from "../lib/api";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineCheckBadge,
  HiOutlineClock,
  HiOutlineShieldCheck,
} from "react-icons/hi2";

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, usersRes, logsRes] = await Promise.all([
          api.get("/admin/dashboard"),
          api.get("/admin/users"),
          api.get("/admin/audit-logs?limit=20"),
        ]);
        setStats(dashRes.data.data.stats);
        setUsers(usersRes.data.data);
        setLogs(logsRes.data.data.logs);
      } catch {
        toast.error("Failed to load admin data");
      }
    };
    load();
  }, []);

  const chartData = stats
    ? [
        { name: "Users", count: stats.totalUsers },
        { name: "Documents", count: stats.totalDocuments },
        { name: "Signed", count: stats.totalSigned },
        { name: "Pending", count: stats.totalPending },
      ]
    : [];

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "audit", label: "Audit Log" },
  ];

  const statCards = stats
    ? [
        { label: "Total Users", value: stats.totalUsers, icon: HiOutlineUsers, color: "blue" },
        { label: "Documents", value: stats.totalDocuments, icon: HiOutlineDocumentText, color: "green" },
        { label: "Signed", value: stats.totalSigned, icon: HiOutlineCheckBadge, color: "purple" },
        { label: "Pending", value: stats.totalPending, icon: HiOutlineClock, color: "amber" },
      ]
    : [];

  const colorMap = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100" },
    green: { bg: "bg-green-50", text: "text-green-600", ring: "ring-green-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", ring: "ring-purple-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
  };

  return (
    <DashboardLayout title="Admin Panel">
      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-50 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div>
          {stats ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {statCards.map((s) => {
                  const c = colorMap[s.color];
                  return (
                    <div
                      key={s.label}
                      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-50 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center ring-1 ${c.ring}`}>
                          <s.icon className={`w-5 h-5 ${c.text}`} />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                      <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">System Overview</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #f3f4f6",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u._id} className={`hover:bg-gray-50/50 transition ${i !== users.length - 1 ? "border-b border-gray-50" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{u.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wide border ${
                          u.role === "admin"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.isVerified ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <HiOutlineCheckBadge className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs */}
      {tab === "audit" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {logs.length === 0 ? (
            <div className="py-16 text-center">
              <HiOutlineShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No audit logs yet</p>
            </div>
          ) : (
            <div>
              {logs.map((log, i) => (
                <div
                  key={log._id}
                  className={`px-6 py-4 hover:bg-gray-50/50 transition ${
                    i !== logs.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <HiOutlineShieldCheck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.action}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {log.performedBy?.name || "System"}
                          {log.documentId && ` · ${log.documentId.title || "Document"}`}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 shrink-0">
                      {new Date(log.timestamp).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
