import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useTranslation } from "react-i18next";
import { useModel } from "../hooks/useModel";
import { validateAadhaar } from "../utils/aadhaarValidation";
import { CheckCircle2, AlertCircle, Save, Cigarette, GlassWater, Activity } from "lucide-react";

export default function AddPatient() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isAadhaarValid, setIsAadhaarValid] = useState(null);
  const [showFullForm, setShowFullForm] = useState(false);

  const { initialize, predict, isReady, isLoading: modelLoading, hasError: modelError } = useModel();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const [formData, setFormData] = useState({
    name: "", aadhaar: "", dob: "", gender: "1",
    height: "", weight: "", ap_hi: "", ap_lo: "",
    glucose_mg: "", cholesterol_mg: "",
    is_fasting: false, smoke: "0", alco: "0", active: "1"
  });

  const handleAadhaarInput = async (e) => {
    const val = e.target.value.replace(/\s/g, "");
    if (val.length <= 12 && /^\d*$/.test(val)) {
      setFormData({ ...formData, aadhaar: val });
      if (val.length === 12) {
        const isValid = validateAadhaar(val);
        setIsAadhaarValid(isValid);
        if (isValid) {
          setShowFullForm(true);
          if (navigator.onLine) {
            try {
              const res = await fetch(`http://localhost:5000/api/patients/search/${val}`);
              const data = await res.json();
              if (res.ok && data.patient) {
                setFormData(prev => ({
                  ...prev,
                  name: data.patient.name || "",
                  dob: data.patient.dob || "",
                  gender: data.patient.gender || "1"
                }));
                alert("Existing Patient Found! Data auto-filled.");
              }
            } catch (err) { console.log("Search failed"); }
          }
        }
      } else { setIsAadhaarValid(null); setShowFullForm(false); }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isReady) return alert("Please wait, AI Model is still loading...");
    setLoading(true);

    try {
      // Glucose categorization (clinical thresholds)
      let glucCat = 1;
      const sugar = parseFloat(formData.glucose_mg);
      if (!isNaN(sugar)) {
        if (formData.is_fasting) {
          if (sugar > 125) glucCat = 3;
          else if (sugar >= 100) glucCat = 2;
        } else {
          if (sugar >= 200) glucCat = 3;
          else if (sugar >= 140) glucCat = 2;
        }
      }

      // Cholesterol categorization
      let cholCat = 1;
      if (formData.cholesterol_mg) {
        const chol = parseFloat(formData.cholesterol_mg);
        if (!isNaN(chol)) cholCat = chol >= 240 ? 3 : chol >= 200 ? 2 : 1;
      }

      // Run prediction — hook handles all 24 feature engineering internally
      const analysisResult = await predict({
        ...formData,
        gluc: glucCat,
        cholesterol: cholCat,
        gender: parseInt(formData.gender),
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        ap_hi: parseFloat(formData.ap_hi),
        ap_lo: parseFloat(formData.ap_lo),
        smoke: parseInt(formData.smoke),
        alco: parseInt(formData.alco),
        active: parseInt(formData.active),
      });

      const patientRecord = {
        ...formData,
        results: {
          heartRisk:    analysisResult.heart_attack.probability,
          obesityRisk:  analysisResult.obesity.probability,
          diabetesRisk: analysisResult.diabetes.probability,
        },
        calculated: analysisResult._calculated,
        newEntry: {
          date:    new Date().toISOString().split('T')[0],
          vitals:  { ...formData, glucCat, cholCat },
          results: analysisResult,
        },
        synced: false,
      };

      localStorage.setItem("latest_analysis", JSON.stringify(patientRecord));
      const local = JSON.parse(localStorage.getItem("offline_patients") || "[]");
      localStorage.setItem("offline_patients", JSON.stringify([...local, patientRecord]));

      navigate(`/analysis/${formData.aadhaar}`, { state: patientRecord });
    } catch (err) {
      console.error("Prediction Error:", err);
      alert("Analysis failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      <Navbar />
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-8">

        {/* Model status banner */}
        {modelLoading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-700 text-xs font-bold text-center animate-pulse">
            🤖 AI Model loading...
          </div>
        )}
        {modelError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold text-center">
            ❌ Model load failed — check /public/models/ folder
          </div>
        )}

        {/* Step 1: Aadhaar Entry */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border mb-6">
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest italic tracking-tighter">{t('E-aadhaar')}</label>
          <input
            type="text"
            value={formData.aadhaar}
            onChange={handleAadhaarInput}
            placeholder={t('aadhaar')}
            className={`w-full p-4 rounded-2xl text-xl font-black border-4 transition-all ${
              isAadhaarValid === true  ? 'border-emerald-500 bg-emerald-50 text-emerald-900' :
              isAadhaarValid === false ? 'border-red-500 bg-red-50 text-red-900' :
              'border-slate-100 bg-slate-50 text-slate-400'
            }`}
          />
        </div>

        {showFullForm && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

              {/* Personal Details */}
              <div className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6 flex flex-col justify-center">
                <h3 className="font-black text-emerald-800 uppercase text-[10px] tracking-widest bg-emerald-50 w-fit px-3 py-1 rounded-lg">Personal Details</h3>
                <CustomInput label={t('name')} name="name" value={formData.name} onChange={handleChange} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{t('dob')}</label>
                    <input type="date" name="dob" value={formData.dob} onChange={handleChange} required
                      className="w-full p-4 border-2 rounded-xl bg-slate-50 font-bold outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{t('gender')}</label>
                    <select name="gender" value={formData.gender} onChange={handleChange}
                      className="w-full p-4 border-2 rounded-xl bg-slate-50 font-bold outline-none focus:border-emerald-500">
                      <option value="1">{t('female')}</option>
                      <option value="2">{t('male')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Reports */}
              <div className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6 flex flex-col justify-center">
                <h3 className="font-black text-emerald-800 uppercase text-[10px] tracking-widest bg-emerald-50 w-fit px-3 py-1 rounded-lg">Reports</h3>
                <div className="grid grid-cols-2 gap-4">
                  <CustomInput label={t('bp_high')} name="ap_hi" value={formData.ap_hi} type="number" onChange={handleChange} />
                  <CustomInput label={t('bp_low')} name="ap_lo" value={formData.ap_lo} type="number" onChange={handleChange} />
                  <CustomInput label={t('weight')} name="weight" value={formData.weight} type="number" onChange={handleChange} />
                  <CustomInput label={t('height')} name="height" value={formData.height} type="number" onChange={handleChange} />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <CustomInput label={t('sugar')} name="glucose_mg" value={formData.glucose_mg} type="number" onChange={handleChange} />
                  <CustomInput label={t('cholesterol') + " (Optional)"} name="cholesterol_mg" value={formData.cholesterol_mg} type="number" onChange={handleChange} required={false} />
                </div>
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <input type="checkbox" name="is_fasting" checked={formData.is_fasting} onChange={handleChange}
                    className="h-5 w-5 accent-emerald-600 cursor-pointer" />
                  <label className="text-sm font-bold text-emerald-900 italic tracking-tighter">{t('fasting_check')}</label>
                </div>
              </div>
            </div>

            {/* Health Habits */}
            <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
              <h3 className="font-black text-emerald-800 uppercase text-[10px] tracking-widest bg-emerald-50 w-fit px-3 py-1 rounded-lg mb-6 tracking-tighter">Health Habits</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <LifestyleSelect label={t('smoke')} name="smoke" value={formData.smoke} icon={<Cigarette size={16} />} onChange={handleChange} />
                <LifestyleSelect label={t('alco')} name="alco" value={formData.alco} icon={<GlassWater size={16} />} onChange={handleChange} />
                <LifestyleSelect label={t('active')} name="active" value={formData.active} icon={<Activity size={16} />} onChange={handleChange} />
              </div>
            </div>

            <button type="submit" disabled={loading || !isReady}
              className="w-full bg-slate-900 text-white p-6 rounded-[1.8rem] font-black text-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 italic uppercase shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? t('loading') : <><Save size={20} /> {t('submit_btn')}</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function CustomInput({ label, name, value, type = "text", onChange, required = true }) {
  return (
    <div className="space-y-1 w-full">
      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-tight">{label}</label>
      <input name={name} type={type} value={value} onChange={onChange} required={required}
        className="w-full p-4 border-2 rounded-xl font-bold outline-none bg-slate-50 focus:border-emerald-500 transition-all text-slate-800" />
    </div>
  );
}

function LifestyleSelect({ label, name, value, icon, onChange }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase ml-1 tracking-tighter">{icon} {label}</label>
      <select name={name} value={value} onChange={onChange}
        className="w-full p-4 border-2 rounded-xl bg-slate-50 font-bold cursor-pointer focus:border-emerald-500 outline-none text-slate-800">
        <option value="0">No / Inactive</option>
        <option value="1">Yes / Active</option>
      </select>
    </div>
  );
}