import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useTranslation } from "react-i18next";
import predictHeartRisk from "../edge_model"; 

export default function AddPatient() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "", aadhaar: "", age: "", gender: "1",
    height: "", weight: "", ap_hi: "", ap_lo: "",
    glucose_mg: "", cholesterol_mg: "",
    is_fasting: false, smoke: "0", alco: "0", active: "1"
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    try {
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
        ageInDays,                       // input[0]
        parseInt(formData.gender),       // input[1]
        parseFloat(formData.height),      // input[2]
        parseFloat(formData.weight),      // input[3]
        parseFloat(formData.ap_hi),       // input[4]
        parseFloat(formData.ap_lo),       // input[5]
        cholCat,                          // input[6]
        glucCat,                          // input[7]
        parseInt(formData.smoke),         // input[8]
        parseInt(formData.alco),          // input[9]
        parseInt(formData.active)         // input[10]
      ];

      // 5. RUN JS DECISION TREE (OFFLINE AI)
      const scores = predictHeartRisk(inputData);
      const riskVal = Array.isArray(scores) ? scores[1] : scores;
      const riskResult = riskVal > 0.5 ? "High" : "Low";

      const patientRecord = {
        ...formData,
        riskResult,
        riskProbability: (riskVal * 100).toFixed(1),
        timestamp: new Date().toISOString(),
        synced: false
      };
      const existing = JSON.parse(localStorage.getItem("offline_patients") || "[]");
      localStorage.setItem("offline_patients", JSON.stringify([...existing, patientRecord]));
      navigate(`/analysis/${formData.aadhaar}`, { state: patientRecord });
    } catch (err) {
      console.error("AI Error:", err);
      alert("Error in AI Analysis. Please check input values.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{t('reg_title')}</h1>
          <p className="text-slate-500">{t('welcome')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-bold text-emerald-700 uppercase text-xs tracking-wider border-b pb-2">Basic Information</h3>
              <CustomInput label={t('name')} name="name" placeholder="E.g. Ramesh Bhai" onChange={handleChange} />
              <CustomInput label={t('aadhaar')} name="aadhaar" placeholder="12 Digit Number" onChange={handleChange} />
              <div className="grid grid-cols-2 gap-4">
                <CustomInput label={t('age')} name="age" type="number" onChange={handleChange} />
                <div>
                  <label className="block text-sm font-medium mb-1">{t('gender')}</label>
                  <select name="gender" onChange={handleChange} className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="1">{t('female')}</option>
                    <option value="2">{t('male')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Vitals & Lab */}
            <div className="space-y-4">
              <h3 className="font-bold text-emerald-700 uppercase text-xs tracking-wider border-b pb-2">Health Parameters</h3>
              <div className="grid grid-cols-2 gap-4">
                <CustomInput label={t('bp_high')} name="ap_hi" type="number" onChange={handleChange} />
                <CustomInput label={t('bp_low')} name="ap_lo" type="number" onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CustomInput label={t('sugar')} name="glucose_mg" type="number" onChange={handleChange} />
                <CustomInput label={t('cholesterol')} name="cholesterol_mg" type="number" onChange={handleChange} />
              </div>
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <input type="checkbox" name="is_fasting" id="fasting" onChange={handleChange} className="h-5 w-5 accent-emerald-600" />
                <label htmlFor="fasting" className="text-sm font-semibold text-emerald-800">{t('fasting_check')}</label>
              </div>
            </div>

            {/* Lifestyle */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
               <div>
                  <label className="block text-sm font-medium mb-1">{t('smoke')}</label>
                  <select name="smoke" onChange={handleChange} className="w-full p-3 border rounded-xl bg-slate-50">
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">{t('alco')}</label>
                  <select name="alco" onChange={handleChange} className="w-full p-3 border rounded-xl bg-slate-50">
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
               </div>
               <div className="hidden"> {/* Defaulting active to 1 as per project constraints */}
                  <input name="active" value="1" readOnly />
               </div>
               <div className="grid grid-cols-2 gap-2 md:col-span-1">
                  <CustomInput label={t('height')} name="height" type="number" onChange={handleChange} />
                  <CustomInput label={t('weight')} name="weight" type="number" onChange={handleChange} />
               </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-10 bg-emerald-600 text-white p-5 rounded-2xl font-black text-xl shadow-lg hover:bg-emerald-700 hover:shadow-emerald-200 transition-all active:scale-95 disabled:bg-slate-300"
          >
            {loading ? t('loading') : t('submit_btn')}
          </button>
        </form>
      </div>
    </div>
  );
}

// 🛠️ Reusable Input Component for cleaner code
function CustomInput({ label, name, type = "text", placeholder, onChange }) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        onChange={onChange}
        required
        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
      />
    </div>
  );
}