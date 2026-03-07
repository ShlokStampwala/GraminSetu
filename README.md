# 🌿 GraminSetu – AI Powered Rural Health Intelligence Platform

**GraminSetu** is an AI-driven healthcare platform designed to improve **early disease detection and healthcare accessibility in rural areas**.

It connects **ASHA workers, doctors, medical stores, and patients** through a unified digital health ecosystem with **AI-based risk prediction**.

The system analyzes patient vitals to predict risks for:

- ❤️ Heart Disease  
- 🩸 Diabetes  
- ⚖️ Obesity  

and enables **smart doctor recommendations, digital prescriptions, and automated health reports**.

---

# 🚀 Key Features

## 🧑‍⚕️ Multi-Role Healthcare System

GraminSetu supports multiple healthcare stakeholders.

### ASHA Worker
- Register rural patients
- Collect health vitals
- Sync patient records to central system
- Generate AI risk analysis

### Doctor
- View patient medical history
- Analyze AI risk predictions
- Add prescriptions
- Manage patient appointments

### Medical Store
- Verify prescriptions
- Mark medicines as issued
- Track prescription fulfillment

### Admin System
- Super Admin
- Regional Admin
- User approval workflow

---

# 🧠 AI Risk Prediction

AI models analyze patient vitals and estimate risk levels for:

- Heart Disease
- Diabetes
- Obesity

The platform calculates an **overall health risk score** and suggests clinical follow-ups.

---

# 📄 Automated Health Reports

GraminSetu generates **AI-powered PDF health reports** containing:

- Patient vitals summary
- Risk profiling
- Recommended medical tests
- Doctor consultation suggestions

Reports can be **automatically emailed to patients**.

### Supported Languages

- 🇬🇧 English
- 🇮🇳 Hindi
- 🇮🇳 Gujarati

---

# 👨‍⚕️ Smart Doctor Recommendation

Based on predicted risks, the system recommends relevant specialists:

- Cardiologist
- Endocrinologist
- Dietitian / Nutritionist
- General Physician

Doctors are prioritized based on **patient Taluka (location)**.

---

# 📅 Appointment Booking System

Patients can book appointments directly through the platform.

Doctors can:

- Accept appointments
- Reject appointments
- Mark consultations completed

---

# 🔐 Privacy & Security

To protect patient identity:

- Aadhaar numbers are **hashed using SHA-256**
- No raw Aadhaar numbers are stored in the database
- Sensitive health data is securely managed

---

# 🏗️ System Architecture

```
ASHA Worker App
        │
        ▼
React Frontend
        │
        ▼
Flask Backend API
        │
        ▼
MongoDB Database
        │
        ▼
AI Risk Prediction Models
```

---

# 🛠️ Tech Stack

## Frontend
- React
- Vite
- JavaScript
- Tailwind CSS

## Backend
- Python
- Flask
- Flask-CORS
- PyMongo

## Database
- MongoDB

## AI / Data Science
- Python ML models
- ONNX Runtime
- Feature Engineering

## Other Integrations
- Email SMTP (Gmail)
- PDF Generation (FPDF2)

---

# 📂 Project Structure

```
GraminSetu/
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── .env
│   └── FreeSans.ttf
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── package.json
│
└── README.md
```

---

# ⚙️ Installation Guide

## 1️⃣ Clone Repository

```bash
https://github.com/ShlokStampwala/GraminSetu.git
cd GraminSetu
```

---

## 2️⃣ Backend Setup

Create virtual environment:

```bash
python -m venv venv
```

Activate environment:

### Windows

```bash
venv\Scripts\activate
```

### Linux / Mac

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## 3️⃣ Configure Environment Variables

Create a `.env` file:

```
SENDER_EMAIL=your_email@gmail.com
SENDER_PASSWORD=your_app_password
```

---

## 4️⃣ Start Backend Server

```bash
python app.py
```

Backend runs at:

```
http://localhost:5000
```

---

## 5️⃣ Frontend Setup

Navigate to frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---



# 🎯 Impact

GraminSetu helps:

- Improve **early disease detection in rural communities**
- Digitize **ASHA worker patient records**
- Reduce **healthcare accessibility gaps**
- Enable **data-driven rural health insights**

---

# 👥 Contributors

Developed as part of an **MBIT Innovation Initiative**.

Team Members:

- Shlok – Mern Stack--------------|
- Nisha - Mern Stack Developer--|---- (Work Together IN DL Model(ONNX,Tflite))
- Sujal - Mern Stack--------------|
---

# 📜 License

This project is developed for **educational and research purposes**.

---

⭐ If you like this project, please **star the repository**.