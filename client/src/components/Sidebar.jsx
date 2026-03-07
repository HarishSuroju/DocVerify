import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import {
  HiOutlineHome,
  HiOutlineDocumentText,
  HiOutlineRectangleStack,
  HiOutlineBellAlert,
  HiOutlineShieldCheck,
  HiOutlineIdentification,
  HiOutlineXMark,
  HiOutlineArrowRightOnRectangle,
} from "react-icons/hi2";

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
      return () => {
        mounted = false;
      };
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
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
  ];

  if (user?.role === "admin") {
    links.push({ to: "/admin", label: "Admin", icon: HiOutlineShieldCheck });
  }

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-blue-50 text-blue-700"
        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
    }`;

  return (
    <>
      <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-100 flex-col z-40">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
              <HiOutlineDocumentText className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">DocVerify</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-3">Menu</p>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navClass}>
              <l.icon className="w-5 h-5" />
              <span className="flex-1">{l.label}</span>
              {l.to === "/notifications" && unreadCount > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
          >
            <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
            Log out
          </button>
        </div>
      </aside>

      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/30 z-30 md:hidden ${mobileOpen ? "block" : "hidden"}`}
      />

      <section
        className={`fixed inset-x-0 bottom-0 z-40 md:hidden bg-white rounded-t-2xl border-t border-gray-200 transition-transform duration-200 ${
          mobileOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "82vh" }}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Menu</p>
            <p className="text-xs text-gray-400">Navigate quickly on mobile</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:bg-gray-50" aria-label="Close menu">
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        <nav className="px-4 py-4 space-y-1 overflow-y-auto" style={{ maxHeight: "calc(82vh - 132px)" }}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navClass} onClick={onClose}>
              <l.icon className="w-5 h-5" />
              <span className="flex-1">{l.label}</span>
              {l.to === "/notifications" && unreadCount > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
          >
            <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
            Log out
          </button>
        </div>
      </section>
    </>
  );
}
