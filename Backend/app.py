from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import datetime

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
                    "name": user.get('name'),
                    "role": role,
                    "taluka": user.get('taluka')
                }
            }), 200
        return jsonify({"status": "error", "message": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# SYNC ROUTE:
@app.route('/api/sync/patients', methods=['POST'])
def sync_patients():
    try:
        data = request.get_json()
        patients_list = data.get('patients') if isinstance(data, dict) else data
        
        if not isinstance(patients_list, list):
            return jsonify({"status": "error", "message": "Expected a list of patients"}), 400

        synced_count = 0
        for patient in patients_list:
            aadhaar = patient.get('aadhaar')
            if not aadhaar: continue
            
            # New checkup entry from frontend
            new_checkup = patient.get('newEntry')
            
            # handle permenant details update and history separately
            patient.pop('_id', None)
            patient.pop('newEntry', None) 

            # SMART HISTORY LOGIC
            # 1 Permanent details ($set)
            # 2 New checkup ($push)
            patients_col.update_one(
                {"aadhaar": aadhaar},
                {
                    "$set": {
                        "name": patient.get('name'),
                        "dob": patient.get('dob'),
                        "gender": patient.get('gender'),
                        "last_synced": datetime.datetime.utcnow()
                    },
                    "$push": { "history": new_checkup } # append in history
                },
                upsert=True
            )
            synced_count += 1

        return jsonify({"status": "success", "message": f"{synced_count} records synced with history"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# SEARCH ROUTE: for aadhaar
@app.route('/api/patients/search/<aadhaar>', methods=['GET'])
def search_patient(aadhaar):
    try:
        # Find through aadhar  
        patient = patients_col.find_one({"aadhaar": aadhaar}, {"_id": 0})
        if patient:
            return jsonify({"status": "success", "patient": patient}), 200
        return jsonify({"status": "error", "message": "Patient not found"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
# SEARCH ROUTE: for aadhaar
@app.route('/api/patient/<aadhaar>', methods=['GET'])
def get_patient_details(aadhaar):
    try:
        patient = patients_col.find_one({"aadhaar": aadhaar}, {"_id": 0})

        if not patient:
            return jsonify({"status": "error", "message": "Patient not found"}), 404

        if "history" not in patient:
            patient["history"] = []

        if "prescriptions" not in patient:
            patient["prescriptions"] = []

        return jsonify(patient), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)