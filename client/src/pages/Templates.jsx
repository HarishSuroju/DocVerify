import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import {
  HiOutlineRectangleStack,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineDocumentPlus,
} from "react-icons/hi2";

export default function Templates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/templates")
      .then((res) => setTemplates(res.data.data))
      .catch(() => toast.error("Failed to load templates"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    try {
      await api.delete(`/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t._id !== id));
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <DashboardLayout title="Templates">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Templates</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your reusable document templates</p>
        </div>
        {user.role === "admin" && (
          <Link
            to="/templates/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm shadow-blue-200"
          >
            <HiOutlinePlus className="w-4 h-4" />
            New Template
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <HiOutlineRectangleStack className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No templates yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first template to get started.</p>
          {user.role === "admin" && (
            <Link
              to="/templates/new"
              className="inline-flex items-center gap-2 mt-5 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Create Template
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t) => (
            <div
              key={t._id}
              className="group bg-white rounded-2xl border border-gray-100 p-6 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/50 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <HiOutlineRectangleStack className="w-5 h-5 text-blue-600" />
                </div>
                {user.role === "admin" && (
                  <button
                    onClick={() => handleDelete(t._id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{t.title}</h3>
              <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                {t.placeholders?.slice(0, 4).map((p) => (
                  <span key={p} className="text-[11px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md border border-gray-100">
                    {p}
                  </span>
                ))}
                {(t.placeholders?.length || 0) > 4 && (
                  <span className="text-[11px] text-gray-400 px-1">+{t.placeholders.length - 4}</span>
                )}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <p className="text-xs text-gray-400">
                  {new Date(t.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <Link
                  to={`/documents/new?templateId=${t._id}`}
                  className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline"
                >
                  <HiOutlineDocumentPlus className="w-4 h-4" />
                  Use
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
