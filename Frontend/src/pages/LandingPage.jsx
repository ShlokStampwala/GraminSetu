import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import Button from "../components/ui/button";
import Card from "../components/ui/card";
import CardContent from "../components/ui/CardContent";

import {
  ShieldCheck,
  HeartPulse,
  Users,
  Stethoscope,
  ArrowRight
} from "lucide-react";

export default function LandingPage() {

  const navigate = useNavigate();
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setShowIntro(false);
    }, 2500);
  }, []);

  return (
    <div className="min-h-screen">

      {/* INTRO ECG ANIMATION */}

      <AnimatePresence>

        {showIntro && (

          <motion.div
            className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >

            <div className="text-center text-white">

              <h1 className="text-5xl font-bold mb-8">
                Gramin<span className="text-emerald-500">Setu</span>
              </h1>

              <svg width="400" height="120" viewBox="0 0 400 120">

                <path
                  d="M0 60 L60 60 L90 20 L120 100 L150 60 L240 60 L270 30 L300 90 L330 60 L400 60"
                  stroke="#10b981"
                  strokeWidth="4"
                  fill="transparent"
                  className="ecg"
                />

              </svg>

              <p className="mt-6 text-slate-300">
                Connecting Rural Patients to Healthcare
              </p>

            </div>

          </motion.div>

        )}

      </AnimatePresence>



      {/* MAIN LANDING PAGE */}

      {!showIntro && (

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >

          <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white text-slate-900">

            {/* HEADER */}

            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">

              <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">

                <div className="flex items-center gap-2">
                  <img className="w-10 h-10" src="/logo.jpeg" alt="" />
                  <span className="text-xl font-semibold">
                    GraminSetu
                  </span>
                </div>

                <Button
                  className="rounded-xl"
                  onClick={() => navigate("/login")}
                >
                  Login In GraminSetu
                </Button>

              </div>

            </header>



            {/* HERO SECTION */}

            <section className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-14 items-center">

              <div>

                <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
                  Bridging Rural Patients
                  <span className="block text-emerald-700">
                    With Timely Healthcare
                  </span>
                </h1>

                <p className="text-lg text-slate-600 mb-8">
                  GraminSetu empowers ASHA workers to collect real-time health
                  information from villages and connect patients with doctors
                  through a smart triage system that prioritizes critical cases.
                </p>

                <div className="flex gap-4">

                  <Button
                    size="lg"
                    className="rounded-xl gap-2"
                    onClick={() => navigate("/signup")}
                  >
                    Register ASHA Worker
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-xl"
                    onClick={() => navigate("/login")}
                  >
                    See Platform Demo
                  </Button>

                </div>

              </div>


              {/* INFO CARD */}

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
              >

                <Card className="rounded-3xl shadow-xl">

                  <CardContent className="p-8 space-y-6">

                    <Feature
                      icon={<HeartPulse className="h-8 w-8 text-emerald-600" />}
                      title="Early Risk Detection"
                      text="AI analyzes symptoms collected by ASHA workers."
                    />

                    <Feature
                      icon={<Users className="h-8 w-8 text-emerald-600" />}
                      title="Community Driven"
                      text="Built for village-level healthcare ecosystems."
                    />

                    <Feature
                      icon={<Stethoscope className="h-8 w-8 text-emerald-600" />}
                      title="Doctor Prioritization"
                      text="Critical patients automatically receive urgent appointments."
                    />

                    <Feature
                      icon={<ShieldCheck className="h-8 w-8 text-emerald-600" />}
                      title="Ethical AI"
                      text="AI assists doctors, not replaces them."
                    />

                    <Button
                      className="w-full rounded-xl"
                      onClick={() => navigate("/login")}
                    >
                      Login as ASHA Worker
                    </Button>

                  </CardContent>

                </Card>

              </motion.div>

            </section>



            {/* STATS */}

            <section className="py-16 bg-white">

              <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 text-center gap-10">

                <Stat number="65%" text="Rural population lacking healthcare access" />
                <Stat number="3x Faster" text="Doctor response using triage system" />
                <Stat number="90%+" text="AI prediction accuracy" />
                <Stat number="24/7" text="ASHA monitoring support" />

              </div>

            </section>



            {/* HOW IT WORKS */}

            <section className="py-20">

              <h2 className="text-3xl font-bold text-center mb-12">
                How GraminSetu Works
              </h2>

              <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">

                <Step
                  title="Data Collection"
                  text="ASHA workers collect patient vitals from rural households."
                />

                <Step
                  title="AI Risk Analysis"
                  text="AI categorizes patients into High, Medium, and Low risk."
                />

                <Step
                  title="Doctor Appointment"
                  text="Doctors receive alerts and assign appointment slots."
                />

              </div>

            </section>



            {/* FOOTER */}

            <footer className="border-t bg-slate-50">

              <div className="max-w-7xl mx-auto px-6 py-10 text-sm text-slate-600 flex flex-col md:flex-row justify-between gap-4">

                <span>© 2026 GraminSetu Platform</span>

                <span>
                  Ethical AI • Consent Based • Rural Healthcare Innovation
                </span>

              </div>

            </footer>

          </div>

        </motion.div>

      )}



      {/* ECG Animation CSS */}

      <style>{`

      .ecg{
        stroke-dasharray:1000;
        stroke-dashoffset:1000;
        animation:ecgMove 2s linear forwards;
      }

      @keyframes ecgMove{
        to{
          stroke-dashoffset:0;
        }
      }

      `}</style>

    </div>
  );
}



/* SMALL COMPONENTS */

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

function Stat({ number, text }) {

  return (
    <div>
      <h3 className="text-3xl font-bold text-emerald-700">{number}</h3>
      <p className="text-slate-500 text-sm">{text}</p>
    </div>
  );

}

function Step({ title, text }) {

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-slate-600">{text}</p>
      </CardContent>
    </Card>
  );

}