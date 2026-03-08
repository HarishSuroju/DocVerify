import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { useState } from "react";
import { HiOutlineDocumentText, HiOutlineEye, HiOutlineEyeSlash, HiOutlineShieldCheck, HiOutlineLockClosed, HiOutlineFingerPrint } from "react-icons/hi2";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function Login() {
  const { login, resendVerification } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(Boolean(location.state?.needsVerification));
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: location.state?.email || "" },
  });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const user = await login(values.email, values.password);
      toast.success("Welcome back!");
      if (!user.profileCompleted) {
        navigate("/profile");
      } else {
        navigate(user.role === "admin" ? "/admin" : "/dashboard");
      }
    } catch (err) {
      if (err.response?.status === 403) setNeedsVerification(true);
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const email = watch("email");
    if (!email) { toast.error("Enter your email first"); return; }
    setResendLoading(true);
    try {
      const res = await resendVerification(email);
      toast.success(res.message || "Verification email sent");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not resend verification email");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Animated Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-800 relative overflow-hidden">
        {/* Subtle background accents */}
        <div className="absolute top-20 -left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-300/5 rounded-full blur-3xl" />

        <div className="relative flex flex-col justify-center px-16 text-white">
          <motion.div
            className="flex items-center gap-3 mb-12"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <HiOutlineDocumentText className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">VerifyHub</span>
          </motion.div>

          <motion.h2
            className="text-4xl font-bold leading-tight mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Manage documents<br />with confidence.
          </motion.h2>
          <motion.p
            className="text-indigo-100 text-lg leading-relaxed max-w-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Generate, sign, and verify documents in one secure platform trusted by modern teams.
          </motion.p>

          {/* Animated stat cards */}
          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { val: "99.9%", label: "Uptime", icon: HiOutlineShieldCheck },
              { val: "256-bit", label: "Encryption", icon: HiOutlineLockClosed },
              { val: "< 2s", label: "PDF Gen", icon: HiOutlineFingerPrint },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                whileHover={{ y: -4, backgroundColor: "rgba(255,255,255,0.15)" }}
              >
                <s.icon className="w-5 h-5 text-indigo-200 mb-2" />
                <p className="text-xl font-bold">{s.val}</p>
                <p className="text-indigo-200 text-xs mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-indigo-50/30 relative">
        <motion.div
          className="w-full max-w-md"
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.1 }}
        >
          <motion.div variants={fadeUp} className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/50">
              <HiOutlineDocumentText className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">VerifyHub</span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-2xl font-bold text-slate-900 mb-1">Welcome back</motion.h1>
          <motion.p variants={fadeUp} className="text-sm text-slate-500 mb-8">Sign in to your account to continue</motion.p>

          {needsVerification && (
            <motion.div
              className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 backdrop-blur-sm px-5 py-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              <p className="text-sm text-amber-800">Your account is not verified yet. Enter the OTP from your email or request a new OTP.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="inline-flex rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60 cursor-pointer transition"
                >
                  {resendLoading ? "Sending..." : "Resend OTP"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/verify-email", { state: { email: watch("email") } })}
                  className="inline-flex rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 cursor-pointer transition"
                >
                  Enter OTP
                </button>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <motion.div variants={fadeUp}>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email address</label>
              <input
                type="email"
                {...register("email")}
                className="w-full glass rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition placeholder:text-slate-400"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-2">{errors.email.message}</p>}
            </motion.div>

            <motion.div variants={fadeUp}>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  className="w-full glass rounded-2xl px-4 py-3.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition placeholder:text-slate-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-2">{errors.password.message}</p>}
              <div className="mt-2 text-right">
                <Link to="/forgot-password" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition">
                  Forgot password?
                </Link>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <motion.button
                type="submit"
                disabled={loading}
                className="btn-glow w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-50 transition shadow-lg shadow-indigo-200/50 cursor-pointer"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </motion.button>
            </motion.div>
          </form>

          <motion.p variants={fadeUp} className="text-sm text-slate-500 text-center mt-8">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-indigo-600 font-semibold hover:text-indigo-700 transition">
              Create one
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
