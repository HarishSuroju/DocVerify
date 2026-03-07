import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import toast from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import {
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineFunnel,
  HiOutlineMagnifyingGlass,
} from "react-icons/hi2";

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [sort, setSort] = useState("created_desc");

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filter) params.status = filter;
    if (search.trim()) params.search = search.trim();
    if (expiryFilter) params.expiryFilter = expiryFilter;
    if (sort) params.sort = sort;
    api
      .get("/documents", { params })
      .then((res) => setDocuments(res.data.data))
      .catch(() => toast.error("Failed to load documents"))
      .finally(() => setLoading(false));
  }, [filter, search, expiryFilter, sort]);

  const statusStyles = {
    draft: "bg-gray-50 text-gray-600 border-gray-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    viewed: "bg-amber-50 text-amber-700 border-amber-200",
    signed: "bg-green-50 text-green-700 border-green-200",
    completed: "bg-purple-50 text-purple-700 border-purple-200",
  };

  const filters = ["", "draft", "sent", "viewed", "signed", "completed"];

  return (
    <DashboardLayout title="Documents">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          <p className="text-sm text-gray-500 mt-1">Track and manage all generated documents</p>
        </div>
        <Link
          to="/documents/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm shadow-blue-200"
        >
          <HiOutlinePlus className="w-4 h-4" />
          New Document
        </Link>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <HiOutlineMagnifyingGlass className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search document title"
            className="w-64 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <HiOutlineFunnel className="w-4 h-4 text-gray-400" />
        <select
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Expiry States</option>
          <option value="expiring-soon">Expiring Soon</option>
          <option value="expired">Expired</option>
          <option value="no-expiry">No Expiry</option>
          <option value="has-expiry">Has Expiry</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="created_desc">Newest First</option>
          <option value="created_asc">Oldest First</option>
          <option value="expires_asc">Expiry Soonest</option>
          <option value="expires_desc">Expiry Latest</option>
        </select>
        <div className="flex gap-1.5">
          {filters.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                filter === s
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100"
              }`}
            >
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <HiOutlineDocumentText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No documents found</p>
          <p className="text-sm text-gray-400 mt-1">Generate your first document from a template.</p>
          <Link
            to="/documents/new"
            className="inline-flex items-center gap-2 mt-5 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Generate Document
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {documents.map((doc, i) => (
            <Link
              key={doc._id}
              to={`/documents/${doc._id}`}
              className={`flex items-center justify-between px-6 py-4 hover:bg-gray-50/80 transition group ${
                i !== documents.length - 1 ? "border-b border-gray-50" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <HiOutlineDocumentText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition">
                    {doc.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Assigned to: {doc.assignedTo?.name || "—"} ·{" "}
                    {new Date(doc.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs mt-1">
                    <span className="text-gray-400">Expires:</span>{" "}
                    <span className={doc.expiresAt ? "text-gray-600" : "text-gray-400"}>
                      {doc.expiresAt
                        ? new Date(doc.expiresAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "No expiry"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wide border ${
                    statusStyles[doc.status] || "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  {doc.status}
                </span>
                {doc.expiresAt &&
                  new Date(doc.expiresAt).getTime() > Date.now() &&
                  new Date(doc.expiresAt).getTime() <= Date.now() + 3 * 24 * 60 * 60 * 1000 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold uppercase tracking-wide">
                    Expiring Soon
                  </span>
                )}
                {doc.expiresAt && new Date(doc.expiresAt).getTime() <= Date.now() && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 font-semibold uppercase tracking-wide">
                    Expired
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
