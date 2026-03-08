import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, useScroll, useTransform } from "framer-motion";
import { TypeAnimation } from "react-type-animation";
import {
  HiOutlineDocumentText,
  HiOutlineShieldCheck,
  HiOutlinePencilSquare,
  HiOutlineChartBar,
  HiOutlineClock,
  HiOutlineCloudArrowUp,
  HiOutlineArrowRight,
  HiOutlineSparkles,
  HiOutlineFingerPrint,
  HiOutlineLockClosed,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: HiOutlineDocumentText,
    title: "Template Engine",
    desc: "Create reusable document templates with dynamic placeholders.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    icon: HiOutlinePencilSquare,
    title: "E-Signatures",
    desc: "Draw and embed legally-binding digital signatures on any document.",
    gradient: "from-violet-500 to-purple-400",
  },
  {
    icon: HiOutlineShieldCheck,
    title: "Identity Verification",
    desc: "Verify user identity through document uploads and admin review.",
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    icon: HiOutlineChartBar,
    title: "Audit Trail",
    desc: "Complete tamper-proof logging of every action for compliance.",
    gradient: "from-orange-500 to-amber-400",
  },
  {
    icon: HiOutlineClock,
    title: "Real-time Status",
    desc: "Track document lifecycle from draft to signed in real time.",
    gradient: "from-pink-500 to-rose-400",
  },
  {
    icon: HiOutlineCloudArrowUp,
    title: "Cloud Storage",
    desc: "All documents securely stored on Microsoft Azure Blob Storage.",
    gradient: "from-indigo-500 to-blue-400",
  },
];

const steps = [
  {
    num: "01",
    title: "Create a Template",
    desc: "Design your document template with dynamic fields and placeholders.",
    icon: HiOutlineDocumentText,
  },
  {
    num: "02",
    title: "Generate & Assign",
    desc: "Fill in values, assign signers, and send documents instantly.",
    icon: HiOutlineFingerPrint,
  },
  {
    num: "03",
    title: "Sign & Verify",
    desc: "Signer draws their signature — verified PDF generated instantly.",
    icon: HiOutlineLockClosed,
  },
];

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};



export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const navBg = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Animated Navbar */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{ "--nav-bg": navBg }}
      >
        <div className="glass border-b border-white/20">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <motion.div
                className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200"
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                transition={{ duration: 0.4 }}
              >
                <HiOutlineDocumentText className="w-5 h-5 text-white" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
                VerifyHub
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-8 text-sm text-slate-500">
              <a href="#features" className="hover:text-indigo-600 transition-colors duration-200">Features</a>
              <a href="#how-it-works" className="hover:text-indigo-600 transition-colors duration-200">How It Works</a>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <button
                  className="btn-glow bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300"
                  onClick={() => {
                    if (!user.profileCompleted) {
                      navigate("/profile");
                    } else {
                      navigate("/dashboard");
                    }
                  }}
                >
                  Dashboard
                </button>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors px-3 py-2">
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    className="btn-glow bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Soft background */}
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-20 w-full">
          <motion.div
            className="text-center"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Badge */}
            <motion.div variants={fadeUp} className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 glass px-5 py-2 rounded-full text-sm text-indigo-700 font-medium shadow-sm">
                <HiOutlineSparkles className="w-4 h-4 text-indigo-500" />
                <span>Trusted by teams for secure document workflows</span>
                <motion.span
                  className="w-2 h-2 bg-emerald-500 rounded-full"
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={fadeUp}
              className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight max-w-4xl mx-auto"
            >
              Digital Documents,{" "}
              <span className="gradient-text">
                <TypeAnimation
                  sequence={["Verified & Signed", 3000, "Secure & Trusted", 3000, "Fast & Reliable", 3000]}
                  wrapper="span"
                  repeat={Infinity}
                  speed={40}
                  deletionSpeed={50}
                />
              </span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed"
            >
              Generate documents from templates, collect e-signatures, and verify
              identities — all in one streamlined platform.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/register">
                <motion.div
                  className="btn-glow bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl text-sm font-semibold shadow-xl shadow-indigo-200/50 flex items-center gap-2"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Start Free Trial
                  <HiOutlineArrowRight className="w-4 h-4" />
                </motion.div>
              </Link>
              <a href="#how-it-works">
                <motion.div
                  className="glass px-8 py-4 rounded-2xl text-sm font-semibold text-slate-700 shadow-sm flex items-center gap-2 hover:shadow-md"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  See How It Works
                </motion.div>
              </a>
            </motion.div>

            {/* Animated product preview */}
            <motion.div
              variants={scaleIn}
              className="mt-20 max-w-4xl mx-auto"
            >
              <motion.div
                className="card-3d rounded-3xl glass shadow-2xl shadow-indigo-100/50 overflow-hidden"
                whileHover={{ y: -4 }}
              >
                <div className="flex items-center gap-2 px-5 py-3.5 bg-white/50 border-b border-white/30">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="ml-4 text-xs text-slate-400 font-mono">verifyhub.app/dashboard</span>
                </div>
                <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-white">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {[
                      { val: "12", label: "Users", color: "from-blue-500 to-cyan-400" },
                      { val: "34", label: "Documents", color: "from-emerald-500 to-teal-400" },
                      { val: "21", label: "Signed", color: "from-violet-500 to-purple-400" },
                      { val: "8", label: "Pending", color: "from-amber-500 to-orange-400" },
                    ].map((s, i) => (
                      <motion.div
                        key={i}
                        className="glass rounded-2xl p-4 text-center hover:shadow-md transition-shadow"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + i * 0.1 }}
                      >
                        <div className={`text-2xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>
                          {s.val}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                      </motion.div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: "Employment Agreement", status: "Signed", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                      { name: "NDA Template", status: "Pending", color: "bg-amber-50 text-amber-700 border-amber-100" },
                      { name: "Offer Letter", status: "Draft", color: "bg-slate-50 text-slate-500 border-slate-100" },
                    ].map((d, i) => (
                      <motion.div
                        key={i}
                        className="flex items-center justify-between glass rounded-xl px-4 py-3 hover:shadow-sm transition-shadow"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2 + i * 0.1 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                            <HiOutlineDocumentText className="w-4 h-4 text-indigo-500" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{d.name}</span>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium border ${d.color}`}>
                          {d.status}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white to-slate-50/50" />
        <div className="relative max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold tracking-wide uppercase mb-4 border border-indigo-100">
              Features
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Everything you need to manage documents
            </h2>
            <p className="mt-4 text-slate-500 max-w-lg mx-auto text-lg">
              Powerful tools built for modern teams that need secure, verifiable document workflows.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="card-3d group relative glass rounded-3xl p-7 hover:shadow-xl hover:shadow-indigo-100/30 transition-all duration-500 cursor-default"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                {/* Gradient border on hover */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-200/0 to-purple-200/0 group-hover:from-indigo-200/30 group-hover:to-purple-200/30 transition-all duration-500 -z-10" />

                <motion.div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5 shadow-lg`}
                  whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                >
                  <f.icon className="w-6 h-6 text-white" />
                </motion.div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-28 bg-slate-900 overflow-hidden">
        {/* Subtle background accent */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide uppercase mb-4 border border-indigo-500/30">
              How It Works
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Three simple steps
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-indigo-500/50" />

            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                className="text-center relative"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.5 }}
              >
                <motion.div
                  className="relative w-16 h-16 mx-auto mb-6"
                  whileHover={{ scale: 1.15 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl rotate-3" />
                  <div className="relative w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
                    <s.icon className="w-7 h-7" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-lg flex items-center justify-center text-xs font-bold text-indigo-600 shadow-lg">
                    {s.num}
                  </div>
                </motion.div>
                <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 to-purple-50/60" />
        <motion.div
          className="relative max-w-3xl mx-auto px-6 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
            Ready to streamline your documents?
          </h2>
          <p className="text-slate-500 mb-10 max-w-md mx-auto text-lg">
            Join teams that trust VerifyHub for secure document generation, e-signatures, and identity verification.
          </p>
          <Link to="/register">
            <motion.div
              className="inline-flex items-center gap-2 btn-glow bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-4 rounded-2xl text-sm font-semibold shadow-xl shadow-indigo-200/50"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Started Free
              <HiOutlineArrowRight className="w-4 h-4" />
            </motion.div>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-slate-200/50 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <HiOutlineDocumentText className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
              VerifyHub
            </span>
          </div>
          <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} VerifyHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
