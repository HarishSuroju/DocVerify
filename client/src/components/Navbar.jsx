import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className="text-lg font-bold text-blue-600">
          DocVerify
        </Link>
        <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 text-sm">
          Dashboard
        </Link>
        <Link to="/templates" className="text-gray-600 hover:text-gray-900 text-sm">
          Templates
        </Link>
        <Link to="/documents" className="text-gray-600 hover:text-gray-900 text-sm">
          Documents
        </Link>
        {user.role === "admin" && (
          <Link to="/admin" className="text-gray-600 hover:text-gray-900 text-sm">
            Admin
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          {user.name}{" "}
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {user.role}
          </span>
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 hover:text-red-700 cursor-pointer"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
