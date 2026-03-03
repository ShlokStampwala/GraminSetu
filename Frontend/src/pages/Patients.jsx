import Navbar from "../components/Navbar";

export default function Patients() {
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-slate-100 p-8">
        <h1 className="text-3xl font-bold mb-6">Patients</h1>

        <div className="bg-white rounded-2xl p-6 shadow">
          <p className="text-slate-600">
            Patient records will appear here.
          </p>

          {/* Later you can add table / cards here */}
        </div>
      </div>
    </>
  );
}
