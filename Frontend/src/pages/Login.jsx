import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, User, Stethoscope, ShoppingBag } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [role, setRole] = useState(null); 
  const [formData, setFormData] = useState({ phone: '', password: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Offline Cache Check for ASHA
    if (role === 'asha') {
      const cached = JSON.parse(localStorage.getItem('asha_user_data'));
      if (cached && cached.phone === formData.phone && cached.password === formData.password) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('role', 'asha');
        navigate('/dashboard');
        return;
      }
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role }),
      });
      const data = await response.json();

      if (response.ok) {
        // ── Store user data for EVERY role ──────────────────────
        if (role === 'asha') {
          // ASHA: password bhi cache karo (offline login ke liye)
          localStorage.setItem('asha_user_data', JSON.stringify({ ...data.user, password: formData.password }));
        }

        if (role === 'doctor') {
          // ✅ FIX: Doctor ka naam, specialty sab store karo
          localStorage.setItem('doctor_user_data', JSON.stringify(data.user));
        }

        if (role === 'medical') {
          localStorage.setItem('medical_user_data', JSON.stringify(data.user));
        }

        // Common flags
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('role', role);

        // Redirect
        if (role === 'asha')    navigate('/dashboard');
        else if (role === 'doctor')  navigate('/doctor/dashboard');
        else if (role === 'medical') navigate('/medical/dashboard');

      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("System Offline: Use last successful login.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8 border border-slate-200 relative">
        
        <button 
          onClick={() => role ? setRole(null) : navigate('/')} 
          className="absolute top-4 left-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>

        {!role ? (
          <div className="pt-6 space-y-4">
            <h2 className="text-center font-black text-slate-800 uppercase tracking-widest text-sm mb-4">Select Your Role</h2>
            <div className="grid grid-cols-1 gap-3">
              
              {/* ASHA WORKER */}
              <button 
                onClick={() => setRole('asha')}
                className="flex items-center justify-between p-4 border-2 border-slate-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <User size={24} />
                  </div>
                  <span className="font-bold text-slate-700 uppercase text-xs tracking-wider">ASHA WORKER</span>
                </div>
              </button>
              
              {/* DOCTOR */}
              <button 
                onClick={() => setRole('doctor')}
                className="flex items-center justify-between p-4 border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Stethoscope size={24} />
                  </div>
                  <span className="font-bold text-slate-700 uppercase text-xs tracking-wider">DOCTOR</span>
                </div>
              </button>

              {/* MEDICAL STORE */}
              <button 
                onClick={() => setRole('medical')}
                className="flex items-center justify-between p-4 border-2 border-slate-100 rounded-2xl hover:border-amber-500 hover:bg-amber-50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-all">
                    <ShoppingBag size={24} />
                  </div>
                  <span className="font-bold text-slate-700 uppercase text-xs tracking-wider">MEDICAL STORE</span>
                </div>
              </button>

            </div>
          </div>
        ) : (
          <div className="pt-6">
            <div className="text-center mb-8">
              <span className="px-4 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                Logging in as {role}
              </span>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="shrink-0 w-24">Phone No :</span> 
                <input name="phone" onChange={handleChange} className="flex-1 p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50" required />
              </div>

              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="shrink-0 w-24 uppercase">Password :</span> 
                <input type="password" name="password" onChange={handleChange} className="flex-1 p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50" required />
              </div>

              <div className="text-center">
                <button className="px-10 py-2 border-2 border-slate-800 rounded-xl font-bold bg-white hover:bg-slate-800 hover:text-white transition-all uppercase text-xs tracking-widest">
                  Login
                </button>
                <p 
                  onClick={() => navigate('/register')} 
                  className="mt-8 text-blue-600 font-bold cursor-pointer hover:underline text-[10px] uppercase tracking-widest"
                >
                  No account? Request Access
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}