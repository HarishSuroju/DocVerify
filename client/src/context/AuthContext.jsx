import { createContext, useContext, useState, useEffect, useRef } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const bootstrappedRef = useRef(false);

  const isJwtExpired = (token) => {
    try {
      const payloadBase64 = token.split(".")[1];
      if (!payloadBase64) return true;
      const payload = JSON.parse(atob(payloadBase64));
      if (!payload.exp) return false;
      return payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  };

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const token = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    if (token && refreshToken && !isJwtExpired(token)) {
      api
        .get("/auth/me")
        .then((res) => setUser(res.data.data))
        .catch(() => {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("accessToken", data.data.accessToken);
    localStorage.setItem("refreshToken", data.data.refreshToken);
    setUser(data.data.user);
    return data.data.user;
  };

  const register = async (name, email, password, role = "user") => {
    const { data } = await api.post("/auth/register", { name, email, password, role });
    return data.data;
  };

  const resendVerification = async (email) => {
    const { data } = await api.post("/auth/resend-verification", { email });
    return data;
  };

  const verifyEmailOtp = async (email, otp) => {
    const { data } = await api.post("/auth/verify-email-otp", { email, otp });
    return data;
  };

  const forgotPassword = async (email) => {
    const { data } = await api.post("/auth/forgot-password", { email });
    return data;
  };

  const verifyResetOtp = async (email, otp) => {
    const { data } = await api.post("/auth/verify-reset-otp", { email, otp });
    return data;
  };

  const resetPassword = async (email, otp, password, confirmPassword) => {
    const { data } = await api.post("/auth/reset-password", { email, otp, password, confirmPassword });
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        resendVerification,
        verifyEmailOtp,
        forgotPassword,
        verifyResetOtp,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
