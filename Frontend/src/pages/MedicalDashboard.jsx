import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { Pill, Search, CheckCircle, User } from 'lucide-react';

export default function MedicalDashboard() {
  const [aadhaar, setAadhaar] = useState("");
  const [data, setData] = useState(null);

  const fetchPrescription = async () => {
    // Demo logic: Fetching from your backend
    try {
      const res = await fetch(`http://localhost:5000/api/patient/${aadhaar}`);
      const result = await res.json();
      if (res.ok) setData(result);
      else alert("No prescription found for this Aadhaar");
    } catch (err) { alert("Offline Mode: Data not found"); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-black text-slate-800 mb-8 tracking-tight">Medical Pharmacy Portal</h1>
        
        <div className="bg-white p-4 rounded-3xl shadow-sm border flex gap-4 mb-10">
          <input 
            placeholder="Search Patient Aadhaar..." 
            className="flex-1 bg-transparent p-2 outline-none font-bold text-lg"
            onChange={(e) => setAadhaar(e.target.value)}
          />
          <button onClick={fetchPrescription} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2">
            <Search size={18} /> Get Prescription
          </button>
        </div>

        {data && (
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border-t-8 border-emerald-500 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{data.name}</h2>
                <p className="text-slate-400 font-bold text-sm">Aadhaar: {data.aadhaar}</p>
              </div>
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Pill size={32} /></div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Prescribed Medicines</h3>
              {data.prescriptions?.map((m, i) => (
                <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-300 transition">
                  <div>
                    <p className="font-black text-slate-800 text-lg">{m.name}</p>
                    <p className="text-sm text-slate-500 font-medium">{m.dosage}</p>
                  </div>
                  <CheckCircle className="text-slate-200 group-hover:text-emerald-500 cursor-pointer transition" />
                </div>
              ))}
            </div>

            <button className="w-full mt-10 bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition">
              Mark Medicines as Issued
            </button>
          </div>
        )}
      </div>
    </div>
  );
}