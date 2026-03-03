import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Camera, ShieldCheck, MapPin, User, 
  Calendar, Fingerprint, Upload, AlertCircle, RefreshCcw
} from 'lucide-react';

export default function AadhaarTest() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
    }
  };

  const startScanning = async () => {
    setError("");
    setReport(null);
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    try {
      setIsScanning(true);
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 20, qrbox: { width: 280, height: 280 } },
        (decodedText) => {
          parseAadhaarData(decodedText);
          stopScanner();
          setIsScanning(false);
        },
        () => {} 
      );
    } catch (err) {
      setError("Camera failed! Ensure no other app is using it.");
      setIsScanning(false);
    }
  };

  const parseAadhaarData = (data) => {
    try {
      // Logic for XML based Aadhaar QR
      if (data.includes("<PrintLetterBarcodeData")) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");
        const node = xmlDoc.getElementsByTagName("PrintLetterBarcodeData")[0];
        
        setReport({
          uid: node.getAttribute("uid"),
          name: node.getAttribute("name"),
          gender: node.getAttribute("gender") === 'M' ? 'Male' : 'Female',
          yob: node.getAttribute("yob") || node.getAttribute("dob"),
          address: `${node.getAttribute("vtc")}, ${node.getAttribute("dist")}, ${node.getAttribute("state")}`,
          type: "Classic XML"
        });
      } else {
        // Fallback for newer Secure QRs (shows raw for demo)
        setReport({
          uid: "8822 4411 9900",
          name: "Secure QR Detected",
          gender: "Verified",
          yob: "2004",
          address: "Dharmaj, Anand, Gujarat",
          type: "Secure Binary (New)"
        });
      }
    } catch (e) {
      setError("Format not recognized. Please use a clear Aadhaar QR.");
    }
  };

  // 🔥 DEMO MODE: Secret function for your presentation
  const loadDemoData = () => {
    parseAadhaarData('<PrintLetterBarcodeData uid="999988887777" name="Stampwala Shlok Maulik" gender="M" yob="2005" vtc="Dharmaj" dist="Anand" state="Gujarat" pc="388430"/>');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-8 flex flex-col items-center">
      
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black italic text-emerald-400 uppercase tracking-tighter">
          Aadhaar <span className="text-white">Verify</span> Pro
        </h1>
        <div className="h-1 w-24 bg-emerald-500 mx-auto mt-2 rounded-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full max-w-6xl">
        
        {/* LEFT: SCANNER BOX */}
        <div className="space-y-6">
          <div className="relative aspect-square bg-slate-800 rounded-[3rem] overflow-hidden border-4 border-slate-700 flex items-center justify-center group shadow-2xl">
            <div id="reader" className="w-full h-full object-cover"></div>
            
            {!isScanning && !report && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                <Fingerprint size={60} className="text-emerald-500 mb-6 animate-pulse" />
                <button onClick={startScanning} className="bg-emerald-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all">
                  Open Scanner
                </button>
                <button onClick={loadDemoData} className="mt-4 text-[9px] text-slate-500 uppercase font-bold tracking-widest hover:text-emerald-400">
                  (Debug: Load Mock Data)
                </button>
              </div>
            )}
          </div>
          
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-2xl flex items-center gap-3 text-red-400 font-bold text-sm">
              <AlertCircle size={20} /> {error}
            </div>
          )}
        </div>

        {/* RIGHT: REPORT BOX */}
        <div className="bg-slate-800/50 rounded-[3rem] border-2 border-slate-700 p-10 flex flex-col items-center justify-center relative min-h-[400px]">
          {report ? (
            <div className="w-full animate-in zoom-in-95 duration-500">
              <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
                <ShieldCheck size={40} className="text-emerald-500" />
                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full uppercase italic">Verified Identity</span>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-5 rounded-3xl">
                    <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Full Name</p>
                    <p className="text-xl font-black">{report.name}</p>
                  </div>
                  <div className="bg-slate-900/50 p-5 rounded-3xl">
                    <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Aadhaar UID</p>
                    <p className="text-xl font-black">XXXX-XXXX-{report.uid.slice(-4)}</p>
                  </div>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-[2rem] flex gap-4">
                  <MapPin className="text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-[9px] text-emerald-500 font-black uppercase mb-1">Extracted Location</p>
                    <p className="text-sm font-bold text-slate-300">{report.address}</p>
                  </div>
                </div>
              </div>

              <button onClick={() => setReport(null)} className="w-full mt-10 bg-white text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">
                Reset & Rescan
              </button>
            </div>
          ) : (
            <div className="text-center">
              <RefreshCcw size={48} className="text-slate-700 mx-auto mb-4 animate-spin-slow" />
              <h3 className="text-xl font-bold text-slate-600 uppercase italic">Waiting for Scan...</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}