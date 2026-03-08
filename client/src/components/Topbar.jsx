import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HiOutlineBell, HiOutlineBars3 } from "react-icons/hi2";
import UserAvatar from "./UserAvatar";

export default function Topbar({ title, onMenuClick }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-16 glass border-b border-white/20 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-xl hover:bg-slate-100/80 text-slate-600 transition"
          aria-label="Open menu"
        >
          <HiOutlineBars3 className="w-5 h-5" />
        </button>
        <motion.h1
          className="text-base sm:text-lg font-bold text-slate-900 truncate"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          key={title}
          transition={{ duration: 0.3 }}
        >
          {title}
        </motion.h1>
      </div>
      <div className="flex items-center gap-3">
        <motion.button
          className="relative p-2.5 rounded-2xl hover:bg-slate-100/80 transition cursor-pointer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <HiOutlineBell className="w-5 h-5 text-slate-400" />
        </motion.button>
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3 glass px-3 py-1.5 rounded-2xl cursor-pointer hover:bg-white/70 transition"
        >
          <UserAvatar name={user?.name} imageUrl={user?.profileImageUrl} sizeClass="w-8 h-8" textClass="text-xs" roundedClass="rounded-xl" />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 leading-none">{user?.name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{user?.role}</p>
          </div>
        </button>
      </div>
    </header>
  );
}
