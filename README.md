# BPUT-Hackathon-2025

# 🧠 LearnAI  
### An AI-powered personalized learning assistant for students and teachers.

---

## 🚀 Overview
*LearnAI* is a web-based personalized AI learning platform designed to make education smarter and adaptive.  
It provides a dual-dashboard system for students and teachers, integrating AI-driven chat support, quizzes, and real-time progress tracking.

---

## 👥 Team
*Team Unite*

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|---------------|
| *Frontend* | React, Vite, TailwindCSS, React Router |
| *Backend* | Node.js, Express.js, Socket.io |
| *Database* | MongoDB |
| *AI Engine* | Gemini / OpenAI (RAG-based response system) |
| *Authentication* | JWT (JSON Web Tokens) |
| *Hosting* | Vercel (Frontend), Render (Backend) |

---

## ✨ Features

- 👩‍🎓 *Student Dashboard* – Personalized AI chat, notes, and quiz generation.  
- 👨‍🏫 *Teacher Dashboard* – Monitor student progress and assign quizzes.  
- 🔒 *JWT Authentication* – Secure login with token-based session management.  
- 💬 *AI Chat with RAG* – Context-based responses using Retrieval-Augmented Generation.  
- 🧩 *Quiz Generator* – Create questions from provided notes or topics.  
- 📊 *Progress Tracking* – Real-time analytics for user learning journey.  
- 📱 *Responsive Design* – Fully optimized for all screen sizes.

---

## 🧭 Future Enhancements

- 🎙 Voice-based AI tutoring  
- 🕹 Gamified learning modules  
- 📱 Mobile app version  
- 🎥 Real-time classroom (WebRTC-based)  
- 📈 Institutional analytics and reporting  

---

## 🏗 Project Structure

LearnAI/ ├── frontend/ │   ├── src/ │   │   ├── components/ │   │   ├── pages/ │   │   ├── assets/ │   │   ├── App.jsx │   │   └── main.jsx │   └── package.json ├── backend/ │   ├── src/ │   │   ├── config/ │   │   ├── routes/ │   │   ├── controllers/ │   │   └── server.js │   └── package.json └── README.md

---

## ⚙ Quick Start

### *1️⃣ Clone the Repository*
```bash
git clone https://github.com/team-unite/learnai.git
cd learnai

2️⃣ Setup Backend

cd backend
npm install
# create .env file with:
# PORT=5000
# MONGO_URI=your_mongodb_connection
# JWT_SECRET=your_secret_key
# AI_API_KEY=your_gemini_or_openai_key
npm start

3️⃣ Setup Frontend

cd ../frontend
npm install
npm run dev

4️⃣ Access the App

Visit → http://localhost:5173


---

🧩 Architecture Overview

Frontend (React + Vite)
       ↓ REST / Socket.io
Backend (Node + Express)
       ↓
Database (MongoDB)
       ↓
AI APIs (Gemini / OpenAI)


---

🖼 Screenshots (Add Later)

Landing Page

Student Dashboard

Teacher Dashboard

AI Chat Interface

Quiz Section

Progress Tracker


(Place your images in /frontend/public/screenshots and update paths here.)


---

🧱 Badges

     


---

💡 Vision

> Empower learners and educators through intelligent, accessible, and personalized learning experiences.




---

📜 License

This project is open-source and maintained by Team Unite.

---
