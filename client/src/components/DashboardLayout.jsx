import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <Sidebar />
      <div className="ml-64">
        <Topbar title={title} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
