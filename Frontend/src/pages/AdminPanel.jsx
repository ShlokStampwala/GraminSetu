import React, { useState, useEffect } from 'react';
import { 
  UserPlus, CheckCircle, Shield, MapPin, 
  XCircle, Users, ShoppingBag, LayoutDashboard, 
  PlusCircle, LogOut 
} from 'lucide-react';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [users, setUsers] = useState([]); 
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  
  //  After Login role and taluka fetch 
  const adminRole = localStorage.getItem('adminRole') || 'super'; // 'super' or 'regional'
  const adminTaluka = localStorage.getItem('adminTaluka') || '';
  const adminName = localStorage.getItem('adminName') || 'Master Admin';

  // Regional Admin adding
  const [newAdmin, setNewAdmin] = useState({
    name: '', email: '', password: '', taluka: '', district: ''
  });

  // 1. Fetch Requests & Verified Users
  const fetchData = async () => {
    try {
      // Pending Requests
      const reqUrl = `http://localhost:5000/api/admin/requests${adminRole === 'regional' ? `?taluka=${adminTaluka}` : ''}`;
      const res = await fetch(reqUrl);
      const data = await res.json();
      if (res.ok) setUsers(data);

    
    } catch (err) {
      console.error("Backend offline or connection error.");
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // 2. Handle Approval/Rejection
  const handleStatusUpdate = async (phone, action) => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action: action === 'Verified' ? 'Verified' : 'Rejected' }),
      });

      if (response.ok) {
        alert(`User ${action} successfully!`);
        setUsers(users.filter(u => u.phone !== phone));
      }
    } catch (err) {
      alert("Error connecting to Backend");
    }
  };

  // 3. Create New Regional Admin (Only for Super Admin)
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/admin/create-regional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      });

      if (response.ok) {
        alert("New Regional Admin Created Successfully!");
        setNewAdmin({ name: '', email: '', password: '', taluka: '', district: '' });
        setActiveTab('requests');
      } else {
        const err = await response.json();
        alert(err.message);
      }
    } catch (err) {
      alert("Backend connection error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-72 bg-slate-900 text-white p-8 flex flex-col gap-8 shadow-2xl">
        <div>
          <h1 className="text-2xl font-black text-emerald-400">GS 2.0 ADMIN</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            {adminRole === 'super' ? 'Super Admin' : `Admin | ${adminTaluka}`}
          </p>
        </div>

        <nav className="space-y-4 flex-1">
          <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition ${activeTab === 'requests' ? 'bg-emerald-600 shadow-lg' : 'hover:bg-slate-800'}`}>
            <Users size={20} /> Pending Requests
          </button>
          
          <button onClick={() => setActiveTab('manage')} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition ${activeTab === 'manage' ? 'bg-emerald-600' : 'hover:bg-slate-800'}`}>
            <Shield size={20} /> Verified Database
          </button>

          {/* Super Admin Only Tab */}
          
          {adminRole === 'super' && (
            <button onClick={() => setActiveTab('create-admin')} className={`w-full flex items-center gap-3 p-4 rounded-2xl transition ${activeTab === 'create-admin' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}>
              <PlusCircle size={20} /> Add Regional Admin
            </button>
          )}
        </nav>

        <button onClick={() => { localStorage.clear(); window.location.href='/login'; }} className="flex items-center gap-3 p-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition">
          <LogOut size={20} /> Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10 overflow-y-auto">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
              {activeTab === 'requests' ? 'Approval Queue' : activeTab === 'manage' ? 'Healthcare Network' : 'Admin Management'}
            </h2>
            <p className="text-slate-500 font-bold">Welcome back, {adminName}</p>
          </div>
        </header>

        {/* TAB 1: Pending Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {users.length === 0 ? (
              <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold italic">No pending requests available.</p>
              </div>
            ) : (
              users.map(u => (
                <div key={u.phone} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex justify-between items-center animate-in fade-in">
                  <div className="flex gap-6 items-center">
                    <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-emerald-600">
                      {u.role === 'doctor' ? <CheckCircle size={32}/> : u.role === 'medical' ? <ShoppingBag size={32}/> : <Users size={32}/>}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">
                        {u.name} <span className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full ml-2 uppercase font-black">{u.role}</span>
                      </h3>
                      <p className="text-sm text-slate-500 font-medium">Village: {u.village} | Taluka: {u.taluka}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleStatusUpdate(u.phone, 'Verified')} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 flex items-center gap-2">
                      Approve
                    </button>
                    <button onClick={() => handleStatusUpdate(u.phone, 'Rejected')} className="bg-white border-2 border-slate-100 text-slate-400 px-6 py-3 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 transition">
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: Super Admin Only - Create Regional Admin */}
        {activeTab === 'create-admin' && adminRole === 'super' && (
          <div className="max-w-2xl bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black text-slate-800 mb-6 uppercase">Create Regional Authority</h2>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Admin Name" value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} className="p-4 border rounded-2xl bg-slate-50" required />
                <input placeholder="Admin Email" type="email" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} className="p-4 border rounded-2xl bg-slate-50" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Assigned Taluka" value={newAdmin.taluka} onChange={e => setNewAdmin({...newAdmin, taluka: e.target.value})} className="p-4 border rounded-2xl bg-slate-50" required />
                <input placeholder="District" value={newAdmin.district} onChange={e => setNewAdmin({...newAdmin, district: e.target.value})} className="p-4 border rounded-2xl bg-slate-50" required />
              </div>
              <input placeholder="Login Password" type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full p-4 border rounded-2xl bg-slate-50" required />
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition shadow-xl mt-4">
                Register Regional Admin
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: Verified Database */}
        {activeTab === 'manage' && (
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
             <p className="text-slate-400 italic">This section will display all verified Doctors, ASHA workers, and Medical Stores in your region.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;