import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../lib/api";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import { HiOutlineArrowLeft, HiOutlineCodeBracket } from "react-icons/hi2";
import { Link } from "react-router-dom";

const schema = z.object({
  title: z.string().min(1, "Title required"),
  content: z.string().min(1, "Content required"),
});

export default function NewTemplate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({ resolver: zodResolver(schema) });

  const content = watch("content", "");
  const placeholders = [...new Set((content.match(/\{\{(\w+)\}\}/g) || []).map((m) => m.replace(/\{|\}/g, "")))];

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await api.post("/templates", values);
      toast.success("Template created");
      navigate("/templates");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="New Template">
      <Link
        to="/templates"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition mb-6"
      >
        <HiOutlineArrowLeft className="w-4 h-4" />
        Back to Templates
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create Template</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Template Title</label>
                <input
                  {...register("title")}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Employment Agreement"
                />
                {errors.title && <p className="text-red-500 text-xs mt-1.5">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Content
                  <span className="text-gray-400 font-normal ml-1">
                    — Use {"{{placeholder}}"} for dynamic fields
                  </span>
                </label>
                <textarea
                  {...register("content")}
                  rows={14}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  placeholder={`This agreement is made between {{company_name}} and {{employee_name}} on {{date}}...`}
                />
                {errors.content && <p className="text-red-500 text-xs mt-1.5">{errors.content.message}</p>}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm shadow-blue-200 cursor-pointer"
                >
                  {loading && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {loading ? "Creating..." : "Create Template"}
                </button>
                <Link
                  to="/templates"
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar — Detected Placeholders */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <HiOutlineCodeBracket className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Detected Placeholders</h3>
            </div>

            {placeholders.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {placeholders.map((p) => (
                  <span
                    key={p}
                    className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-blue-100"
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Type <code className="bg-gray-50 px-1 rounded text-[11px]">{"{{field_name}}"}</code> in the content to add dynamic placeholders.
              </p>
            )}

            <div className="mt-6 pt-5 border-t border-gray-50">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Tips</p>
              <ul className="space-y-2 text-xs text-gray-500">
                <li>• Use descriptive names like <code className="bg-gray-50 px-1 rounded">full_name</code></li>
                <li>• Placeholders are case-sensitive</li>
                <li>• Users fill in values when generating docs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
