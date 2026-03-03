import {
  Calendar,
  Bell,
  CheckCircle2,
  Clock,
  User,
  ArrowRight,
} from "lucide-react";

export default function FollowUpManagement() {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Follow-Up Management
          </h1>
          <p className="text-slate-600 mt-1">
            Schedule visits, manage reminders, and track continuity of care
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard
            title="Upcoming Follow-Ups"
            value="7"
            icon={<Calendar className="h-6 w-6" />}
            color="blue"
          />
          <SummaryCard
            title="Reminders Sent"
            value="12"
            icon={<Bell className="h-6 w-6" />}
            color="emerald"
          />
          <SummaryCard
            title="Completed This Week"
            value="5"
            icon={<CheckCircle2 className="h-6 w-6" />}
            color="amber"
          />
        </div>

        {/* Follow-Up List */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-slate-900">
              Scheduled Follow-Ups
            </h2>
          </div>

          <div className="divide-y">
            <FollowUpRow
              name="Ramesh Kumar"
              village="Rampur"
              date="12 Jan 2024"
              status="Pending"
              reminder="Enabled"
            />
            <FollowUpRow
              name="Mohan Lal"
              village="Bhimtal"
              date="14 Jan 2024"
              status="Completed"
              reminder="Sent"
            />
            <FollowUpRow
              name="Bhola Prasad"
              village="Rampur"
              date="15 Jan 2024"
              status="Pending"
              reminder="Not Set"
            />
          </div>
        </div>

        {/* Schedule New Follow-Up */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Schedule Next Follow-Up
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Patient Name" placeholder="Select patient" />
            <Input type="date" label="Follow-Up Date" />
            <Input label="Reminder" placeholder="SMS / Call / None" />
          </div>

          <button
            className="
              mt-6 inline-flex items-center gap-2
              rounded-xl bg-emerald-600 px-6 py-3
              text-white font-semibold
              hover:bg-emerald-700 transition
            "
          >
            Schedule Follow-Up
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function SummaryCard({ title, value, icon, color }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {value}
          </p>
        </div>
        <div
          className={`h-12 w-12 flex items-center justify-center rounded-xl ${colorMap[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function FollowUpRow({ name, village, date, status, reminder }) {
  const statusColor =
    status === "Completed"
      ? "text-emerald-700 bg-emerald-100"
      : "text-amber-700 bg-amber-100";

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
          <User className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-slate-900">{name}</p>
          <p className="text-sm text-slate-600">{village}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">{date}</span>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}
        >
          {status}
        </span>

        <div className="flex items-center gap-2 text-slate-600">
          <Bell className="h-4 w-4" />
          <span className="text-sm">{reminder}</span>
        </div>
      </div>
    </div>
  );
}

function Input({ label, type = "text", placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        className="
          w-full rounded-lg border border-slate-300
          px-3 py-2 text-sm
          focus:outline-none focus:ring-2 focus:ring-emerald-500
        "
      />
    </div>
  );
}