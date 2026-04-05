"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  Bell,
  LogOut,
  Pencil,
  Package,
  Heart,
  Tag,
  Star,
  Trophy,
  CheckCircle2,
  X,
} from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";

export default function ProfilePage() {
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("user");

  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: "",
    hostel: "",
    verified: false,
  });

  const [stats, setStats] = useState({
    listings: 0,
    offers: 0,
    watchlist: 0,
  });

  const [karma, setKarma] = useState({
    score: 0,
    trust_label: "New Seller",
    account_age_days: 0,
    successful_trades: 0,
  });

  // NEW: Edit profile modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // NEW: Edit form state
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    hostel: "",
  });

  useEffect(() => {
    const savedEmail = localStorage.getItem("userEmail");
    const savedRole = localStorage.getItem("userRole");

    if (savedEmail) {
      setUserEmail(savedEmail);
      fetchProfileData(savedEmail);
    }

    if (savedRole) setUserRole(savedRole);
  }, []);

  const fetchProfileData = async (email) => {
    try {
      const res = await fetch(`${API_BASE}/user/profile/${email}`);
      if (!res.ok) return;

      const data = await res.json();

      setUserEmail(data.email || email);
      setUserRole(data.role || localStorage.getItem("userRole") || "user");

      setProfileData({
        full_name: data.full_name || "",
        phone: data.phone || "",
        hostel: data.hostel || "",
        verified: data.verified || false,
      });

      setStats({
        listings: data?.stats?.listings || 0,
        offers: data?.stats?.offers || 0,
        watchlist: data?.stats?.watchlist || 0,
      });

      setKarma({
        score: data?.karma?.score || 0,
        trust_label: data?.karma?.trust_label || "New Seller",
        account_age_days: data?.karma?.account_age_days || 0,
        successful_trades: data?.karma?.successful_trades || 0,
      });
    } catch (error) {
      console.error("Error fetching profile data:", error);
    }
  };

  // NEW: Open modal and prefill current values
  const handleOpenEdit = () => {
    setEditForm({
      full_name: profileData.full_name || "",
      phone: profileData.phone || "",
      hostel: profileData.hostel || "",
    });
    setIsEditOpen(true);
  };

  // NEW: Handle input changes
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // NEW: Save profile changes
  const handleSaveProfile = async () => {
    if (!userEmail) {
      alert("User email not found");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch(`${API_BASE}/user/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          full_name: editForm.full_name,
          phone: editForm.phone,
          hostel: editForm.hostel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "Failed to update profile");
        setIsSaving(false);
        return;
      }

      // Update UI instantly
      setProfileData((prev) => ({
        ...prev,
        full_name: editForm.full_name,
        phone: editForm.phone,
        hostel: editForm.hostel,
      }));

      alert("Profile updated successfully!");
      setIsEditOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Something went wrong while updating profile");
    }

    setIsSaving(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    alert("Logged out successfully");
    window.location.href = "/login";
  };

  const getKarmaColor = (score) => {
    if (score <= 30) {
      return {
        bg: "from-slate-500 to-slate-700",
        text: "text-slate-700",
        badge: "bg-slate-100 text-slate-700",
        progress: "bg-slate-500",
      };
    }
    if (score <= 60) {
      return {
        bg: "from-blue-500 to-indigo-600",
        text: "text-blue-700",
        badge: "bg-blue-100 text-blue-700",
        progress: "bg-blue-500",
      };
    }
    if (score <= 85) {
      return {
        bg: "from-emerald-500 to-green-600",
        text: "text-emerald-700",
        badge: "bg-emerald-100 text-emerald-700",
        progress: "bg-emerald-500",
      };
    }
    return {
      bg: "from-amber-400 to-orange-500",
      text: "text-amber-700",
      badge: "bg-amber-100 text-amber-700",
      progress: "bg-amber-500",
    };
  };

  const karmaStyle = getKarmaColor(karma.score);

  const getAccountAgeText = (days) => {
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? "s" : ""}`;
    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? "s" : ""}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/home"
            className="flex items-center gap-3 text-2xl font-bold text-slate-900"
          >
            <ShoppingBag className="w-8 h-8 text-blue-600" />
            <span>Bazaar@IITGN</span>
          </Link>

          <Link
            href="/home"
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Profile Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-10 h-10 text-blue-600" />
              </div>

              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {profileData.full_name || (userEmail ? userEmail.split("@")[0] : "IITGN User")}
                </h1>
                <p className="text-slate-500 mt-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {userEmail || "user@iitgn.ac.in"}
                </p>

                <div className="mt-3 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    {profileData.verified ? "Verified IITGN User" : "User"}
                  </span>

                  <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
                    Role: {userRole}
                  </span>
                </div>
              </div>
            </div>

            {/* UPDATED: Edit button now works */}
            <button
              onClick={handleOpenEdit}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium transition"
            >
              <Pencil className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Karma Score Card */}
        <div className={`mt-8 rounded-3xl shadow-sm border border-slate-200 overflow-hidden bg-gradient-to-r ${karmaStyle.bg}`}>
          <div className="p-6 md:p-8 text-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Star className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium">Trust & Reputation</p>
                    <h2 className="text-2xl md:text-3xl font-bold">Karma Score</h2>
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <span className="text-5xl md:text-6xl font-extrabold">{karma.score}</span>
                  <span className="text-xl md:text-2xl font-semibold text-white/80 mb-2">/100</span>
                </div>

                <div className="mt-3 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm">
                  <Trophy className="w-4 h-4" />
                  {karma.trust_label}
                </div>
              </div>

              <div className="bg-white/15 backdrop-blur-md rounded-3xl p-5 w-full lg:w-[360px] border border-white/20">
                <p className="text-sm font-medium text-white/80 mb-3">How your score is built</p>

                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-white"
                    style={{ width: `${Math.min(karma.score, 100)}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-5 text-sm">
                  <div className="bg-white/10 rounded-2xl p-3">
                    <p className="text-white/70">Account Age</p>
                    <p className="font-bold text-lg mt-1">{getAccountAgeText(karma.account_age_days)}</p>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-3">
                    <p className="text-white/70">Successful Trades</p>
                    <p className="font-bold text-lg mt-1">{karma.successful_trades}</p>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-3">
                    <p className="text-white/70">Verification</p>
                    <p className="font-bold text-lg mt-1">{profileData.verified ? "Verified" : "Pending"}</p>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-3">
                    <p className="text-white/70">Trust Tier</p>
                    <p className="font-bold text-lg mt-1">{karma.trust_label}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details + Stats */}
        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          {/* Personal Info */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-5">Profile Information</h2>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Full Name</p>
                <p className="font-semibold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  {profileData.full_name || (userEmail ? userEmail.split("@")[0] : "IITGN User")}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Email</p>
                <p className="font-semibold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  {userEmail || "user@iitgn.ac.in"}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Phone</p>
                <p className="font-semibold text-slate-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  {profileData.phone || "+91 98765 43210"}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Hostel / Pickup Area</p>
                <p className="font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  {profileData.hostel || "A-Block Hostel"}
                </p>
              </div>
            </div>

            {/* Badges */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Trust Badges</h3>
              <div className="flex flex-wrap gap-3">
                {profileData.verified && (
                  <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Verified Seller
                  </span>
                )}

                {karma.successful_trades >= 3 && (
                  <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
                    <Trophy className="w-4 h-4" />
                    Top Trader
                  </span>
                )}

                {karma.score >= 70 && (
                  <span className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-medium">
                    <Star className="w-4 h-4" />
                    Highly Trusted
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-5">Quick Stats</h2>

            <div className="space-y-4">
              <div className="bg-blue-50 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-slate-800">Listings Posted</span>
                </div>
                <span className="font-bold text-blue-700">{stats.listings}</span>
              </div>

              <div className="bg-pink-50 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-pink-600" />
                  <span className="font-medium text-slate-800">Saved Items</span>
                </div>
                <span className="font-bold text-pink-700">{stats.watchlist}</span>
              </div>

              <div className="bg-amber-50 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Tag className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-slate-800">Active Offers</span>
                </div>
                <span className="font-bold text-amber-700">{stats.offers}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences + Actions */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {/* Notifications */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-5">Notification Preferences</h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-slate-800">Price Drop Alerts</span>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </label>

              <label className="flex items-center justify-between bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-slate-800">Offer Updates</span>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </label>

              <label className="flex items-center justify-between bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-slate-800">Listing Status Changes</span>
                </div>
                <input type="checkbox" className="w-5 h-5" />
              </label>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-5">Account Actions</h2>

            <div className="space-y-4">
              <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-2xl font-medium transition">
                Change Password
              </button>

              <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-2xl font-medium transition">
                Manage Pickup Preferences
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl font-semibold transition"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* NEW: Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-900"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Edit Profile</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={editForm.full_name}
                  onChange={handleEditInputChange}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-slate-400 bg-white"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditInputChange}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-slate-400 bg-white"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hostel / Pickup Area
                </label>
                <input
                  type="text"
                  name="hostel"
                  value={editForm.hostel}
                  onChange={handleEditInputChange}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-slate-400 bg-white"
                  placeholder="Enter hostel / pickup area"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsEditOpen(false)}
                className="flex-1 border border-slate-300 rounded-xl py-3 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}