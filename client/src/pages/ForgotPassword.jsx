import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { HiOutlineDocumentText } from "react-icons/hi2";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { forgotPassword, verifyResetOtp, resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setRequestLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      toast.success(res.message || "OTP sent");
      setOtpSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send OTP");
    } finally {
      setRequestLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast.error("Enter the OTP first");
      return;
    }

    setVerifyLoading(true);
    try {
      const res = await verifyResetOtp(email.trim(), otp.trim());
      toast.success(res.message || "OTP verified");
      setOtpVerified(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "OTP verification failed");
      setOtpVerified(false);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!otpVerified) {
      toast.error("Verify OTP before resetting password");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setResetLoading(true);
    try {
      const res = await resetPassword(email.trim(), otp.trim(), password, confirmPassword);
      toast.success(res.message || "Password reset successful");
      navigate("/login", { state: { email } });
    } catch (err) {
      toast.error(err.response?.data?.message || "Password reset failed");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-700 via-blue-700 to-sky-700 relative overflow-hidden">
        <div className="relative flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <HiOutlineDocumentText className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">DocVerify</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Reset your password
            <br />
            securely with OTP.
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed max-w-md">
            We will send a 6-digit verification code to your email so only you can reset your account.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl p-7 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot password</h1>
          <p className="text-sm text-gray-500 mb-6">Request OTP, verify it, then set a new password</p>

          <form onSubmit={handleRequestOtp} className="space-y-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={requestLoading}
              className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
            >
              {requestLoading ? "Sending OTP..." : otpSent ? "Resend OTP" : "Send OTP"}
            </button>
          </form>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">OTP code</label>
              <div className="flex gap-2">
                <input
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setOtpVerified(false);
                  }}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="123456"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={verifyLoading || !otpSent}
                  className="px-4 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                >
                  {verifyLoading ? "Checking" : otpVerified ? "Verified" : "Verify"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Min 8 characters"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  {showConfirmPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={resetLoading}
              className="w-full bg-emerald-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
            >
              {resetLoading ? "Resetting password..." : "Reset Password"}
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-6">
            Remembered your password?{" "}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
