"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import {
  ShoppingBag,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Recycle,
  MapPin,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function LoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Email/Password Login
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "Login failed");
        return;
      }

      // Store user info
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("userRole", data.user.role);

      // Redirect to home
      window.location.href = "/home";
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed");
    }
  };

  // Google Login with IITGN domain check + backend role sync
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = (user.email || "").toLowerCase().trim();

      // Allow ONLY verified IITGN emails
      if (!user.emailVerified || !email.endsWith("@iitgn.ac.in")) {
        await signOut(auth);
        alert("Only verified IITGN email accounts are allowed.");
        return;
      }

      // Sync user to backend and get correct role
      try {
        const res = await fetch(`${API_BASE}/auth/firebase-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: user.displayName || "",
            email: email,
            photo: user.photoURL || "",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.detail || "Firebase login failed");
          return;
        }

        // Store user info locally
        localStorage.setItem("userEmail", data.user.email);
        localStorage.setItem("userRole", data.user.role);
      } catch (backendErr) {
        console.error("Backend sync failed:", backendErr);
        alert("Backend sync failed");
        return;
      }

      // Redirect to home
      router.push("/home");
    } catch (error) {
      console.error("Google Sign In error:", error);
      alert(error.message || "Google Sign In failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Section */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 via-blue-500 to-emerald-500 text-white p-12 flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center gap-3 text-2xl font-bold">
            <ShoppingBag className="w-8 h-8" />
            <span>Bazaar@IITGN</span>
          </Link>

          <div className="mt-20">
            <h1 className="text-5xl font-bold leading-tight">
              Welcome back to your campus marketplace
            </h1>
            <p className="mt-6 text-lg text-blue-100 max-w-lg">
              Buy, sell, and exchange essentials within the IITGN community —
              from books and cycles to electronics and hostel items.
            </p>

            <div className="mt-10 space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5" />
                <span>Verified IITGN student community</span>
              </div>
              <div className="flex items-center gap-3">
                <Recycle className="w-5 h-5" />
                <span>Promoting sustainable campus reuse</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5" />
                <span>Easy hostel-based pickup and exchange</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-blue-100">
          Built for IITGN students • Smart, trusted, community exchange
        </p>
      </div>

      {/* Right Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-3 text-2xl font-bold text-slate-900">
              <ShoppingBag className="w-8 h-8 text-blue-600" />
              <span>Bazaar@IITGN</span>
            </Link>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Log in</h2>
              <p className="text-slate-500 mt-2">
                Access your IITGN community exchange account
              </p>
            </div>

            {/* GOOGLE BUTTON - black text + simple G logo */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-2xl py-3 font-medium text-black hover:bg-slate-50 transition"
            >
              <span className="text-xl font-bold">
                <span className="text-blue-500">G</span>
              </span>
              Continue with Google
            </button>

            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="px-3 text-sm text-slate-400">OR</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  IITGN Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 text-black placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 text-black placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* LOGIN BUTTON - original white text */}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white rounded-2xl py-3 font-semibold flex items-center justify-center gap-2"
              >
                Log In
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/login" className="text-blue-600 font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}