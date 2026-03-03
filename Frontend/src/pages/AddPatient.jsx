import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useTranslation } from "react-i18next";
import predictHeartRisk from "../edge_model"; 
import { validateAadhaar } from "../utils/aadhaarValidation"; 
import { 
  CheckCircle2, AlertCircle, Search, Save, UserPlus, 
  Cigarette, GlassWater, Activity 
} from "lucide-react";

export default function AddPatient() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isAadhaarValid, setIsAadhaarValid] = useState(null);
  const [showFullForm, setShowFullForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "", aadhaar: "", age: "", gender: "1",
    height: "", weight: "", ap_hi: "", ap_lo: "",
    glucose_mg: "", cholesterol_mg: "",
    is_fasting: false, smoke: "0", alco: "0", active: "1"
  });

  // 1. AADHAAR VALIDATION & SMART AUTO-FILL
  const handleAadhaarInput = async (e) => {
    const val = e.target.value.replace(/\s/g, "");
    if (val.length <= 12 && /^\d*$/.test(val)) {
      setFormData({ ...formData, aadhaar: val });

      if (val.length === 12) {
        const isValid = validateAadhaar(val);
        setIsAadhaarValid(isValid);

        if (isValid) {
          setShowFullForm(true);
          // Auto-Search if online
          if (navigator.onLine) {
            try {
              const res = await fetch(`http://localhost:5000/api/patients/search/${val}`);
              const data = await res.json();
              if (res.ok && data.patient) {
                setFormData(prev => ({ ...prev, ...data.patient }));
                alert("Existing Patient Found! Data auto-filled.");
              }
            } catch (err) { console.log("Search failed or offline"); }
          }
        } else {
          setShowFullForm(false);
        }
      } else {
        setIsAadhaarValid(null);
        setShowFullForm(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  // 2. AI RISK ANALYSIS & NAVIGATION LOGIC
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAadhaarValid) return alert("Please enter a valid Aadhaar number first.");
    setLoading(true);

    try {
      // Data Processing for AI
      const ageInDays = parseFloat(formData.age) * 365.25;
      let glucCat = 1;
      const sugar = parseFloat(formData.glucose_mg);
      if (formData.is_fasting) {
        if (sugar > 125) glucCat = 3; else if (sugar > 100) glucCat = 2;
      } else {
        if (sugar >= 200) glucCat = 3; else if (sugar > 140) glucCat = 2;
      }
      
      let cholCat = 1;
      const chol = parseFloat(formData.cholesterol_mg);
      if (chol >= 240) cholCat = 3; else if (chol >= 200) cholCat = 2;

      const inputData = [
        ageInDays, parseInt(formData.gender), parseFloat(formData.height),
        parseFloat(formData.weight), parseFloat(formData.ap_hi), parseFloat(formData.ap_lo),
        cholCat, glucCat, parseInt(formData.smoke), parseInt(formData.alco), parseInt(formData.active)
      ];

      // Run AI Model
      const scores = predictHeartRisk(inputData);
      const riskVal = Array.isArray(scores) ? scores[1] : scores;
      const riskResult = riskVal > 0.5 ? "High" : "Low";

      // ✅ SAHI FORMAT: Results object zaroori hai analysis page ke liye
      const patientRecord = {
        ...formData,
        results: {
          heartRisk: riskVal,
          obesityRisk: (parseFloat(formData.weight) / ((parseFloat(formData.height)/100)**2) >= 30) ? 0.85 : 0.20,
          diabetesRisk: (glucCat >= 2) ? 0.90 : 0.15
        },
        riskResult,
        riskProbability: (riskVal * 100).toFixed(1),
        timestamp: new Date().toISOString(),
        synced: false
      };

      // Save locally for offline support
      const existing = JSON.parse(localStorage.getItem("offline_patients") || "[]");
      localStorage.setItem("offline_patients", JSON.stringify([...existing, patientRecord]));
      
      // Navigate with full state object
      navigate(`/analysis/${formData.aadhaar}`, { state: patientRecord });
    } catch (err) {
      alert("Error in AI Analysis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      <Navbar />
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
              Patient <span className="text-emerald-600">Entry</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm sm:text-base">{t('welcome')}</p>
          </div>
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 hidden sm:block">
             <UserPlus className="text-emerald-600" size={32} />
          </div>
        </div>

        {/* Aadhaar Input Box */}
        <div className="bg-white p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border border-slate-200 mb-6 transition-all">
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-[0.2em]">Step 1: Identity Verification</label>
          <div className="relative">
            <input
              type="text" value={formData.aadhaar} onChange={handleAadhaarInput} placeholder="12 Digit Aadhaar"
              className={`w-full p-4 sm:p-5 rounded-xl sm:rounded-2xl text-xl sm:text-2xl font-black tracking-widest outline-none transition-all border-4 ${
                isAadhaarValid === true ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 
                isAadhaarValid === false ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-100 bg-slate-50 text-slate-400'
              }`}
            />
            <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2">
              {isAadhaarValid === true && <CheckCircle2 className="text-emerald-500 w-6 h-6 sm:w-8 sm:h-8" />}
              {isAadhaarValid === false && <AlertCircle className="text-red-500 w-6 h-6 sm:w-8 sm:h-8" />}
            </div>
          </div>
        </div>

        {/* Main Form Details (Conditional) */}
        {showFullForm && (
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-white p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border border-slate-200 space-y-5">
                <h3 className="font-black text-emerald-800 uppercase text-[10px] tracking-widest bg-emerald-50 w-fit px-3 py-1 rounded-lg">Personal Details</h3>
                <CustomInput label={t('name')} name="name" value={formData.name} placeholder="Full Name" onChange={handleChange} />
                <div className="grid grid-cols-2 gap-4">
                  <CustomInput label={t('age')} name="age" value={formData.age} type="number" onChange={handleChange} />
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">{t('gender')}</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-3.5 border-2 border-slate-100 rounded-xl bg-slate-50 font-bold outline-none text-sm">
                      <option value="1">{t('female')}</option>
                      <option value="2">{t('male')}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <CustomInput label={t('height') + " (cm)"} name="height" value={formData.height} type="number" onChange={handleChange} />
                  <CustomInput label={t('weight') + " (kg)"} name="weight" value={formData.weight} type="number" onChange={handleChange} />
                </div>
              </div>

              <div className="bg-white p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border border-slate-200 space-y-5">
                <h3 className="font-black text-emerald-800 uppercase text-[10px] tracking-widest bg-emerald-50 w-fit px-3 py-1 rounded-lg">Vitals & Clinical</h3>
                <div className="grid grid-cols-2 gap-4">
                  <CustomInput label={t('bp_high')} name="ap_hi" value={formData.ap_hi} type="number" onChange={handleChange} />
                  <CustomInput label={t('bp_low')} name="ap_lo" value={formData.ap_lo} type="number" onChange={handleChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <CustomInput label={t('sugar')} name="glucose_mg" value={formData.glucose_mg} type="number" onChange={handleChange} />
                  <CustomInput label={t('cholesterol')} name="cholesterol_mg" value={formData.cholesterol_mg} type="number" onChange={handleChange} />
                </div>
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border-2 border-emerald-100">
                  <input type="checkbox" name="is_fasting" checked={formData.is_fasting} id="fasting" onChange={handleChange} className="h-5 w-5 accent-emerald-600 cursor-pointer" />
                  <label htmlFor="fasting" className="text-xs font-bold text-emerald-900 leading-tight">Patient is Fasting</label>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border border-slate-200">
              <h3 className="font-black text-emerald-800 uppercase text-[10px] tracking-widest bg-emerald-50 w-fit px-3 py-1 rounded-lg mb-6">Lifestyle Factors</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <LifestyleSelect label={t('smoke')} name="smoke" value={formData.smoke} icon={<Cigarette size={16}/>} onChange={handleChange} />
                <LifestyleSelect label={t('alco')} name="alco" value={formData.alco} icon={<GlassWater size={16}/>} onChange={handleChange} />
                <LifestyleSelect label="Physical Activity" name="active" value={formData.active} icon={<Activity size={16}/>} onChange={handleChange} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white p-5 sm:p-6 rounded-2xl sm:rounded-[1.8rem] font-black text-lg sm:text-xl shadow-2xl hover:bg-emerald-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
              {loading ? "Processing..." : <><Save size={20}/> Run Risk Analysis</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function CustomInput({ label, name, value, type = "text", placeholder, onChange }) {
  return (
    <div className="w-full">
      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-wider">{label}</label>
      <input name={name} type={type} value={value} placeholder={placeholder} onChange={onChange} required className="w-full p-3.5 border-2 border-slate-100 rounded-xl bg-slate-50 focus:border-emerald-500 font-bold text-slate-800 text-sm" />
    </div>
  );
}

function LifestyleSelect({ label, name, value, icon, onChange }) {
  return (
    <div className="w-full">
      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">{icon} {label}</label>
      <select name={name} value={value} onChange={onChange} className="w-full p-3.5 border-2 border-slate-100 rounded-xl bg-slate-50 font-bold outline-none text-sm cursor-pointer">
        <option value="0">No / Inactive</option>
        <option value="1">Yes / Active</option>
      </select>
    </div>
  );
}