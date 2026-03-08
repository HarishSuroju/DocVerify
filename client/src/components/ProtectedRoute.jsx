import { useEffect, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { HiOutlineDocumentText } from "react-icons/hi2";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const didToastRef = useRef(false);
  const needsProfile = Boolean(user && !user.profileCompleted && location.pathname !== "/profile");

  useEffect(() => {
    if (!needsProfile) {
      didToastRef.current = false;
      return;
    }
    if (!didToastRef.current) {
      toast("You haven't completed your profile. Please complete it to continue.", { icon: "🔒" });
      didToastRef.current = true;
    }
    navigate("/profile", { replace: true });
  }, [needsProfile, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
        <motion.div
          className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-200/50"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <HiOutlineDocumentText className="w-8 h-8 text-white" />
        </motion.div>
        <div className="page-loader mt-6">
          <span /><span /><span />
        </div>
        <motion.p
          className="text-sm text-slate-400 mt-4 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Loading your workspace...
        </motion.p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  if (needsProfile) return null;

  return children;
}
