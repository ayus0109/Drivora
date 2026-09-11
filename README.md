# Google Drive — Encrypted Cloud Storage System

A modern, production-grade cloud storage platform built with React, Node.js, Express, MongoDB Atlas, and AES-256-GCM authenticated encryption at rest. Featuring 15 GB free storage quota, Google Single Sign-On (SSO), in-browser file previewing, and public sharing links.

![Google Drive Banner](https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png)

---

## 🌟 Key Features

- **15 GB Free Cloud Storage**: Each user receives standard 15 GB cloud quota with real-time millisecond usage synchronization.
- **Google Single Sign-On (SSO)**: Interactive Google Account Chooser dialog with instant 1-tap sign-in and Just-In-Time (JIT) provisioning.
- **AES-256-GCM Cryptographic Vault**: Every uploaded file is encrypted in-memory before writing to disk using a 256-bit symmetric cipher key, random 96-bit IV, and 128-bit authentication tag.
- **In-Browser File Preview**: Preview PDFs, high-res images, text/code, and stream audio/video directly in the browser without downloading.
- **Hierarchical Folder Architecture**: Infinite nested folder creation, breadcrumb path navigation, and recursive cascading folder deletion.
- **Secure Public Link Sharing**: 128-bit high-entropy public share links with view/download counters and instant 1-click revocation.
- **Password Autofill Privacy Guard**: Advanced security prevents shoulder-surfing and unauthorized password unmasking on shared devices.
- **Mobile Responsive Design**: Touch-optimized interface following Kisan Saathi typography and layout standards with slide-out navigation drawer and mobile action button.
- **Academic Architecture & Viva Defense Modal**: Built-in examiner guide covering system architecture, cipher mechanics, and common viva questions.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Axios, React Router v6
- **Backend**: Node.js, Express.js, Multer (Memory Storage)
- **Database**: MongoDB Atlas (Mongoose ODM with atomic `$inc` operators)
- **Security**: AES-256-GCM, Bcryptjs (10 rounds), JWT Authentication, Anti-Caching Headers
- **Storage**: Dual-engine storage abstraction (Local Encrypted Vault + Firebase Cloud Storage fallback)

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas cluster connection URI

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/ayus0109/google-drive.git
cd google-drive

# Install all dependencies (backend + frontend)
npm install --prefix backend
npm install --prefix frontend
```

### 3. Environment Configuration
Create a `.env` file in the `backend/` directory (refer to `.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
```

### 4. Running the App
In separate terminals:
```bash
# Start Backend API (Port 5000)
cd backend && npm run dev

# Start Frontend Dev Server (Port 5173)
cd frontend && npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🌐 Deployment to Render

This repository is pre-configured with `render.yaml` for a **1-click unified full-stack deployment** on Render's free tier.

### Step-by-Step Deployment Guide:
1. Push this repository to your GitHub account:
   ```bash
   git remote add origin https://github.com/ayus0109/google-drive.git
   git branch -M main
   git push -u origin main
   ```
2. Log in to [Render.com](https://render.com).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository (`google-drive`).
5. Configure the Web Service settings:
   - **Name**: `google-drive`
   - **Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
6. Add your Environment Variables:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = `your_mongodb_connection_string`
   - `JWT_SECRET` = `your_secure_random_string`
7. Click **Create Web Service**.
8. In MongoDB Atlas, ensure **Network Access** includes `0.0.0.0/0` (Allow access from anywhere) so Render's cloud servers can connect.

---

## 📄 License
ISC License © 2026 Ayush Phalak
