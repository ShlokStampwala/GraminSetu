import React, { useState } from 'react';

const AdminRegisterUser = () => {
  const [formData, setFormData] = useState({
    name: '', mobile: '', email: '', state: '', district: '', village: '', 
    role: 'doctor', specialty: '', licenseNo: '' 
  });

  return (
    <div className="min-h-screen bg-slate-50 p-10">
      <div className="max-w-4xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100">
        <h2 className="text-3xl font-black text-slate-800 mb-8 tracking-tight">
          CVMU Hackathon: <span className="text-emerald-600">Admin Control</span>
        </h2>
        
        <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input type="text" placeholder="Full Name" className="border-2 p-4 rounded-2xl outline-none focus:border-emerald-500" required />
          <input type="text" placeholder="Mobile No." className="border-2 p-4 rounded-2xl outline-none focus:border-emerald-500" required />
          <input type="email" placeholder="Official Email" className="border-2 p-4 rounded-2xl outline-none focus:border-emerald-500" required />
          
          <select className="border-2 p-4 rounded-2xl bg-white" onChange={(e) => setFormData({...formData, role: e.target.value})}>
            <option value="doctor">Doctor</option>
            <option value="asha">ASHA Worker</option>
            <option value="medical">Medical Store</option>
          </select>

          <input type="text" placeholder="State" className="border-2 p-4 rounded-2xl outline-none" />
          <input type="text" placeholder="District" className="border-2 p-4 rounded-2xl outline-none" />
          <input type="text" placeholder="Village / Area" className="border-2 p-4 rounded-2xl outline-none" />

          {formData.role === 'doctor' && <input type="text" placeholder="Specialization (MD/MBBS)" className="border-2 p-4 rounded-2xl outline-none border-emerald-200 bg-emerald-50" />}
          {formData.role === 'medical' && <input type="text" placeholder="Drug License Number" className="border-2 p-4 rounded-2xl outline-none border-emerald-200 bg-emerald-50" />}

          <button className="col-span-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-emerald-700 transition shadow-xl shadow-emerald-100 mt-6">
            Register & Activate User
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminRegisterUser;