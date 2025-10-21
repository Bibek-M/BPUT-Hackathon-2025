import React from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const clearStorage = () => {
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex flex-col font-inter text-gray-800">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-10 py-5 bg-white shadow-md">
        <div className="text-2xl font-bold text-indigo-600">LearnAI</div>
        <div className="space-x-6 hidden md:flex items-center">
          <Link to="/" className="hover:text-indigo-600">
            Home
          </Link>
          <Link to="/features" className="hover:text-indigo-600">
            Features
          </Link>
          <a
            href="https://github.com/Bibek-M/BPUT-Hackathon-2025"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://cdn-icons-png.flaticon.com/512/25/25231.png"
              alt="GitHub"
              style={{ width: "35px", height: "35px", cursor: "pointer" }}
            />
          </a>
          <button
            onClick={() =>
              document
                .getElementById("about")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="hover:text-indigo-600"
          >
            About
          </button>

          <Link to="/auth/login">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
              Login
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-between px-10 md:px-20 py-16 bg-gradient-to-br from-indigo-50 to-blue-100">
        <div className="flex-1 space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight text-gray-900">
            Your Personalized{" "}
            <span className="text-indigo-600">AI Learning Assistant</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-lg">
            Learn smarter, not harder — interact with an AI tutor that explains,
            quizzes, and tracks your progress.
          </p>
          <div className="space-x-4">
            <Link to="/auth/login">
              <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition">
                Start Learning
              </button>
            </Link>
            <Link to="/auth/register">
              <button className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-600 hover:text-white transition">
                Get Started
              </button>
            </Link>
          </div>
        </div>

        <div className="flex-1 mt-10 md:mt-0 flex justify-center">
          <img
            src="/bg.png"
            alt="AI Illustration"
            className="w-3/4 max-w-md drop-shadow-lg"
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-10 md:px-20 bg-white">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Why Choose LearnAI?
        </h2>

        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              title: "Smart Explanations",
              desc: "AI explains topics using your own notes or chapters — personalized to your learning style.",
              icon: "💡",
            },
            {
              title: "Auto Quiz Generator",
              desc: "Instantly create topic-based quizzes to test your understanding and retention.",
              icon: "🧠",
            },
            {
              title: "Progress Tracking",
              desc: "Visualize your learning journey with progress charts and feedback.",
              icon: "📈",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-indigo-50 p-8 rounded-2xl text-center shadow hover:shadow-lg transition"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2 text-indigo-700">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section
        className="py-16 px-10 md:px-20 bg-gradient-to-br from-indigo-600 to-blue-500 text-white"
        id="about"
      >
        <h2 className="text-3xl font-bold mb-6">About LearnAI</h2>
        <p className="max-w-3xl text-lg">
          LearnAI is designed to revolutionize how students prepare for exams by
          combining the power of AI tutoring with personalized quizzes and
          real-time progress tracking. Built for learners who want efficiency,
          clarity, and smart feedback.
        </p>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-500 bg-white border-t">
        © {new Date().getFullYear()} LearnAI — Built with 💜 for smarter
        learning.
      </footer>
    </div>
  );
}