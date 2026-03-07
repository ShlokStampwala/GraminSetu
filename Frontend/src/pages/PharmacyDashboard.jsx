import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Pill, User, MapPin, 
  Calendar, CheckCircle2, ArrowLeft, Printer 
} from 'lucide-react';

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const [aadhaar, setAadhaar] = useState("");
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPrescription = async (e) => {
    e.preventDefault();
    if (aadhaar.length !== 12) return alert("Enter valid 12-digit Aadhaar");
    
    setLoading(true);
    try {
      // Wahi route use kar rahe hain jo DoctorDashboard mein tha
      const res = await fetch(`http://localhost:5000/api/patient/${aadhaar}`);
      const data = await res.json();
      
      if (res.ok) {
        setPatient(data);
      } else {
        alert("No prescription found for this Aadhaar");
        setPatient(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-100 transition-all">
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic text-slate-800">
              Gramin<span className="text-blue-600">Setu</span> Pharmacy
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Medical Partner</p>
            <p className="text-xs font-bold text-slate-400 uppercase">Verified Store</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border-b-8 border-blue-500">
          <form onSubmit={fetchPrescription} className="relative">
            <input
              type="number"
              value={aadhaar}
              onChange={(e) => setAadhaar(e.target.value)}
              placeholder="Enter Patient's 12-Digit Aadhaar Number..."
              className="w-full p-6 pl-14 rounded-[2rem] bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none font-black text-xl transition-all placeholder:text-slate-300"
            />
            <Search className="absolute left-6 top-7 text-slate-400" size={24} />
            <button 
              type="submit"
              className="absolute right-3 top-3 bottom-3 px-8 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95"
            >
              {loading ? "..." : "Fetch"}
            </button>
          </form>
        </div>

        {!patient ? (
          <div className="text-center py-20 opacity-20">
            <Pill size={80} className="mx-auto mb-4" />
            <p className="font-black uppercase tracking-[0.3em]">Waiting for Aadhaar Scan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Patient Details Card */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-100 space-y-6">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600">
                <User size={40} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900">{patient.name}</h2>
                <p className="font-bold text-slate-400 italic">Age: {patient.age} | {patient.gender === '2' ? 'Male' : 'Female'}</p>
              </div>
              <div className="pt-4 border-t border-slate-50 space-y-3">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <MapPin size={16} /> {patient.village}, {patient.taluka}
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <Calendar size={16} /> Last Synced: {new Date(patient.last_synced).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Prescription List */}
            <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Current Medications</h3>
                <button onClick={() => window.print()} className="p-3 bg-slate-100 rounded-xl text-slate-600 hover:bg-blue-600 hover:text-white transition-all">
                  <Printer size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {patient.prescriptions && patient.prescriptions.length > 0 ? (
                  patient.prescriptions.map((med, i) => (
                    <div key={i} className="flex items-center justify-between p-6 bg-blue-50 rounded-[2rem] border-2 border-transparent hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm">
                          <Pill size={24} />
                        </div>
                        <div>
                          <p className="text-xl font-black text-slate-800">{med.name}</p>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{med.dosage}</p>
                        </div>
                      </div>
                      <CheckCircle2 className="text-emerald-500" size={28} />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-slate-300 font-black uppercase text-xs italic tracking-widest">No Active Prescription Found</p>
                  </div>
                )}
              </div>

              {patient.prescriptions?.length > 0 && (
                <button className="w-full mt-8 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl active:scale-95">
                  Confirm Medicine Dispensed
                </button>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}