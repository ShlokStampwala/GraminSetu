import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Plus, Trash2, ArrowLeft, Save, Search, 
  Activity, Heart, ShieldAlert, History
} from 'lucide-react';

const getRiskBoxClass = (risk) => {
  if (risk <= 33) return "bg-gradient-to-br from-emerald-400 to-emerald-700";
  if (risk <= 65) return "bg-gradient-to-br from-yellow-400 to-orange-500";
  return "bg-gradient-to-br from-red-500 to-red-800";
};

export default function DoctorDashboard() {
  const { aadhaar: urlAadhaar } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlAadhaar) fetchPatient(urlAadhaar);
  }, [urlAadhaar]);

  const fetchPatient = async (id) => {
    setLoading(true);
    try {
      // Updated API route to match your app.py
      const res = await fetch(`http://localhost:5000/api/patient/${id}`);
      const data = await res.json();
      if (res.ok) {
        setPatient(data);
        setMedicines(data.prescriptions || []);
      } else {
        alert("Patient Not Found");
        setPatient(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.length === 12) {
      navigate(`/doctor/dashboard/${searchQuery}`);
    } else {
      alert("Enter valid 12-digit Aadhaar");
    }
  };

  const savePrescription = async () => {
    const res = await fetch('http://localhost:5000/api/doctor/update-medicine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aadhaar: patient.aadhaar, medicines }),
    });
    if (res.ok) alert("Prescription Updated & Synced with Medical Store");
  };

  // 🚀 Logic to extract data from nested 'history' structure
  const latestEntry = patient?.history?.[patient.history.length - 1] || {};
  const vitals = latestEntry.vitals || {};
  const results = latestEntry.results || {};
  
  // Calculate aggregate risk from AI results
  const risk = Math.round(Math.max(
    results.heart_attack?.probability || 0,
    results.diabetes?.probability || 0,
    results.obesity?.probability || 0
  ) * 100);

  const visitCount = patient?.history?.length || 0;

  // Format data for Recharts
  const chartData = (patient?.history || []).map(entry => ({
    date: entry.date,
    glucose: parseFloat(entry.vitals?.glucose_mg),
    ap_hi: parseFloat(entry.vitals?.ap_hi),
    cholesterol: parseFloat(entry.vitals?.cholesterol_mg),
    bmi: entry.vitals?.height > 0 ? (entry.vitals?.weight / Math.pow(entry.vitals?.height / 100, 2)).toFixed(1) : 0
  }));

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-all">
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">Gramin<span className="text-emerald-600">Setu</span></h1>
          </div>

          <form onSubmit={handleSearch} className="relative w-full md:w-96">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Aadhaar..."
              className="w-full p-4 pl-12 rounded-2xl border-2 border-transparent font-bold outline-none focus:border-emerald-500 bg-white shadow-sm transition-all"
            />
            <Search className="absolute left-4 top-4 text-slate-400" />
          </form>
        </div>

        {!patient ? (
          <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
             <Search size={48} className="mx-auto text-slate-200 mb-4" />
             <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
               {loading ? "Fetching Patient Data..." : "Enter 12-Digit Aadhaar to Start"}
             </p>
          </div>
        ) : (
          <>
            {/* Patient Identity & Risk Box */}
            <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-xl border-t-[12px] border-emerald-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-[10rem] -z-10 opacity-50" />
              
              <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                     <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">Live Patient</span>
                     <span className="text-slate-300 font-bold">|</span>
                     <span className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase"><History size={12}/> {visitCount} Visits Total</span>
                  </div>
                  <h1 className="text-5xl font-black text-slate-900 tracking-tight">{patient.name}</h1>
                  <p className="text-xl font-bold text-slate-400 italic">ID: {patient.aadhaar}</p>
                </div>

                <div className={`text-white p-8 rounded-[2.5rem] text-center min-w-[200px] shadow-2xl transform hover:scale-105 transition-transform ${getRiskBoxClass(risk)}`}>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black mb-2 opacity-80">AI Health Risk</p>
                  <p className="text-6xl font-black leading-none">{risk}%</p>
                </div>
              </div>

              {/* Vitals Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
                <BigVitalBox label="BMI" val={chartData[chartData.length-1]?.bmi} limit={25} unit="kg/m²" />
                <BigVitalBox label="Glucose" val={vitals.glucose_mg} limit={140} unit="mg/dL" />
                <BigVitalBox label="Cholesterol" val={vitals.cholesterol_mg} limit={200} unit="mg/dL" />
                <BigVitalBox label="Sys BP" val={vitals.ap_hi} limit={130} unit="mmHg" />
              </div>
            </div>

            {/* Charts & Prescription Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
              <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
                <ChartCard title="Glucose Trend" data={chartData} k="glucose" limit={140} color="#10b981" />
                <ChartCard title="Blood Pressure" data={chartData} k="ap_hi" limit={130} color="#3b82f6" />
                <ChartCard title="Cholesterol" data={chartData} k="cholesterol" limit={200} color="#f59e0b" />
                <ChartCard title="BMI History" data={chartData} k="bmi" limit={25} color="#8b5cf6" />
              </div>

              <div className="bg-white p-8 rounded-[3rem] shadow-xl h-fit border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-black uppercase text-xs tracking-[0.2em] text-slate-400">Prescription</h3>
                  <button onClick={() => setMedicines([...medicines, { name: '', dosage: '' }])} className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-emerald-600 transition-all">
                    <Plus size={20} />
                  </button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {medicines.map((m, i) => (
                    <div key={i} className="group flex gap-3 items-center bg-slate-50 p-5 rounded-[2rem] border-2 border-transparent hover:border-emerald-100 transition-all">
                      <div className="flex-1 space-y-1">
                        <input value={m.name} onChange={e => { const u=[...medicines]; u[i].name=e.target.value; setMedicines(u); }} placeholder="Medicine Name" className="w-full bg-transparent font-black text-slate-800 outline-none placeholder:text-slate-300" />
                        <input value={m.dosage} onChange={e => { const u=[...medicines]; u[i].dosage=e.target.value; setMedicines(u); }} placeholder="Dosage (e.g. 1-0-1)" className="w-full text-[10px] font-bold text-emerald-600 bg-transparent outline-none uppercase tracking-widest" />
                      </div>
                      <button onClick={() => setMedicines(medicines.filter((_, idx) => idx !== i))} className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {medicines.length === 0 && <p className="text-center py-10 text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">No active medications</p>}
                </div>

                <button onClick={savePrescription} className="w-full mt-8 py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-slate-900 shadow-lg shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-3">
                  <Save size={20} /> Save Changes
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Sub-components for cleaner code
function BigVitalBox({ label, val, limit, unit }) {
  const isHigh = parseFloat(val) > limit;
  return (
    <div className={`p-8 rounded-[2rem] border-2 transition-all ${isHigh ? 'bg-red-50 border-red-100 text-red-700' : 'bg-slate-50 border-slate-50 text-slate-800'}`}>
      <p className="text-[9px] uppercase tracking-[0.2em] font-black opacity-60 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
         <span className="text-3xl font-black">{val || '--'}</span>
         <span className="text-[10px] font-bold opacity-60 uppercase">{unit}</span>
      </div>
    </div>
  );
}

function ChartCard({ title, data, k, limit, color }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-50">
      <p className="text-[10px] uppercase tracking-[0.2em] font-black mb-6 text-slate-400">{title}</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" hide />
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: '900' }} />
            <ReferenceLine y={limit} stroke="#fda4af" strokeDasharray="8 8" />
            <Line type="monotone" dataKey={k} stroke={color} strokeWidth={5} dot={{ r: 6, fill: color, strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 10 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}