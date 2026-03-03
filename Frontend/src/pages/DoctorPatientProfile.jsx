import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';

export default function DoctorPatientProfile() {
  const { aadhaar } = useParams();
  const [patient, setPatient] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatientData();
  }, [aadhaar]);

  const fetchPatientData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/patients/all`);
      const allPatients = await response.json();
      const currentPatient = allPatients.find(p => p.aadhaar === aadhaar);
      if (currentPatient) {
        setPatient(currentPatient);
        setMedicines(currentPatient.prescriptions || []);
      }
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const addMed = () => setMedicines([...medicines, { name: '', dosage: '', timing: '' }]);
  
  const updateMed = (index, field, val) => {
    const updated = [...medicines];
    updated[index][field] = val;
    setMedicines(updated);
  };

  const removeMed = (index) => setMedicines(medicines.filter((_, i) => i !== index));

  const saveData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/doctor/update-medicine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaar, medicines }),
      });
      if (response.ok) alert("Synchronized with Database");
    } catch (error) {
      alert("Sync Failed");
    }
  };

  if (loading || !patient) return <div className="p-10">Loading Profile...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => window.history.back()} className="flex items-center gap-2 text-slate-600 font-bold">
            <ArrowLeft size={20} /> Back to List
          </button>
          <div className="bg-red-50 px-4 py-2 rounded-full border border-red-100">
            <span className="text-red-600 font-black text-xs uppercase tracking-widest">Risk Score: {patient.riskProbability}%</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900">{patient.name}</h1>
            <p className="text-slate-500 font-bold uppercase text-xs mt-1 tracking-widest">Aadhaar: {patient.aadhaar} | Age: {patient.age}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-2xl border">
              <p className="text-[10px] font-black text-slate-400 uppercase">Height</p>
              <p className="font-bold text-slate-800">{patient.height} cm</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border">
              <p className="text-[10px] font-black text-slate-400 uppercase">Weight</p>
              <p className="font-bold text-slate-800">{patient.weight} kg</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricChart title="Glucose Trend" data={patient.history} k="glucose" c="#ef4444" />
              <MetricChart title="Blood Pressure" data={patient.history} k="ap_hi" c="#f59e0b" />
              <MetricChart title="Cholesterol" data={patient.history} k="cholesterol" c="#3b82f6" />
              <MetricChart title="BMI Index" data={patient.history} k="bmi" c="#10b981" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border shadow-sm h-fit">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase text-sm tracking-tight">Prescription</h3>
              <button onClick={addMed} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Plus size={20}/></button>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {medicines.map((m, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 relative group">
                  <input placeholder="Medicine Name" value={m.name} onChange={e => updateMed(i, 'name', e.target.value)} className="w-full bg-transparent font-bold text-slate-800 outline-none border-b border-slate-200 focus:border-emerald-500" />
                  <input placeholder="Dosage (e.g. 500mg)" value={m.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)} className="w-full bg-transparent text-sm text-slate-500 outline-none" />
                  <button onClick={() => removeMed(i)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
            <button onClick={saveData} className="w-full mt-8 py-4 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all uppercase tracking-widest text-xs">
              <Save size={18} /> Update Prescription
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricChart({ title, data, k, c }) {
  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm">
      <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.05)' }} />
            <Line type="monotone" dataKey={k} stroke={c} strokeWidth={4} dot={{ r: 4, fill: c }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}