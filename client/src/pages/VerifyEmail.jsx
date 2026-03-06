import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { HiOutlineCheckCircle, HiOutlineXCircle } from "react-icons/hi2";

export default function VerifyEmail() {
  const { verifyEmailOtp, resendVerification } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | success | error
  const [message, setMessage] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyEmailOtp(email.trim(), otp.trim());
      setStatus("success");
      setMessage(res.message || "Email verified successfully!");
      toast.success("Email verified");
      setTimeout(() => navigate("/login", { state: { email: email.trim() } }), 1200);
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.message || "Verification failed. OTP may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first");
      return;
    }

    setResendLoading(true);
    try {
      const res = await resendVerification(email.trim());
      toast.success(res.message || "OTP sent");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not resend OTP");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Verify your email</h1>
        <p className="text-sm text-gray-500 mb-6">Enter the 6-digit OTP sent to your inbox.</p>

        {status === "success" && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 flex gap-2 items-start">
            <HiOutlineCheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 flex gap-2 items-start">
            <HiOutlineXCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{message}</p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">6-digit OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm tracking-[0.3em] text-center font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResendOtp}
          disabled={resendLoading}
          className="w-full mt-3 border border-gray-200 text-gray-700 rounded-xl py-3 text-sm font-semibold hover:bg-gray-100 disabled:opacity-60 cursor-pointer"
        >
          {resendLoading ? "Sending OTP..." : "Resend OTP"}
        </button>

        <p className="text-sm text-gray-500 text-center mt-6">
          Back to{" "}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
