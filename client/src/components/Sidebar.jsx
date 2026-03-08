import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import {
  HiOutlineHome,
  HiOutlineDocumentText,
  HiOutlineRectangleStack,
  HiOutlineBellAlert,
  HiOutlineShieldCheck,
  HiOutlineIdentification,
  HiOutlineUserCircle,
  HiOutlineXMark,
  HiOutlineArrowRightOnRectangle,
} from "react-icons/hi2";
import UserAvatar from "./UserAvatar";

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const hasToken = Boolean(localStorage.getItem("accessToken"));
    if (!user || !hasToken) {
      setUnreadCount(0);
      return () => { mounted = false; };
    }
    const loadUnread = async () => {
      try {
        const { data } = await api.get("/notifications/unread-count");
        if (mounted) setUnreadCount(data.data?.unread || 0);
      } catch (err) {
        if (mounted) setUnreadCount(0);
        if (err.response?.status === 401 && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    };
    loadUnread();
    timerRef.current = setInterval(loadUnread, 20000);
    return () => {
      mounted = false;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [user]);

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate("/login");
  };

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: HiOutlineHome },
    { to: "/templates", label: "Templates", icon: HiOutlineRectangleStack },
    { to: "/documents", label: "Documents", icon: HiOutlineDocumentText },
    { to: "/verify-identity", label: "Identity Verification", icon: HiOutlineIdentification },
    { to: "/notifications", label: "Notifications", icon: HiOutlineBellAlert },
    { to: "/profile", label: "Profile", icon: HiOutlineUserCircle },
  ];

  if (user?.role === "admin") {
    links.push({ to: "/admin", label: "Admin", icon: HiOutlineShieldCheck });
  }

  const navClass = ({ isActive }) =>
    `group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ${
      isActive
        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200/50"
        : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-700"
    }`;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-screen w-72 glass flex-col z-40 border-r border-white/30">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/40 to-purple-50/40 pointer-events-none rounded-r-3xl" />

        <div className="relative px-6 py-6 border-b border-white/30">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/50"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.4 }}
            >
              <HiOutlineDocumentText className="w-5 h-5 text-white" />
            </motion.div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
              VerifyHub
            </span>
          </div>
        </div>

        <nav className="relative flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] px-4 mb-4">
            Navigation
          </p>
          {links.map((l, i) => (
            <motion.div
              key={l.to}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <NavLink to={l.to} className={navClass}>
                <l.icon className="w-5 h-5 shrink-0" />
                <span className="flex-1">{l.label}</span>
                {l.to === "/notifications" && unreadCount > 0 && (
                  <motion.span
                    className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </motion.span>
                )}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        <div className="relative px-4 py-5 border-t border-white/30">
          <div className="flex items-center gap-3 px-3 py-2 mb-3">
            <UserAvatar
              name={user?.name}
              imageUrl={user?.profileImageUrl}
              sizeClass="w-10 h-10"
              textClass="text-sm"
              roundedClass="rounded-2xl"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <motion.button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-300 cursor-pointer"
            whileHover={{ x: 4 }}
          >
            <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
            Log out
          </motion.button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile Bottom Sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.section
            className="fixed inset-x-0 bottom-0 z-40 md:hidden glass rounded-t-3xl border-t border-white/30"
            style={{ maxHeight: "82vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="px-5 py-4 border-b border-white/20 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Menu</p>
                <p className="text-xs text-slate-400">Navigate quickly</p>
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"
                aria-label="Close menu"
                whileTap={{ scale: 0.9 }}
              >
                <HiOutlineXMark className="w-5 h-5" />
              </motion.button>
            </div>

            <nav className="px-4 py-4 space-y-1.5 overflow-y-auto" style={{ maxHeight: "calc(82vh - 132px)" }}>
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} className={navClass} onClick={onClose}>
                  <l.icon className="w-5 h-5" />
                  <span className="flex-1">{l.label}</span>
                  {l.to === "/notifications" && unreadCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="px-5 py-4 border-t border-white/20 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
              >
                <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                Log out
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
