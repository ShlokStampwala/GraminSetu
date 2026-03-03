import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // ✅ Language hook

export default function Navbar() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(); // ✅ Init translation

  // ✅ Language change function
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className="w-full bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-1 py-1 flex items-center justify-between">

        <h1 className="flex items-center gap-2 text-xl font-bold text-emerald-600">
          <img className="w-12 h-12" src="/logo.jpeg" alt="" />    
          {t('app_title')} 
        </h1>

        {/* Links & Controls */}
        <div className="flex items-center gap-6 text-sm font-medium">
          
          {/* 🌍 Language Switcher Dropdown */}
          <select 
            onChange={(e) => changeLanguage(e.target.value)}
            value={i18n.language}
            className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="gu">ગુજરાતી</option>
          </select>

          <NavLink
            to="/dashboard"
            className={({ isActive }) => 
              isActive ? "text-emerald-600 font-bold" : "text-slate-700 hover:text-emerald-600"
            }
          >
            {t('dashboard') || 'Dashboard'}
          </NavLink>

          <NavLink
            to="/add-patient"
            className={({ isActive }) => 
              isActive ? "text-emerald-600 font-bold" : "text-slate-700 hover:text-emerald-600"
            }
          >
            {t('reg_title')}
          </NavLink>

          <NavLink
            to="/patients"
            className={({ isActive }) => 
              isActive ? "text-emerald-600 font-bold" : "text-slate-700 hover:text-emerald-600"
            }
          >
            {t('patients_list') || 'Patients'}
          </NavLink>

          <button
            onClick={() => navigate("/login")}
            className="text-red-500 hover:text-red-600 font-semibold border border-red-100 px-3 py-1 rounded-lg hover:bg-red-50 transition"
          >
            {t('logout') || 'Logout'}
          </button>
        </div>
      </div>
    </nav>
  );
}