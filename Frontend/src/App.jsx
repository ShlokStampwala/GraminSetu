import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ReviewHighRiskPage from "./pages/review-high-risk";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import AddPatient from "./pages/AddPatient";
import PatientAnalysis from "./pages/PatientAnalysis";
import PatientProfileAsha from "./pages/viewProfileAsha";
import DoctorDashboard from "./pages/DoctorDashboard";
import FollowUpManagement from "./pages/Follow-up-management";
import AadhaarTest from "./pages/AadhaarTest";

// Naye Modules
import AdminPanel from "./pages/AdminPanel";
import AdminLogin from "./pages/AdminLogin"; // 👈 Naya Admin Login Page
import MedicalDashboard from "./pages/MedicalDashboard";

// Role-Based Protected Route logic
const ProtectedRoute = ({ children, allowedRole }) => {
  // Admin ke liye alag check aur User ke liye alag
  const isAdminLoggedIn = localStorage.getItem("adminRole") !== null;
  const isUserLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const userRole = localStorage.getItem("role");

  // Agar Admin route hai toh admin check karo
  if (allowedRole === "admin") {
    return isAdminLoggedIn ? children : <Navigate to="/admin-auth-portal" replace />;
  }

  // Users (ASHA/Doctor/Medical) ke liye check
  if (!isUserLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && userRole !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Public Routes --- */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/register" element={<Signup />} />
        
        {/* --- 🛡️ ADMIN PORTAL (SECRET ROUTES) --- */}
        {/* Ye wo secret URL hai jo tune bola tha */}
        <Route path="/admin-auth-portal" element={<AdminLogin />} /> 
        
        <Route path="/master-admin" element={
          <ProtectedRoute allowedRole="admin">
            <AdminPanel /> 
          </ProtectedRoute>
        } />

        {/* --- ASHA WORKER DASHBOARD --- */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRole="asha"><Dashboard /></ProtectedRoute>
        } />
        <Route path="/patients" element={
          <ProtectedRoute allowedRole="asha"><Patients /></ProtectedRoute>
        } />
        <Route path="/add-patient" element={
          <ProtectedRoute allowedRole="asha"><AddPatient /></ProtectedRoute>
        } />
        <Route path="/analysis/:aadhaar" element={
          <ProtectedRoute allowedRole="asha"><PatientAnalysis /></ProtectedRoute>
        } />
        <Route path="/asha/patient/:aadhaar" element={
          <ProtectedRoute allowedRole="asha"><PatientProfileAsha /></ProtectedRoute>
        } />

        {/* --- DOCTOR DASHBOARD --- */}
        <Route path="/doctor/dashboard" element={
          <ProtectedRoute allowedRole="doctor"><DoctorDashboard /></ProtectedRoute>
        } />
        <Route path="/doctor/dashboard/:aadhaar" element={
          <ProtectedRoute allowedRole="doctor"><DoctorDashboard /></ProtectedRoute>
        } />
        <Route path="/review-high-risk" element={
          <ProtectedRoute allowedRole="doctor"><ReviewHighRiskPage /></ProtectedRoute>
        } />
        <Route path="/DoctorPatientProfile" element={
          <ProtectedRoute allowedRole="doctor"><FollowUpManagement /></ProtectedRoute>
        } />

        {/* --- MEDICAL STORE DASHBOARD --- */}
        <Route path="/medical/dashboard" element={
          <ProtectedRoute allowedRole="medical"><MedicalDashboard /></ProtectedRoute>
        } />
        {/* --- AadharTest-- */}
       
<Route path="/test-aadhaar" element={<AadhaarTest />} />

        {/* --- Catch All Redirect --- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;