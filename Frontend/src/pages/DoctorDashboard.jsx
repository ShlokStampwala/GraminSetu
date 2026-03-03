import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Plus, Trash2, ArrowLeft, Save, Search,
  UserCheck, Activity, Heart, Wind, Droplets
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

  const updateMed = (i, field, val) => {
    const updated = [...medicines];
    updated[i][field] = val;
    setMedicines(updated);
  };

  const savePrescription = async () => {
    const res = await fetch('http://localhost:5000/api/doctor/update-medicine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aadhaar: patient.aadhaar, medicines }),
    });
    if (res.ok) alert("Prescription Updated");
  };

  const risk = patient?.latest_vitals?.riskProbability || 0;
  // Visit count calculation from history array
  const visitCount = patient?.history?.length || 0;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-white rounded-2xl shadow-sm"
            >
              <ArrowLeft size={22} />
            </button>
            <img src="/logo.jpeg" className="h-12" />
            <h1 className="text-2xl font-bold">GraminSetu</h1>
          </div>

          <form onSubmit={handleSearch} className="relative w-full md:w-96">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Aadhaar..."
              className="w-full p-4 pl-12 rounded-2xl border font-semibold text-base outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="absolute left-4 top-4 text-slate-400" />
          </form>
        </div>

        {!patient ? (
          <div className="bg-white p-20 rounded-3xl text-center">
            <p className="text-slate-400 font-semibold">
              {loading ? "Loading..." : "Search Patient Aadhaar"}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white p-10 rounded-3xl shadow border-t-8 border-emerald-500">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold">{patient.name}</h1>
                  <div className="flex flex-wrap items-center gap-4">
                    <p className="text-lg font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                      Aadhaar: <span className="text-slate-900 font-bold">{patient.aadhaar}</span>
                    </p>
                    {/* VISITS COUNT UI */}
                    <p className="text-lg font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                      Total Visits: <span className="font-bold">{visitCount}</span>
                    </p>
                  </div>
                </div>

                <div
                  className={`text-white p-6 rounded-3xl text-center min-w-[160px] ${getRiskBoxClass(risk)}`}
                >
                  <p className="text-xs uppercase tracking-widest font-semibold opacity-90">
                    Risk Level
                  </p>
                  <p className="text-5xl font-bold">
                    {risk}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
                <BigVitalBox label="BMI" val={patient.latest_vitals?.bmi} limit={25} unit="kg/m²" />
                <BigVitalBox label="Glucose" val={patient.latest_vitals?.glucose} limit={140} unit="mg/dL" />
                <BigVitalBox label="Cholesterol" val={patient.latest_vitals?.cholesterol} limit={200} unit="mg/dL" />
                <BigVitalBox label="BP Sys" val={patient.latest_vitals?.ap_hi} limit={130} unit="mmHg" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
                <ChartCard title="Glucose Trend" data={patient.history} k="glucose" limit={140} />
                <ChartCard title="BP Trend" data={patient.history} k="ap_hi" limit={130} />
                <ChartCard title="Cholesterol Trend" data={patient.history} k="cholesterol" limit={200} />
                <ChartCard title="BMI Trend" data={patient.history} k="bmi" limit={25} />
              </div>

              <div className="bg-white p-8 rounded-3xl shadow">
                <div className="flex justify-between mb-6">
                  <h3 className="font-semibold uppercase text-sm tracking-widest">
                    Prescription
                  </h3>
                  <button
                    onClick={() => setMedicines([...medicines, { name: '', dosage: '' }])}
                    className="p-2 bg-emerald-100 rounded-xl"
                  >
                    <Plus />
                  </button>
                </div>

                <div className="space-y-4">
                  {medicines.map((m, i) => (
                    <div key={i} className="flex gap-2 items-center bg-slate-50 p-4 rounded-2xl">
                      <div className="flex-1">
                        <input
                          value={m.name}
                          onChange={e => updateMed(i, 'name', e.target.value)}
                          placeholder="Medicine"
                          className="w-full bg-transparent font-semibold outline-none"
                        />
                        <input
                          value={m.dosage}
                          onChange={e => updateMed(i, 'dosage', e.target.value)}
                          placeholder="Dosage"
                          className="w-full text-sm text-slate-500 bg-transparent outline-none"
                        />
                      </div>
                      <Trash2
                        className="text-slate-400 cursor-pointer hover:text-red-500"
                        onClick={() => setMedicines(medicines.filter((_, idx) => idx !== i))}
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={savePrescription}
                  className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-slate-800 transition-colors"
                >
                  <Save className="inline mr-2" /> Save Prescription
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BigVitalBox({ label, val, limit, unit }) {
  const high = val > limit;
  return (
    <div className={`p-6 rounded-3xl border transition-all ${high ? 'bg-red-600 text-white border-red-700 shadow-lg' : 'bg-white border-slate-100'}`}>
      <p className={`text-xs uppercase tracking-widest font-semibold ${high ? 'opacity-80' : 'text-slate-400'}`}>{label}</p>
      <p className="text-4xl font-bold">{val || 0}</p>
      <p className="text-sm opacity-70">{unit}</p>
    </div>
  );
}

function ChartCard({ title, data, k, limit }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="bg-white p-6 rounded-3xl shadow">
      <p className="text-xs uppercase tracking-widest font-semibold mb-4 text-slate-400">{title}</p>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis hide />
            <YAxis hide />
            <Tooltip 
               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <ReferenceLine y={limit} stroke="#ef4444" strokeDasharray="5 5" />
            <Line
              dataKey={k}
              stroke="#10b981"
              strokeWidth={4}
              dot={({ cx, cy, payload }) => (
                <circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill="#10b981"
                  stroke="#fff"
                  strokeWidth={2}
                  className="cursor-pointer"
                  onClick={() => setSelected(payload)}
                />
              )}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {selected && (
        <div className="mt-4 bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-sm font-semibold text-emerald-800">
          <p>Visit Date: <span className="font-bold">{selected.date}</span></p>
          <p>Health Value: <span className="font-bold">{selected[k]}</span></p>
        </div>
      )}
    </div>
  );
}