import { useAuth } from "../context/AuthContext";
import { HiOutlineBell } from "react-icons/hi2";

export default function Topbar({ title }) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white/80 backdrop-blur-lg border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-xl hover:bg-gray-50 transition cursor-pointer">
          <HiOutlineBell className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-none">{user?.name}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
