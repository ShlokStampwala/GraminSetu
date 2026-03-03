import Navbar from "../components/ui/Navbar";
import {
  ArrowLeft,
  User,
  MapPin,
  Calendar,
  Heart,

 
  Droplet,
  Activity,
  HeartPulse,
  Pill,
  Pencil,
} from "lucide-react";

export default function PatientProfileAsha() {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ArrowLeft className="h-5 w-5 text-slate-600 cursor-pointer" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  Ramesh Kumar
                </h1>
                <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  High Risk
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Patient ID: P-000001
              </p>
            </div>
          </div>

          
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">

            {/* Basic Details */}
            <Card title="Basic Details">
              <DetailItem icon={<User />} label="Age / Gender" value="58 years / Male" />
              <DetailItem icon={<MapPin />} label="Village" value="Rampur" />
              <DetailItem icon={<HeartPulse />} label="Primary Condition" value="Hypertension" />
              <DetailItem icon={<Calendar />} label="Registered" value="15 Jun 2023" />
            </Card>

            {/* Latest Vitals */}
            <Card title="Latest Vitals" meta="Updated: 10 Jan 2024">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Vital icon={<Heart className="text-red-500" />} label="Blood Pressure" value="160/100" unit="mmHg" />
                <Vital icon={<Droplet className="text-blue-500" />} label="Blood Sugar" value="145" unit="mg/dL" />
                <Vital icon={<Activity className="text-green-500" />} label="SpO₂" value="96%" unit="Oxygen" />
                <Vital icon={<HeartPulse className="text-amber-500" />} label="Heart Rate" value="82" unit="bpm" />
              </div>
            </Card>

            
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">

            {/* Current Medications */}
            <Card title="Current Medications" icon={<Pill />}>
              <Medication
                name="Amlodipine 5mg"
                dosage="Once daily"
                adherence={85}
                color="green"
              />
              <Medication
                name="Metformin 500mg"
                dosage="Twice daily"
                adherence={70}
                color="amber"
              />
              <Medication
                name="Aspirin 75mg"
                dosage="Once daily"
                adherence={90}
                color="green"
              />
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Reusable Components ---------------- */

function Card({ title, children, meta, icon }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <div className="text-blue-600">{icon}</div>}
          <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
        {meta && <span className="text-xs text-slate-500">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function Vital({ icon, label, value, unit }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{unit}</p>
    </div>
  );
}

function Medication({ name, dosage, adherence, color }) {
  const colorMap = {
    green: "bg-green-500",
    amber: "bg-amber-500",
  };

  return (
    <div className="mb-4">
      <p className="font-medium text-slate-900">{name}</p>
      <p className="text-sm text-slate-600">{dosage}</p>
      <div className="mt-2">
        <div className="flex justify-between text-xs text-slate-600 mb-1">
          <span>Adherence</span>
          <span>{adherence}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div
            className={`h-2 rounded-full ${colorMap[color]}`}
            style={{ width: `${adherence}%` }}
          />
        </div>
      </div>
    </div>
  );
} 