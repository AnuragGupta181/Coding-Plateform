<div align="center">

# 🚀 Assessment Platform

**A robust, full-stack hybrid coding and MCQ assessment platform built for online recruitment and technical evaluations.**

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)

</div>

## 📌 Overview

This platform provides a comprehensive environment for conducting technical assessments, featuring both **Multiple Choice Questions (MCQ)** and **Coding Challenges**. Built with a focus on reliability, performance, and security, it ensures a seamless candidate experience while providing administrators with powerful tools for test management and result auditing.

## ✨ Key Features

### 🛡️ Secure Proctoring & Assessment
- **Violation Tracking:** Intelligent tab-switching and blur detection with threshold limits.
- **Auto-Submission:** Global countdown timer that strictly enforces assessment duration and auto-submits tests when time expires.
- **Session Management:** Centralized authentication interceptors to handle expired tokens and log users out seamlessly.

### 📝 Hybrid Testing Modules
- **Coding Arena:** Integrated `Monaco Editor` for a rich, IDE-like code writing experience.
- **MCQ Interface:** Optimized "Save on Next Button" HTTP architecture, avoiding heavy WebSocket overhead for better scalability.
- **Seamless Navigation:** Bidirectional flow between MCQ and Coding sections for hybrid tests.

### 📊 Admin Dashboard
- **Batch Uploading:** Bulk import questions using Excel (`.xlsx`) files.
- **Result Auditing:** Cohesive, mobile-first result cards providing a detailed candidate performance view.
- **Intelligent Polling:** Optimized network performance tracking active sessions without overwhelming the server.

### 🎨 Modern & Responsive UI
- **Mobile-First Design:** Fluid, responsive layouts built with Tailwind CSS v4.
- **State Management:** Robust global state handled by Redux Toolkit.
- **Alerts & Notifications:** Real-time toast notifications for proctoring violations and system alerts.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 19 (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **State Management:** Redux Toolkit (`@reduxjs/toolkit`)
- **Code Editor:** Monaco Editor (`@monaco-editor/react`)
- **Routing:** React Router DOM v7

### Backend
- **Framework:** Node.js with Express.js
- **Database:** MongoDB (Mongoose)
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **Caching & Rate Limiting:** Redis (`ioredis`)
- **File Parsing:** Multer & SheetJS (`xlsx`) for batch question uploads
- **Email Service:** Nodemailer for OTP verification

---

## ⚙️ Local Development Setup

### Prerequisites
- Node.js (v18+)
- MongoDB (Local instance or MongoDB Atlas)
- Redis (Local instance or Upstash/Redis Cloud)

### 1. Clone the repository
```bash
git clone <repository-url>
cd coding-platform
```

### 2. Backend Setup
Navigate to the backend directory and configure the environment variables:
```bash
cd Backend
npm install
cp .env.example .env
```
Update the `Backend/.env` file with your credentials:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
CORS_ORIGIN=http://localhost:5173
REDIS_URL=redis://localhost:6379
```
Start the backend development server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal, navigate to the frontend directory, and set up environment variables:
```bash
cd frontend
npm install
cp .env.example .env
```
Update the `frontend/.env` file:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```
Start the frontend development server:
```bash
npm run dev
```

---

## 🚀 Production Deployment

### Backend Build & Run
```bash
cd Backend
npm ci --omit=dev
export NODE_ENV=production
npm start
```
*The backend exposes `GET /health` for continuous platform health checks.*

### Frontend Build
```bash
cd frontend
npm ci
npm run build
```
*Deploy the `frontend/dist` directory to any static hosting provider (Vercel, Netlify, AWS S3).*

---

## 🔐 Authentication Flow

1. **Registration:** Users create an account providing Name, Email, and Password.
2. **Verification:** An OTP is sent via email (Nodemailer) to verify the account.
3. **Login:** Standard Email/Password login issuing a secure JWT.
4. **Password Recovery:** Secure OTP-based reset flow.

---

## 📂 Project Structure Architecture

The codebase adheres to strict, clean, production-ready standards:
- **Modular Backend:** Separated `routes`, `controllers`, `services`, and `models`.
- **Custom Frontend Hooks:** Extracted complex logic (like the global countdown timer) into modular custom hooks (`/src/hooks`).
- **Reusable Components:** Clean UI components ensuring visual consistency across Admin and Candidate portals.

---

> **Note:** This project prioritizes data privacy. Test candidate data is securely handled, and anonymization principles are strictly followed in the codebase logic.
