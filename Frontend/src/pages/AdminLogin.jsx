import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setCredentials({ ...credentials, [e.target.name]: e.target.value });

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('adminRole', data.role);
        localStorage.setItem('adminName', data.name);
        if(data.taluka) localStorage.setItem('adminTaluka', data.taluka);
        navigate('/master-admin'); // Admin Panel par bhej do
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Backend Connection Failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 border border-slate-700 relative overflow-hidden">
        
        {/* Security Badge */}
        <div className="flex justify-center mb-6">
          <div className="bg-emerald-500/10 p-4 rounded-3xl text-emerald-400 border border-emerald-500/20">
            <ShieldAlert size={40} />
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
            GS 2.0 <span className="text-emerald-400">Authority</span>
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">
            Authorized Personnel Only
          </p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-slate-500 ml-2 font-black">Official Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-slate-500" size={18} />
              <input 
                name="email" 
                type="email" 
                placeholder="admin@graminsetu.com" 
                onChange={handleChange} 
                className="w-full p-4 pl-12 border-none rounded-2xl bg-slate-900 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-slate-500 ml-2 font-black">Access Code</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-slate-500" size={18} />
              <input 
                name="password" 
                type="password" 
                placeholder="••••••••" 
                onChange={handleChange} 
                className="w-full p-4 pl-12 border-none rounded-2xl bg-slate-900 text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 text-slate-900 py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-400 transition-all uppercase tracking-widest mt-6 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : <><ShieldCheck size={22}/> Verify Identity</>}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500 font-bold text-[9px] uppercase tracking-widest">
          IP LOGGING ENABLED • SYSTEM SECURE
        </p>
      </div>
    </div>
  );
}