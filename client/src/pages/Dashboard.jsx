import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
  { key: "totalUsers", label: "Total Users", icon: HiOutlineUsers, gradient: "from-blue-500 to-cyan-400", bg: "bg-blue-50/80" },
  { key: "totalDocuments", label: "Documents", icon: HiOutlineDocumentText, gradient: "from-emerald-500 to-teal-400", bg: "bg-emerald-50/80" },
  { key: "totalSigned", label: "Signed", icon: HiOutlineCheckCircle, gradient: "from-violet-500 to-purple-400", bg: "bg-violet-50/80" },
  { key: "totalPending", label: "Pending", icon: HiOutlineClock, gradient: "from-amber-500 to-orange-400", bg: "bg-amber-50/80" },
];

const statusColors = {
  draft: "bg-slate-50 text-slate-600 border-slate-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  viewed: "bg-amber-50 text-amber-700 border-amber-200",
  signed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-violet-50 text-violet-700 border-violet-200",
};

function AnimatedCounter({ value }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const target = parseInt(value) || 0;
    if (target === 0) return;
    let start = 0;
    const step = Math.max(1, Math.floor(target / 30));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{count}</span>;
}

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
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"},{" "}
          <span className="gradient-text">{user.name?.split(" ")[0]}</span> 👋
        </h2>
        <p className="text-slate-500 mt-1">Here&apos;s what&apos;s happening with your documents today.</p>
      </motion.div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {statConfig.map((s, i) => (
            <motion.div
              key={s.key}
              className="card-3d glass rounded-3xl p-5 border border-slate-200/80 hover:shadow-xl hover:shadow-indigo-100/30 transition-all duration-500"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <motion.div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg`}
                  whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                >
                  <s.icon className="w-5 h-5 text-white" />
                </motion.div>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                <AnimatedCounter value={stats[s.key]} />
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-5 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link
            to="/documents/new"
            className="group flex items-center gap-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-3xl p-6 hover:shadow-2xl hover:shadow-indigo-200/50 transition-all duration-500 card-3d"
          >
            <motion.div
              className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-sm"
              whileHover={{ rotate: 90 }}
              transition={{ duration: 0.3 }}
            >
              <HiOutlinePlus className="w-6 h-6" />
            </motion.div>
            <div>
              <p className="font-bold text-lg">New Document</p>
              <p className="text-indigo-100 text-sm">Generate from a template</p>
            </div>
            <HiOutlineArrowRight className="w-5 h-5 ml-auto opacity-50 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300" />
          </Link>
        </motion.div>
        {user.role === "admin" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link
              to="/templates/new"
              className="group flex items-center gap-4 glass rounded-3xl p-6 border border-slate-200/80 hover:shadow-xl hover:shadow-indigo-100/30 transition-all duration-500 card-3d"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center shrink-0">
                <HiOutlinePlus className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-lg text-slate-900">New Template</p>
                <p className="text-slate-500 text-sm">Create a document template</p>
              </div>
              <HiOutlineArrowRight className="w-5 h-5 ml-auto text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-2 transition-all duration-300" />
            </Link>
          </motion.div>
        )}
      </div>

      {/* Recent Documents */}
      <motion.div
        className="glass rounded-3xl overflow-hidden border border-slate-200/80"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/30">
          <h3 className="font-bold text-slate-900">Recent Documents</h3>
          <Link to="/documents" className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 transition">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="page-loader">
              <span /><span /><span />
            </div>
          </div>
        ) : recentDocs.length === 0 ? (
          <div className="py-16 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <HiOutlineDocumentText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            </motion.div>
            <p className="text-sm text-slate-400">No documents yet. Create your first one!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {recentDocs.map((doc, i) => (
              <motion.div
                key={doc._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.05 }}
              >
                <Link
                  to={`/documents/${doc._id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/40 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:shadow-md transition-shadow">
                      <HiOutlineDocumentText className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {doc.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(doc.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-xl font-medium border ${statusColors[doc.status]}`}>
                    {doc.status}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
