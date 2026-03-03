import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import Button from "../components/ui/button";
import Card from "../components/ui/card";
import CardContent from "../components/ui/CardContent";

import {
  ShieldCheck,
  HeartPulse,
  Users,
  Stethoscope,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
<img className="w-12 h-12" src="/public/logo.jpeg" alt="" />    
        <span className="text-xl font-semibold tracking-tight">
              GraminSetu
            </span>
          </div>

          {/* Login Button (Header) */}
          <Button
            className="rounded-xl"
            onClick={() => navigate("/login")}
          >
            Login In GraminSetu
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-14 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Strengthening Rural Healthcare
            <span className="block text-emerald-700">
              Through ASHA Workers
            </span>
          </h1>

          <p className="text-lg text-slate-600 mb-8">
            GraminSetu is a human-centered healthcare coordination platform where
            ASHA workers act as trusted bridges between rural communities and
            doctors ensuring continuity, prevention, and ethical use of
            technology.
          </p>

          <div className="flex gap-4">
            <Button
              size="lg"
              className="rounded-xl gap-2"
              onClick={() => navigate("/signup")}
            >
               NEW ASHA Worker- HAVE AN ACCOUNT? 
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="rounded-xl"
              onClick={() => navigate("/login")}
            >
              Learn How It Works
            </Button>
          </div>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-3xl bg-emerald-100 blur-3xl opacity-60" />

          <Card className="relative rounded-3xl shadow-xl">
            <CardContent className="p-8 space-y-6">
              <p className="text-sm text-slate-600">
                ASHA+ supports frontline health workers with ethical AI tools,
                structured patient tracking, and doctor coordination — without
                replacing human judgment.
              </p>

              <Feature
                icon={<ShieldCheck className="h-8 w-8 text-emerald-600" />}
                title="Ethical & Safe AI"
                text="AI assists in identifying risk patterns and summaries, never medical diagnosis."
              />

              <Feature
                icon={<Users className="h-8 w-8 text-emerald-600" />}
                title="Community-Centered Care"
                text="Designed specifically for village-level workflows and ASHA responsibilities."
              />

              <Feature
                icon={<Stethoscope className="h-8 w-8 text-emerald-600" />}
                title="Doctor Coordination"
                text="Doctors receive concise patient insights, trends, and urgency indicators."
              />

              <div className="pt-4">
                <Button
                  className="w-full rounded-xl"
                  onClick={() => navigate("/login")}
                >
                  Login as ASHA Worker
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Trust Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            ASHA Workers as the Heart of Care
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">
                  Trusted Community Presence
                </h3>
                <p className="text-sm text-slate-600">
                  ASHA workers are deeply rooted in villages, ensuring trust
                  and early health intervention.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">
                  Continuity of Care
                </h3>
                <p className="text-sm text-slate-600">
                  Continuous patient tracking helps doctors make better,
                  faster, and informed medical decisions.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">
                  Ethical AI Assistance
                </h3>
                <p className="text-sm text-slate-600">
                  AI assists ASHA workers with alerts and summaries while
                  keeping doctors in control.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-10 text-sm text-slate-600 flex flex-col md:flex-row justify-between gap-4">
          <span>© {new Date().getFullYear()} ASHA+ Platform</span>
          <span>Non-diagnostic • Consent-based • Government-aligned</span>
        </div>
      </footer>
    </div>
  );
}

/* Helper Component */
function Feature({ icon, title, text }) {
  return (
    <div className="flex items-start gap-4">
      {icon}
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-slate-600">{text}</p>
      </div>
    </div>
  );
}
