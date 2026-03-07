from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import datetime
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from fpdf import FPDF, XPos, YPos # Updated for latest fpdf2import os
import os
from dotenv import load_dotenv
import hashlib
from datetime import datetime
from bson import ObjectId
app = Flask(__name__)
CORS(app)

client = MongoClient("mongodb://localhost:27017/")
db = client['Graminsetu_Shlok']

# Collections
asha_col = db['ASHA']
doctor_col = db['Doctor']
medical_col = db['MedicalStore']
patients_col = db['Patients']
requests_col = db['PendingRequests']
admin_col = db['Admins']  # New collection for Regional Admins

AUTHORIZED_MASTER_KEY = "CVMU2026"

# --- SUPER ADMIN---
SUPER_ADMIN_EMAIL = "superadmin@gs.com"
SUPER_ADMIN_PASS = "admin2026"

# 1. Registration Request (User Signup)
@app.route('/api/auth/register-request', methods=['POST'])
def register_request():
    try:
        data = request.get_json()
        if data.get('masterKey') != AUTHORIZED_MASTER_KEY:
            return jsonify({"status": "error", "message": "Invalid Master Key"}), 403
            
        phone = data.get('phone')
        if requests_col.find_one({"phone": phone}):
            return jsonify({"status": "error", "message": "Request already pending"}), 400

        data['status'] = 'Pending'
        data['created_at'] = datetime.datetime.utcnow()
        requests_col.insert_one(data)
        
        return jsonify({"status": "success", "message": "Request sent to Regional Admin"}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# 2. Admin Login (Super & Regional)
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        # Check Super Admin
        if email == SUPER_ADMIN_EMAIL and password == SUPER_ADMIN_PASS:
            return jsonify({
                "status": "success", 
                "role": "super", 
                "name": "Master Admin"
            }), 200

        # Check Regional Admin
        admin = admin_col.find_one({"email": email, "password": password})
        if admin:
            return jsonify({
                "status": "success", 
                "role": "regional", 
                "name": admin.get('name'),
                "taluka": admin.get('taluka')
            }), 200
            
        return jsonify({"status": "error", "message": "Invalid Admin Credentials"}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# 3. Create Regional Admin (Super Admin Only)
@app.route('/api/admin/create-regional', methods=['POST'])
def create_regional_admin():
    try:
        data = request.get_json()
        if admin_col.find_one({"email": data.get('email')}):
            return jsonify({"status": "error", "message": "Admin with this email already exists"}), 400
            
        data['role'] = 'regional'
        data['created_at'] = datetime.datetime.utcnow()
        admin_col.insert_one(data)
        return jsonify({"status": "success", "message": f"Admin created for {data.get('taluka')}"}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# 4. User Approval Logic
@app.route('/api/admin/approve', methods=['POST'])
def approve_user():
    try:
        data = request.get_json()
        phone = data.get('phone')
        action = data.get('action')

        request_user = requests_col.find_one({"phone": phone})
        if not request_user:
            return jsonify({"status": "error", "message": "Request not found"}), 404

        if action == 'Verified':
            role = request_user.get('role')
            final_profile = {
                "name": request_user.get('name'),
                "phone": request_user.get('phone'),
                "email": request_user.get('email'),
                "age": request_user.get('age'),
                "password": request_user.get('password'),
                "village": request_user.get('village'),
                "taluka": request_user.get('taluka'),
                "district": request_user.get('district'),
                "state": request_user.get('state'),
                "role": role,
                "status": "Verified",
                "verified_at": datetime.datetime.utcnow()
            }

            if role == 'medical':
                final_profile["pharmacy_name"] = request_user.get('pharmacyName')
                final_profile["pharmacy_address"] = request_user.get('hospitalAddress')
                final_profile["license_no"] = request_user.get('licenseNo')
                col = medical_col
            elif role == 'doctor':
                final_profile["specialty"] = request_user.get('specialty')
                final_profile["experience_years"] = request_user.get('experience')
                final_profile["hospital_address"] = request_user.get('hospitalAddress')
                final_profile["hospital_timing"] = request_user.get('hospitalTiming')
                col = doctor_col
            else:
                col = asha_col

            col.insert_one(final_profile)
            requests_col.delete_one({"phone": phone})
            return jsonify({"status": "success", "message": "User verified successfully"}), 200
        
        elif action == 'Rejected':
            requests_col.delete_one({"phone": phone})
            return jsonify({"status": "success", "message": "Request Deleted"}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# 5. Get Requests
@app.route('/api/admin/requests', methods=['GET'])
def get_admin_requests():
    taluka = request.args.get('taluka')
    query = {"status": "Pending"}
    if taluka:
        query["taluka"] = taluka
    results = list(requests_col.find(query, {"_id": 0}))
    return jsonify(results), 200

# 6. User Login (ASHA/Doctor/Medical)
@app.route('/api/auth/login', methods=['POST'])
def login_user():
    try:
        data = request.get_json()
        role = data.get('role')
        col = asha_col if role == 'asha' else (doctor_col if role == 'doctor' else medical_col)
        
        user = col.find_one({"phone": data.get('phone'), "password": data.get('password')})
        if user:
            return jsonify({
                "status": "success",
                "user": {
                    "name":          user.get('name', ''),
                    "role":          role,
                    "taluka":        user.get('taluka', ''),
                    "village":       user.get('village', ''),
                    "phone":         user.get('phone', ''),
                    "email":         user.get('email', ''),
                    "specialty":     user.get('specialty', ''),   # doctor
                    "experience":    user.get('experience_years', ''),
                    "hospital":      user.get('hospital_address', ''),
                    "timing":        user.get('hospital_timing', ''),
                    "pharmacy_name": user.get('pharmacy_name', ''),  # medical
                    "license_no":    user.get('license_no', ''),
                }
            }), 200
        return jsonify({"status": "error", "message": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# SYNC ROUTE:
def hash_aadhaar(aadhaar):
    """Aadhaar number ko SHA-256 hash mein convert karne ka function"""
    if not aadhaar: return None
    return hashlib.sha256(str(aadhaar).encode()).hexdigest()

@app.route('/api/sync/patients', methods=['POST'])
def sync_patients():
    try:
        data = request.get_json()
        patients_list = data.get('patients') if isinstance(data, dict) else data
        
        if not isinstance(patients_list, list):
            return jsonify({"status": "error", "message": "Expected a list of patients"}), 400

        synced_count = 0
        for patient in patients_list:
            raw_aadhaar = patient.get('aadhaar') # Asli Aadhaar frontend se aaya
            if not raw_aadhaar: continue
            
            # 1. Generate Secure Hash
            hashed_id = hash_aadhaar(raw_aadhaar)
            
            new_checkup = patient.get('newEntry')
            patient.pop('_id', None)
            patient.pop('newEntry', None) 

            # 2. Database Update with Hashed ID
            # Ab hum database mein "aadhaar" key ki jagah hashed value dhoondenge
            patients_col.update_one(
                {"aadhaar": hashed_id}, # Search by hash
                {
                    "$set": {
                        "name": patient.get('name'), # Name/DOB save kar sakte ho agar patient ne consent diya hai
                        "dob": patient.get('dob'),
                        "gender": patient.get('gender'),
                        "last_synced": datetime.datetime.utcnow()
                    },
                    "$addToSet": { "history": new_checkup } 
                },
                upsert=True
            )
            synced_count += 1

        return jsonify({"status": "success", "message": f"{synced_count} records securely synced"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
def hash_aadhaar(aadhaar):
    """Aadhaar ko SHA-256 hash mein convert karne ka function"""
    if not aadhaar: return None
    return hashlib.sha256(str(aadhaar).encode()).hexdigest()

# 1. SEARCH ROUTE: Basic Search (Hashed)
@app.route('/api/patients/search/<aadhaar>', methods=['GET'])
def search_patient(aadhaar):
    try:
        # Input Aadhaar ko pehle hash karo
        hashed_id = hash_aadhaar(aadhaar)
        
        # Database mein hashed value se search karo
        patient = patients_col.find_one({"aadhaar": hashed_id}, {"_id": 0})
        
        if patient:
            return jsonify({"status": "success", "patient": patient}), 200
        return jsonify({"status": "error", "message": "Patient not found"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# 2. SEARCH ROUTE: Detailed Patient Data (Hashed)
@app.route('/api/patient/<aadhaar>', methods=['GET'])
def get_patient_details(aadhaar):
    try:
        # Input Aadhaar ko pehle hash karo
        hashed_id = hash_aadhaar(aadhaar)
        
        patient = patients_col.find_one({"aadhaar": hashed_id}, {"_id": 0})

        if not patient:
            return jsonify({"status": "error", "message": "Patient not found"}), 404

        # History aur Prescriptions keys ensure karein
        if "history" not in patient:
            patient["history"] = []
        if "prescriptions" not in patient:
            patient["prescriptions"] = []

        return jsonify(patient), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

load_dotenv()
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")

# Language translations
translations = {
    'en': {
        'title': "GraminSetu AI Health Report",
        'patient': "Patient", 'aadhaar': "Aadhaar", 'loc': "Location",
        'vitals_title': "1. CLINICAL VITALS SUMMARY",
        'bp': "Blood Pressure", 'gluc': "Glucose", 'chol': "Cholesterol",
        'risk_title': "2. AI RISK PROFILING",
        'advice_title': "3. RECOMMENDED CLINICAL TESTS",
        'heart_advice': "- HEART: ECG, Lipid Profile, 2D Echo.",
        'diab_advice': "- DIABETES: HbA1c, Fasting Sugar, PPBS.",
        'obes_advice': "- METABOLIC: Thyroid (TSH), LFT Check.",
        'disclaimer': "NON-REPLY NOTICE: This is an AI screening tool, not a clinical diagnosis.",
        'footer': "Generated by GraminSetu Platform - MBIT Initiative"
    },
    'gu': {
        'title': "ગ્રામીણસેતુ AI આરોગ્ય રિપોર્ટ",
        'patient': "દર્દી", 'aadhaar': "આધાર", 'loc': "સ્થળ",
        'vitals_title': "૧. ક્લિનિકલ વિટલ્સ સારાંશ",
        'bp': "બ્લડ પ્રેશર", 'gluc': "ગ્લુકોઝ", 'chol': "કોલેસ્ટ્રોલ",
        'risk_title': "૨. AI જોખમ વિશ્લેષણ",
        'advice_title': "૩. ભલામણ કરેલ તબીબી પરીક્ષણો",
        'heart_advice': "- હૃદય: ECG, લિપિડ પ્રોફાઇલ, 2D ઇકો.",
        'diab_advice': "- ડાયાબિટીસ: HbA1c, ફાસ્ટિંગ સુગર, PPBS.",
        'obes_advice': "- મેટાબોલિક: થાઇરોઇડ (TSH), LFT તપાસ.",
        'disclaimer': "સૂચના: આ એક AI સ્ક્રિનિંગ ટૂલ છે, ક્લિનિકલ નિદાન નથી.",
        'footer': "ગ્રામીણસેતુ પ્લેટફોર્મ દ્વારા જનરેટ - MBIT પહેલ"
    },
    'hi': {
        'title': "ग्रामीणसेतु AI स्वास्थ्य रिपोर्ट",
        'patient': "मरीज", 'aadhaar': "आधार", 'loc': "स्थान",
        'vitals_title': "१. क्लिनिकल विटल्स सारांश",
        'bp': "ब्लड प्रेशर", 'gluc': "ग्लूकोज", 'chol': "कोलेस्ट्रॉल",
        'risk_title': "२. AI जोखिम विश्लेषण",
        'advice_title': "३. अनुशंसित चिकित्सा परीक्षण",
        'heart_advice': "- हृदय: ईसीजी, लिपिड प्रोफाइल, 2D इको।",
        'diab_advice': "- मधुमेह: HbA1c, फास्टिंग शुगर, PPBS।",
        'obes_advice': "- मेटाबॉलिक: थायराइड (TSH), LFT जांच।",
        'disclaimer': "सूचना: यह यह एक AI स्क्रीनिंग टूल है, नैदानिक निदान नहीं है।",
        'footer': "ग्रामीणसेतु प्लेटफॉर्म द्वारा जनरेट - MBIT पहल"
    }
}

@app.route('/api/send-report-email', methods=['POST'])
def send_report_email():
    try:
        data = request.get_json()
        target_email = data.get('email')
        lang = data.get('lang', 'en')
        patient = data.get('patientData', {})
        overall_score = str(data.get('overallScore', '0'))
        
        t = translations.get(lang, translations['en'])
        results = patient.get('results', {})
        vitals = patient.get('vitals', patient) 

        pdf = FPDF()
        font_name = "FreeSans"
        # FIX: Removed uni=True to fix DeprecationWarning
        try:
            pdf.add_font(font_name, '', 'FreeSans.ttf')
            pdf.set_font(font_name, '', 12)
        except Exception as e:
            print(f"Font Error: {e}")
            pdf.set_font("Helvetica", '', 12)

        pdf.add_page()
        
        # Header
        pdf.set_fill_color(16, 185, 129) 
        pdf.rect(0, 0, 210, 40, 'F')
        pdf.set_text_color(255, 255, 255)
        pdf.set_font(font_name, '', 22)
        pdf.cell(0, 20, t['title'], new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        pdf.ln(15)

        # Patient Info - Using multi_cell for safety
        pdf.set_text_color(0, 0, 0)
        pdf.set_font(font_name, '', 11)
        info_text = f"{t['patient']}: {patient.get('name', 'N/A')} | {t['aadhaar']}: {patient.get('aadhaar', 'N/A')}"
        pdf.multi_cell(0, 10, info_text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        loc_text = f"{t['loc']}: {patient.get('village', 'N/A')}, {patient.get('taluka', 'N/A')}"
        pdf.multi_cell(0, 8, loc_text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.ln(5)

        # 1. Vitals Section - Fixed Width
        pdf.set_fill_color(241, 245, 249)
        pdf.cell(0, 10, f" {t['vitals_title']}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.ln(2)
        # Reduced width to 90 to ensure horizontal space
        pdf.cell(90, 8, f"{t['bp']}: {vitals.get('ap_hi', 'N/A')}/{vitals.get('ap_lo', 'N/A')} mmHg")
        pdf.cell(90, 8, f"{t['gluc']}: {vitals.get('glucose_mg', 'N/A')} mg/dL", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.cell(90, 8, f"{t['chol']}: {vitals.get('cholesterol_mg', 'N/A')} mg/dL")
        pdf.cell(90, 8, f"BMI: {vitals.get('weight', 'N/A')}kg / {vitals.get('height', 'N/A')}cm", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.ln(5)

        # 2. AI Risk Section
        pdf.cell(0, 10, f" {t['risk_title']}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font(font_name, '', 16)
        score_val = float(overall_score)
        pdf.set_text_color(239, 68, 68) if score_val > 50 else pdf.set_text_color(16, 185, 129)
        pdf.cell(0, 12, f"SCORE: {overall_score}%", align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font(font_name, '', 10)
        heart_p = float(results.get('heartRisk', 0)) * 100
        diab_p = float(results.get('diabetesRisk', 0)) * 100
        pdf.cell(0, 7, f"- Heart: {heart_p:.1f}%", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.cell(0, 7, f"- Diabetes: {diab_p:.1f}%", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.ln(5)

        # 3. Recommended Tests - Fixed for horizontal space error
        pdf.set_fill_color(239, 246, 255)
        pdf.set_font(font_name, '', 11)
        pdf.cell(0, 10, f" {t['advice_title']}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font(font_name, '', 10)
        pdf.ln(2)
        
        # Using multi_cell with width 0 to occupy full line and wrap text safely
        if heart_p > 30:
            pdf.multi_cell(0, 7, t['heart_advice'], new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        if diab_p > 30:
            pdf.multi_cell(0, 7, t['diab_advice'], new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        if float(results.get('obesityRisk', 0))*100 > 30:
            pdf.multi_cell(0, 7, t['obes_advice'], new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        # Footer
        pdf.set_y(-35)
        pdf.set_font(font_name, '', 8)
        pdf.set_text_color(150, 150, 150)
        pdf.multi_cell(0, 5, t['disclaimer'], align='C')
        pdf.cell(0, 10, t['footer'], align='C')

        pdf_filename = f"Report_{patient.get('aadhaar', 'Temp')}.pdf"
        pdf.output(pdf_filename)

        # Email dispatch logic
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = target_email
        msg['Subject'] = f"Health Report: {patient.get('name', 'Patient')} (Do Not Reply)"
        msg.attach(MIMEText("Hello, Your GraminSetu health report is attached.", 'plain'))

        with open(pdf_filename, "rb") as attachment:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.read())
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f"attachment; filename= {pdf_filename}")
            msg.attach(part)

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        os.remove(pdf_filename)

        return jsonify({"status": "success", "message": "PDF Sent Successfully"}), 200

    except Exception as e:
        # Traceback to see exact line if it still fails
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500
# Helper to hash aadhaar before searching


# Aadhaar ko hash karne ka function
def hash_aadhaar(aadhaar):
    return hashlib.sha256(aadhaar.encode()).hexdigest()

# @app.route('/api/doctor/update-medicine', methods=['POST'])
# def update_medicine():
#     try:
#         data = request.get_json()
#         raw_aadhaar = str(data.get('aadhaar')).strip()
        
#         # Pehle frontend wale Aadhaar ko hash karo
#         hashed_id = hash_aadhaar(raw_aadhaar)
        
#         # Ab check karo ki kya ye hashed_id DB mein hai
#         # Query mein "aadhaar" use karo kyunki screenshot mein wahi key hai
#         result = db.patients.update_one(
#             {"aadhaar": hashed_id}, 
#             {
#                 "$push": {
#                     "history.0.prescriptions": { # Latest visit ke andar push
#                         "medicines": data.get('medicines'),
#                         "notes": data.get('notes'),
#                         "doctor": data.get('doctor_name'),
#                         "timestamp": datetime.now()
#                     }
#                 }
#             }
#         )
        
#         if result.matched_count > 0:
#             return jsonify({"status": "success", "message": "Matched and Saved"}), 200
#         else:
#             # Agar yahan aaya toh matlab Aadhaar DB mein nahi mila
#             return jsonify({"status": "error", "message": "Aadhaar not found in DB"}), 404

#     except Exception as e:
#         print(f"Server Error: {str(e)}")
#         return jsonify({"error": str(e)}), 500
def _hash(aadhaar):
    return hashlib.sha256(str(aadhaar).encode()).hexdigest()

# ── FIX: update-medicine (replace existing broken one in app.py) ──
# Remove your old @app.route('/api/doctor/update-medicine') and use this:
@app.route('/api/doctor/update-medicine', methods=['POST'])
def update_medicine_fixed():
    try:
        data        = request.get_json()
        raw_aadhaar = str(data.get('aadhaar', '')).strip()
        medicines   = data.get('medicines', [])
        notes       = data.get('notes', '')
        doctor_name = data.get('doctor_name', '')

        if not raw_aadhaar:
            return jsonify({"error": "aadhaar required"}), 400

        hashed_id = _hash(raw_aadhaar)

        prescription_entry = {
            "medicines":  medicines,
            "notes":      notes,
            "doctor":     doctor_name,
            "timestamp":  datetime.utcnow().isoformat()
        }

        # Strategy: push to history[0].prescriptions AND set top-level fields
        result = patients_col.update_one(
            {"aadhaar": hashed_id},
            {
                "$set": {
                    "prescriptions":      medicines,        # top-level copy
                    "doctor_notes":       notes,
                    "prescribing_doctor": doctor_name,
                    "prescription_updated_at": datetime.utcnow().isoformat(),
                },
                "$push": {
                    "history.$[first].prescriptions": prescription_entry
                }
            },
            array_filters=[{"first": {"$exists": True}}]
        )

        if result.matched_count == 0:
            return jsonify({"error": "Patient not found (aadhaar mismatch)"}), 404

        return jsonify({"status": "success", "message": "Prescription saved"}), 200
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── FIX: get_patient_details — expose bmi + all calculated fields ──
# Replace your existing /api/patient/<aadhaar> with this:
@app.route('/api/patient/<aadhaar>', methods=['GET'])
def get_patient_details_v2(aadhaar):
    try:
        hashed_id = _hash(aadhaar)
        patient   = patients_col.find_one({"aadhaar": hashed_id}, {"_id": 0})

        if not patient:
            return jsonify({"status": "error", "message": "Patient not found"}), 404

        if "history" not in patient:
            patient["history"] = []
        if "prescriptions" not in patient:
            patient["prescriptions"] = []

        # Sort history newest first
        patient["history"] = sorted(
            patient["history"],
            key=lambda h: h.get("date", ""),
            reverse=True
        )

        # Expose latest vitals + _calculated (includes bmi) at top level
        if patient["history"]:
            latest = patient["history"][0]
            v = latest.get("vitals", {})
            c = latest.get("_calculated", {})
            r = latest.get("results", {})

            patient["latest_vitals"] = {**v, **c}   # merge vitals + calculated
            patient["latest_results"] = r

            # Explicit bmi exposure (from _calculated)
            patient["bmi"]            = c.get("bmi")
            patient["bmi_label"]      = c.get("bmiInfo", {}).get("label", "")
            patient["bmi_color"]      = c.get("bmiInfo", {}).get("color", "")
            patient["pulse_pressure"] = c.get("pulse_pressure")
            patient["map_val"]        = c.get("map_val")
            patient["hypertension"]   = c.get("hypertension")
            patient["age"]            = c.get("age")

        return jsonify(patient), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ── NEW: GET /api/doctor/appointments ────────────────────────────
@app.route('/api/doctor/appointments', methods=['GET'])
def get_doctor_appointments():
    try:
        docs   = list(requests_col.find({"name": {"$exists": True}, "date": {"$exists": True}}))
        result = []
        for doc in docs:
            doc['_id'] = str(doc['_id'])
            doc['id']  = doc['_id']
            if doc.get('date'):
                doc['date'] = str(doc['date'])[:10]
            result.append(doc)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── NEW: POST /api/doctor/appointment/<id>/status ─────────────────
@app.route('/api/doctor/appointment/<apt_id>/status', methods=['POST'])
def update_appointment_status(apt_id):
    try:
        data   = request.get_json()
        status = data.get('status', '').strip()
        allowed = {'Accepted', 'Rejected', 'Done', 'Ongoing', 'Pending'}
        if status not in allowed:
            return jsonify({"error": f"status must be one of {allowed}"}), 400

        update_result = None
        try:
            update_result = requests_col.update_one(
                {"_id": ObjectId(apt_id)},
                {"$set": {"status": status, "status_updated_at": datetime.utcnow().isoformat()}}
            )
        except Exception:
            pass

        if not update_result or update_result.matched_count == 0:
            update_result = requests_col.update_one(
                {"id": apt_id},
                {"$set": {"status": status, "status_updated_at": datetime.utcnow().isoformat()}}
            )

        if update_result.matched_count == 0:
            return jsonify({"error": "Appointment not found"}), 404

        return jsonify({"status": "success", "new_status": status}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── NEW: GET /api/doctor/patients ─────────────────────────────────
@app.route('/api/doctor/patients', methods=['GET'])
def get_all_patients():
    try:
        patients = list(patients_col.find({}, {"_id": 0}))
        for p in patients:
            if isinstance(p.get('history'), list):
                p['history'] = sorted(
                    p['history'],
                    key=lambda h: h.get('date', ''),
                    reverse=True
                )
                if p['history']:
                    latest = p['history'][0]
                    c = latest.get('_calculated', {})
                    p['bmi']       = c.get('bmi')
                    p['bmi_label'] = c.get('bmiInfo', {}).get('label', '')
        return jsonify(patients), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500 
# ── Exact specialty → aliases mapping ────────────────────────────
# Primary key = exact value stored in Doctor collection (from registration form)
SPECIALTY_ALIASES = {
    'General Physician':    ['General Physician', 'General', 'MBBS', 'Physician'],
    'Cardiologist':         ['Cardiologist', 'Heart Specialist', 'Cardiology', 'Heart'],
    'Endocrinologist':      ['Endocrinologist', 'Diabetologist', 'Diabetes Specialist', 'Sugar Specialist'],
    'Dietitian/Nutritionist': ['Dietitian', 'Nutritionist', 'Dietician', 'Nutrition'],
    'Gynecologist':         ['Gynecologist', 'Gynaecologist', 'Gynae', 'Obs'],
    'Pediatrician':         ['Pediatrician', 'Paediatrician', 'Child Specialist', 'Pedia'],
    'Ayush/Homeopathy':     ['Ayush', 'Homeopathy', 'Ayurveda', 'Naturopathy', 'Homeopathic'],
}

# Risk → which specialties to search (exact values from form)
RISK_SPECIALTY_MAP = {
    'heart':    ['Cardiologist', 'General Physician'],
    'diabetes': ['Endocrinologist', 'General Physician'],
    'obesity':  ['Dietitian/Nutritionist', 'General Physician'],
    'general':  ['General Physician'],
}


# ── GET /api/doctors/by-risk ─────────────────────────────────────
# Query params:
#   specialties = "Cardiologist,General Physician"  (comma-separated)
#   taluka      = patient taluka (optional)
@app.route('/api/doctors/by-risk', methods=['GET'])
def get_doctors_by_risk():
    try:
        specialties_raw = request.args.get('specialties', '')
        taluka          = request.args.get('taluka', '').strip()

        requested = [s.strip() for s in specialties_raw.split(',') if s.strip()]
        if not requested:
            requested = ['General Physician']

        # Build all aliases for requested specialties
        all_aliases = []
        for spec in requested:
            # Direct match first
            aliases = SPECIALTY_ALIASES.get(spec, [spec])
            all_aliases.extend(aliases)

        # Also: if the value isn't in our map, try it directly as a regex
        # This handles free-text specialty entries in old records
        regex_conditions = [
            {"specialty": {"$regex": alias, "$options": "i"}}
            for alias in set(all_aliases)
        ]

        query = {
            "$or": regex_conditions,
            # Only show approved/verified doctors
            "$or": [
                {"$or": regex_conditions},
            ]
        }

        # Simpler query that works reliably
        query = {"$or": regex_conditions}

        all_matches = list(doctor_col.find(
            query,
            {"_id": 1, "name": 1, "specialty": 1, "taluka": 1,
             "phone": 1, "experience_years": 1, "hospital_address": 1,
             "hospital_timing": 1, "email": 1}
        ))

        # Serialize + split by taluka
        same_taluka = []
        other       = []
        for doc in all_matches:
            doc['_id'] = str(doc['_id'])
            doc['id']  = doc['_id']
            if taluka and (doc.get('taluka') or '').strip().lower() == taluka.strip().lower():
                same_taluka.append(doc)
            else:
                other.append(doc)

        # Same taluka first, max 10
        result = (same_taluka + other)[:10]
        return jsonify(result), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── POST /api/appointments/book ──────────────────────────────────
# Books appointment in PendingRequests collection
# Supports multiple bookings — call once per doctor
@app.route('/api/appointments/book', methods=['POST'])
def book_appointment():
    try:
        data = request.get_json()

        for field in ['patient_name', 'doctor_name', 'date', 'time']:
            if not data.get(field):
                return jsonify({"error": f"'{field}' is required"}), 400

        appointment = {
            # Patient
            "name":             data['patient_name'],
            "aadhaar":          data.get('patient_aadhaar', ''),
            "phone":            data.get('patient_phone',   ''),
            "email":            data.get('patient_email',   ''),
            "taluka":           data.get('taluka',          ''),
            # Doctor
            "doctor_id":        data.get('doctor_id',       ''),
            "doctor_name":      data['doctor_name'],
            "doctor_specialty": data.get('doctor_specialty',''),
            # Slot
            "date":             data['date'],
            "time":             data['time'],
            "notes":            data.get('notes', ''),
            # Risk data — ALL stored so doctor dashboard can show them
            "risk":             int(data.get('risk', 0)),
            "heart_risk":       int(data.get('heart_risk', 0)),
            "diabetes_risk":    int(data.get('diabetes_risk', 0)),
            "obesity_risk":     int(data.get('obesity_risk', 0)),
            "risk_reason":      data.get('risk_reason', ''),  # 'heart'|'diabetes'|'obesity'
            # Priority
            "emergency":        bool(data.get('emergency', False)),
            "priority":         data.get('priority', 'normal'),
            # Meta
            "status":           "Pending",
            "source":           "patient_analysis",
            "created_at":       datetime.utcnow().isoformat(),
        }

        result = requests_col.insert_one(appointment)
        appointment['_id'] = str(result.inserted_id)
        appointment['id']  = appointment['_id']

        return jsonify({
            "success":     True,
            "message":     "Appointment booked",
            "appointment": appointment,
        }), 201

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── GET /api/doctors/search (enhanced — used by PatientAnalysis) ─
@app.route('/api/doctors/search', methods=['GET'])
def search_doctors():
    try:
        specialty = request.args.get('specialty', '').strip()
        taluka    = request.args.get('taluka',    '').strip()

        query = {}
        if specialty:
            # Use aliases map for better matching
            aliases = SPECIALTY_ALIASES.get(specialty, [specialty])
            query['specialty'] = {"$in": [
                {"$regex": a, "$options": "i"} for a in aliases
            ]}
            # Fallback to direct regex if $in with regex doesn't work in your mongo version
            query = {"specialty": {"$regex": "|".join(aliases), "$options": "i"}}
        if taluka:
            query['taluka'] = {"$regex": taluka, "$options": "i"}

        doctors = list(doctor_col.find(query, {"_id": 0, "password": 0}))
        return jsonify({"doctors": doctors}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

"""
404 = Route Flask mein register hi nahi hua.
Yeh PURA block app.py mein `if __name__ == '__main__':` se PEHLE paste karo.
Pehle search karo app.py mein 'mark-issued' — agar koi purana route hai toh DELETE karo.
"""

@app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin']  = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

@app.route('/api/medical/mark-issued', methods=['POST', 'OPTIONS'])
def mark_medicine_issued():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        data          = request.get_json()
        raw_aadhaar   = str(data.get('aadhaar', '')).strip()
        prescriptions = data.get('prescriptions', [])

        if not raw_aadhaar:
            return jsonify({"error": "aadhaar required"}), 400

        hashed_id = hashlib.sha256(raw_aadhaar.encode()).hexdigest()

        result = patients_col.update_one(
            {"aadhaar": hashed_id},
            {"$set": {
                "prescriptions": prescriptions,
                "prescription_last_issued_at": datetime.utcnow().isoformat(),
            }}
        )

        if result.matched_count == 0:
            return jsonify({"error": "Patient not found"}), 404

        return jsonify({
            "status":        "success",
            "issued_count":  sum(1 for m in prescriptions if m.get('issued')),
            "pending_count": sum(1 for m in prescriptions if not m.get('issued')),
        }), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)