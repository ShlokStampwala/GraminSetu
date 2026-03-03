import { Info, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function ReviewHighRiskPage() {
  return (
    <>
      {/* ✅ NAVBAR */}
      <Navbar />

      <div className="min-h-screen bg-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Info Banner */}
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900">
                About Risk Scores
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Risk scores are calculated based on patient vitals history,
                medication adherence, age, existing conditions, and lifestyle
                factors. Higher scores indicate greater need for intervention.
              </p>
            </div>
          </div>

          {/* Patient Cards */}
          <RiskCard
            aadhaar="123456789012"
            score={85}
            name="Ramesh Kumar"
            meta="58 years • Hypertension"
            analysis="Based on the last 6 months of data, this patient shows consistently elevated blood pressure readings (avg 155/98 mmHg) with poor medication adherence (70%). Risk of cardiovascular complications is high."
            factors={[
              "High BP trend",
              "Low medication adherence",
              "Age > 55",
              "Family history",
            ]}
          />

          <RiskCard
            aadhaar="987654321098"
            score={78}
            name="Mohan Lal"
            meta="62 years • Diabetes + HTN"
            analysis="Patient has uncontrolled diabetes (HbA1c 8.2%) and hypertension. Recent blood sugar readings show significant variability. Immediate lifestyle intervention is recommended."
            factors={[
              "Dual condition",
              "Irregular blood sugar",
              "Overweight",
              "Sedentary lifestyle",
            ]}
          />

        </div>
      </div>
    </>
  );
}

/* -------------------- Risk Card -------------------- */

function RiskCard({ aadhaar, score, name, meta, analysis, factors }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">

        {/* Left: Risk Score + Patient */}
        <div className="flex items-center gap-5 min-w-[260px]">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-red-200 flex items-center justify-center text-red-600 font-bold text-lg">
              {score}
            </div>
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
              High Risk
            </span>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {name}
            </h3>
            <p className="text-sm text-slate-600">{meta}</p>
          </div>
        </div>

        {/* Middle: AI Analysis */}
        <div className="flex-1">
          <h4 className="text-xs font-semibold tracking-wide text-slate-500 mb-1">
            AI ANALYSIS
          </h4>
          <p className="text-sm text-slate-700 leading-relaxed">
            {analysis}
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            {factors.map((factor, index) => (
              <span
                key={index}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
              >
                {factor}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Action */}
        <button
          onClick={() => navigate(`/asha/patient/${aadhaar}`)}
          className="
            flex items-center gap-1
            rounded-lg border border-slate-300
            bg-white px-4 py-2
            text-sm font-medium text-slate-700
            hover:bg-slate-100 transition
          "
        >
          View Profile
          <ChevronRight className="h-4 w-4" />
        </button>

      </div>
    </div>
  );
}
