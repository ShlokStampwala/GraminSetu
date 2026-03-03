import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  User, Stethoscope, ShoppingBag, MapPin, 
  Clock, Briefcase, Globe, Key, ShieldCheck 
} from 'lucide-react';

export default function Signup() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [role, setRole] = useState('asha');
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', age: '', password: '', masterKey: '',
    village: '', taluka: '', district: '', state: 'Gujarat',
    specialty: '', experience: '', hospitalAddress: '', hospitalTiming: '',
    licenseNo: '', pharmacyName: ''
  });

  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", 
    "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
    "Uttar Pradesh", "Uttarakhand", "West Bengal"
  ];

  // 🌐 3-Language Toggle Logic
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/auth/register-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role }),
      });
      
      if (response.ok) {
        alert(t('Request Sent Successfully!'));
        navigate('/login');
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Error");
      }
    } catch (error) {
      alert("Backend Error: Check if Flask is running on port 5000");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center py-12 px-6">
      
      {/* 🌐 3-Language Switcher (Top Right) */}
      <div className="fixed top-6 right-6 flex bg-white border-2 border-slate-800 rounded-2xl p-1 shadow-lg z-50">
        {[
          { code: 'en', label: 'EN' },
          { code: 'gu', label: 'ગુજ' },
          { code: 'hi', label: 'हिन्दी' }
        ].map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
              i18n.language === lang.code ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-800'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl p-8 md:p-12 border border-slate-200 relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[5rem] -z-10" />

        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">
            Gramin<span className="text-emerald-600">Setu</span> 2.0
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">
            {t('Healthcare Network Access Request')}
          </p>
        </div>

        {/* Role Tabs */}
        <div className="flex bg-slate-100 p-2 gap-2 rounded-2xl mb-8 border border-slate-200">
          {[
            { id: 'asha', icon: <User size={14}/>, label: 'ASHA' },
            { id: 'doctor', icon: <Stethoscope size={14}/>, label: 'Doctor' },
            { id: 'medical', icon: <ShoppingBag size={14}/>, label: 'Medical' }
          ].map((r) => (
            <button 
              key={r.id} 
              type="button" 
              onClick={() => setRole(r.id)} 
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${
                role === r.id ? 'bg-white shadow-md text-emerald-600 border border-slate-100' : 'text-slate-400'
              }`}
            >
              {r.icon} {t(r.label)}
            </button>
          ))}
        </div>

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-bold">
          
          {/* 🔑 Master Key Section */}
          <div className="md:col-span-2 bg-amber-50 p-5 rounded-3xl border-2 border-amber-100 flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-600">
              <Key size={24} />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase text-amber-600 block mb-1">{t('Authorization Key')}</label>
              <input 
                name="masterKey" 
                placeholder={t('Enter Master Key')} 
                onChange={handleChange} 
                className="w-full bg-transparent outline-none text-slate-800 placeholder:text-amber-200" 
                required 
              />
            </div>
          </div>

          <input name="name" placeholder={t('Full Name')} onChange={handleChange} className="p-4 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500 border-slate-200" required />
          <input name="phone" placeholder={t('Phone Number')} onChange={handleChange} className="p-4 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500 border-slate-200" required />
          <input name="email" type="email" placeholder={t('Email Address')} onChange={handleChange} className="p-4 border rounded-2xl bg-slate-50 border-slate-200 outline-none" required />
          <input name="age" type="number" placeholder={t('Age')} onChange={handleChange} className="p-4 border rounded-2xl bg-slate-50 border-slate-200 outline-none" required />

          {/* Location Grid */}
          <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-5 rounded-[2rem] border border-slate-200">
            <div className="space-y-1">
              <label className="text-[9px] uppercase text-slate-400 ml-2">{t('State')}</label>
              <select name="state" value={formData.state} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-white text-xs outline-none focus:border-emerald-500">
                {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase text-slate-400 ml-2">{t('District')}</label>
              <input name="district" placeholder={t('District')} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-white text-xs outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase text-slate-400 ml-2">{t('Taluka')}</label>
              <input name="taluka" placeholder={t('Taluka')} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-white text-xs outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase text-slate-400 ml-2">{t('Village')}</label>
              <input name="village" placeholder={t('Village')} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-white text-xs outline-none" required />
            </div>
          </div>

          {/* 🩺 Doctor Fields */}
          {role === 'doctor' && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4">
              <input name="specialty" placeholder={t('Specialization')} onChange={handleChange} className="p-4 border rounded-2xl bg-emerald-50/30 border-emerald-100 outline-none" required />
              <input name="experience" type="number" placeholder={t('Experience')} onChange={handleChange} className="p-4 border rounded-2xl bg-emerald-50/30 border-emerald-100 outline-none" required />
              <input name="hospitalAddress" placeholder={t('Hospital Address')} onChange={handleChange} className="md:col-span-2 p-4 border rounded-2xl bg-emerald-50/30 border-emerald-100 outline-none" required />
            </div>
          )}

          {/* 💊 Medical Store Fields */}
          {role === 'medical' && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4">
              <input name="pharmacyName" placeholder={t('Pharmacy Name')} onChange={handleChange} className="p-4 border rounded-2xl bg-blue-50/30 border-blue-100 outline-none" required />
              <input name="licenseNo" placeholder={t('License Number')} onChange={handleChange} className="p-4 border rounded-2xl bg-blue-50/30 border-blue-100 outline-none" required />
              <input name="hospitalAddress" placeholder={t('Store Address')} onChange={handleChange} className="md:col-span-2 p-4 border rounded-2xl bg-blue-50/30 border-blue-100 outline-none" required />
            </div>
          )}

          <input name="password" type="password" placeholder={t('Create Password')} onChange={handleChange} className="md:col-span-2 p-4 border rounded-2xl bg-slate-50 border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required />

          <button type="submit" className="md:col-span-2 bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-emerald-600 transition shadow-xl mt-4 uppercase tracking-[0.2em] active:scale-95 flex items-center justify-center gap-3">
            <ShieldCheck size={20} />
            {t('Send Registration Request')}
          </button>
        </form>

        <p onClick={() => navigate('/login')} className="text-center mt-8 text-slate-400 font-bold cursor-pointer hover:text-emerald-600 transition text-xs uppercase tracking-widest">
          {t('Already verified? Login')}
        </p>
      </div>
    </div>
  );
}