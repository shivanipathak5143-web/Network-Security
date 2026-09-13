# 🛡️ PhishWatch — ML-Based Phishing Website Detection System

PhishWatch is an end-to-end Machine Learning system that classifies website records as **Phishing** or **Legitimate** using 30 structural and behavioral website features. It trains and compares multiple classification algorithms, selects the best-performing model, and serves it through a FastAPI backend with a React frontend for training, CSV upload, and batch predictions.

---

## 🚀 Overview

Phishing websites often mimic legitimate ones, making manual detection unreliable. PhishWatch learns patterns from labeled website data — analyzing features like IP usage, SSL state, domain age, URL structure, and redirect behavior — to classify unseen websites as **🔴 Phishing** or **🟢 Legitimate**.

---

## ✨ Key Features

- **Binary classification** — Phishing vs Legitimate
- **30 website features** analyzed per record (URL, domain, SSL, traffic, etc.)
- **Multiple ML algorithms** trained and compared automatically
- **Automated pipeline** — ingestion → validation → transformation → training → evaluation → deployment
- **FastAPI backend** with `/api/train` and `/api/predict` endpoints
- **React frontend** for training, CSV upload, and results dashboard
- **Batch prediction** via CSV upload
- **MongoDB** for data storage, **MLflow** for experiment tracking
- **Docker** support and **AWS**-ready deployment

---

## 🏗️ Architecture
React Frontend → FastAPI Backend → ML Pipeline (Ingestion → Validation →
Transformation → Training → Evaluation → Best Model → Saved Model)
↓
MongoDB + MLflow

---

## 📋 Feature List (30 total)

`having_IP_Address`, `URL_Length`, `Shortining_Service`, `having_At_Symbol`, `double_slash_redirecting`, `Prefix_Suffix`, `having_Sub_Domain`, `SSLfinal_State`, `Domain_registeration_length`, `Favicon`, `port`, `HTTPS_token`, `Request_URL`, `URL_of_Anchor`, `Links_in_tags`, `SFH`, `Submitting_to_email`, `Abnormal_URL`, `Redirect`, `on_mouseover`, `RightClick`, `popUpWidnow`, `Iframe`, `age_of_domain`, `DNSRecord`, `web_traffic`, `Page_Rank`, `Google_Index`, `Links_pointing_to_page`, `Statistical_report`

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/train` | GET | Runs the full training pipeline |
| `/api/predict` | POST | Accepts a CSV (multipart/form-data), returns predictions |

**Predict response includes:** `row_count`, `phishing_count`, `legitimate_count`, `rows`

---

## 📁 Project Structure
PhishWatch/
├── backend/
│ ├── app.py
│ ├── requirements.txt
│ └── networksecurity/
│ ├── components/
│ ├── entity/
│ ├── exception/
│ ├── logging/
│ ├── pipeline/
│ └── utils/
├── frontend/
│ ├── src/
│ │ ├── App.jsx
│ │ ├── main.jsx
│ │ └── style.css
│ └── package.json
├── data/
├── Dockerfile
└── README.md
---

## 🛠️ Tech Stack

**ML:** Python, Pandas, NumPy, Scikit-learn
**Backend:** FastAPI, REST APIs
**Frontend:** React.js, Vite, JavaScript, HTML/CSS
**Database:** MongoDB
**MLOps:** MLflow, Docker
**Cloud:** AWS

---

## 🌐 Live Demo

🔗 http://56.228.25.119/

---

## ⚙️ Installation

### Backend
```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker
```bash
docker build -t phishwatch .
docker run -p 8000:8000 phishwatch
```

---

## ⚠️ Scope & Limitations

- Works on **pre-extracted** website features — does not crawl raw URLs automatically (yet).
- Predictions depend on training data quality; novel phishing techniques may not be caught.
- Not a safety guarantee — a "Legitimate" result should not be treated as proof a site is safe, and "Phishing" results warrant further investigation.

---

## 🔮 Future Scope

- Automatic feature extraction from raw URLs
- Real-time detection & browser extension
- Explainable AI (why a site was flagged)
- Continuous monitoring & automated retraining

---

## 👩‍💻 Author

**Shivani Pathak**
B.Tech Computer Science / Computer Engineering Student
Interested in AI, ML, MLOps, Cybersecurity, and Full-Stack Development
