import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { useState } from "react";
import { HiOutlineDocumentText, HiOutlineEye, HiOutlineEyeSlash } from "react-icons/hi2";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

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
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      if (err.response?.status === 403) {
        setNeedsVerification(true);
      }
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const email = watch("email");
    if (!email) {
      toast.error("Enter your email first");
      return;
    }

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
      {/* Left — Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-300 rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <HiOutlineDocumentText className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">DocVerify</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Manage documents<br />with confidence.
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed max-w-md">
            Generate, sign, and verify documents in one secure platform trusted by modern teams.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { val: "99.9%", label: "Uptime" },
              { val: "256-bit", label: "Encryption" },
              { val: "< 2s", label: "PDF Gen" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold">{s.val}</p>
                <p className="text-blue-200 text-sm mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <HiOutlineDocumentText className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">DocVerify</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-8">Sign in to your account to continue</p>

          {needsVerification && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-800">Your account is not verified yet. Enter the OTP from your email or request a new OTP.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="inline-flex rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60 cursor-pointer"
                >
                  {resendLoading ? "Sending..." : "Resend OTP"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/verify-email", { state: { email: watch("email") } })}
                  className="inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 cursor-pointer"
                >
                  Enter OTP
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                {...register("email")}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder:text-gray-400"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder:text-gray-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  {showPassword ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
              <div className="mt-2 text-right">
                <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm shadow-blue-200 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-8">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-blue-600 font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
