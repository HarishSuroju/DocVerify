import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlineDocumentText,
  HiOutlineShieldCheck,
  HiOutlinePencilSquare,
  HiOutlineChartBar,
  HiOutlineClock,
  HiOutlineCloudArrowUp,
} from "react-icons/hi2";

const features = [
  {
    icon: HiOutlineDocumentText,
    title: "Template Engine",
    desc: "Create reusable document templates with dynamic placeholders.",
  },
  {
    icon: HiOutlinePencilSquare,
    title: "E-Signatures",
    desc: "Draw and embed legally-binding digital signatures on any document.",
  },
  {
    icon: HiOutlineShieldCheck,
    title: "Identity Verification",
    desc: "Verify user identity through document uploads and admin review.",
  },
  {
    icon: HiOutlineChartBar,
    title: "Audit Trail",
    desc: "Complete tamper-proof logging of every action for compliance.",
  },
  {
    icon: HiOutlineClock,
    title: "Real-time Status",
    desc: "Track document lifecycle from draft to signed in real time.",
  },
  {
    icon: HiOutlineCloudArrowUp,
    title: "Cloud Storage",
    desc: "All documents securely stored on Microsoft Azure Blob Storage.",
  },
];

const steps = [
  { num: "01", title: "Create a Template", desc: "Design your document template with dynamic fields." },
  { num: "02", title: "Generate & Assign", desc: "Fill in values and assign the document to a signer." },
  { num: "03", title: "Sign & Complete", desc: "Signer draws their signature — PDF generated instantly." },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <HiOutlineDocumentText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">DocVerify</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition">How It Works</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm shadow-blue-200"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition px-3 py-2">
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm shadow-blue-200"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 to-white pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-blue-100">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            Trusted by teams for secure document workflows
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight max-w-3xl mx-auto">
            Digital Documents,{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Verified & Signed
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Generate documents from templates, collect e-signatures, and verify identities — all in one streamlined platform.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="bg-blue-600 text-white px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200 w-full sm:w-auto"
            >
              Start Free Trial
            </Link>
            <a
              href="#how-it-works"
              className="border border-gray-200 text-gray-700 px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition w-full sm:w-auto"
            >
              See How It Works
            </a>
          </div>
          {/* Product preview */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-gray-400 font-mono">docverify.app/dashboard</span>
              </div>
              <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-white">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {["12 Users", "34 Documents", "21 Signed", "8 Pending"].map((s, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
                      <p className="text-xl font-bold text-gray-900">{s.split(" ")[0]}</p>
                      <p className="text-xs text-gray-400 mt-1">{s.split(" ")[1]}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {["Employment Agreement — Signed", "NDA Template — Pending", "Offer Letter — Draft"].map((d, i) => (
                    <div key={i} className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-4 py-3 shadow-sm">
                      <span className="text-sm text-gray-700">{d.split(" — ")[0]}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        i === 0 ? "bg-green-50 text-green-700" : i === 1 ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"
                      }`}>{d.split(" — ")[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-blue-600 font-semibold text-sm mb-2">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Everything you need to manage documents</h2>
            <p className="mt-4 text-gray-500 max-w-lg mx-auto">Powerful tools built for modern teams that need secure, verifiable document workflows.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition">
                  <f.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-blue-600 font-semibold text-sm mb-2">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Three simple steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-200">
                  {s.num}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Ready to streamline your documents?</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">Join teams that trust DocVerify for secure document generation, e-signatures, and identity verification.</p>
          <Link
            to="/register"
            className="inline-block bg-blue-600 text-white px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <HiOutlineDocumentText className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">DocVerify</span>
          </div>
          <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} DocVerify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
