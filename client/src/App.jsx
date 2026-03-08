import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Templates from "./pages/Templates";
import NewTemplate from "./pages/NewTemplate";
import Documents from "./pages/Documents";
import NewDocument from "./pages/NewDocument";
import DocumentDetail from "./pages/DocumentDetail";
import AdminPanel from "./pages/AdminPanel";
import VerifyEmail from "./pages/VerifyEmail";
import Notifications from "./pages/Notifications";
import VerifyIdentity from "./pages/VerifyIdentity";
import ProfilePage from "./pages/ProfilePage";

const pageVariants = {
  initial: { opacity: 0, y: 20, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -20, filter: "blur(8px)" },
};

const pageTransition = { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] };

function AnimatedPage({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public */}
          <Route path="/" element={<AnimatedPage><Landing /></AnimatedPage>} />
          <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
          <Route path="/register" element={<AnimatedPage><Register /></AnimatedPage>} />
          <Route path="/forgot-password" element={<AnimatedPage><ForgotPassword /></AnimatedPage>} />
          <Route path="/verify-email" element={<AnimatedPage><VerifyEmail /></AnimatedPage>} />

          {/* Protected */}
          <Route path="/dashboard" element={<ProtectedRoute><AnimatedPage><Dashboard /></AnimatedPage></ProtectedRoute>} />
          <Route path="/templates" element={<ProtectedRoute><AnimatedPage><Templates /></AnimatedPage></ProtectedRoute>} />
          <Route path="/templates/new" element={<ProtectedRoute adminOnly><AnimatedPage><NewTemplate /></AnimatedPage></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><AnimatedPage><Documents /></AnimatedPage></ProtectedRoute>} />
          <Route path="/documents/new" element={<ProtectedRoute><AnimatedPage><NewDocument /></AnimatedPage></ProtectedRoute>} />
          <Route path="/documents/:id" element={<ProtectedRoute><AnimatedPage><DocumentDetail /></AnimatedPage></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><AnimatedPage><Notifications /></AnimatedPage></ProtectedRoute>} />
          <Route path="/verify-identity" element={<ProtectedRoute><AnimatedPage><VerifyIdentity /></AnimatedPage></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AnimatedPage><AdminPanel /></AnimatedPage></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><AnimatedPage><ProfilePage /></AnimatedPage></ProtectedRoute>} />
          <Route path="/proile" element={<Navigate to="/profile" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;
