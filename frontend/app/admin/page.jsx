"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  ArrowLeft,
  Shield,
  AlertTriangle,
  Trash2,
  Users,
  FileWarning,
  Eye,
  Ban,
  CheckCircle2,
  UserCheck,
  Package,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function AdminPage() {
  const [userRole, setUserRole] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");

  const [reportedListings, setReportedListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [moderationQueue, setModerationQueue] = useState([]);

  const [stats, setStats] = useState({
    reports: 0,
    listings: 0,
    users: 0,
    moderationQueue: 0,
  });

  useEffect(() => {
    const savedRole = localStorage.getItem("userRole");
    const savedEmail = localStorage.getItem("userEmail");

    setUserRole(savedRole);
    setAdminEmail(savedEmail || "");

    if (savedRole !== "admin") {
      alert("Access denied. Admins only.");
      window.location.href = "/home";
      return;
    }

    if (savedEmail) {
      fetchAdminData(savedEmail);
    }
  }, []);

  const fetchAdminData = async (email) => {
    try {
      let reportsData = [];
      let listingsData = [];
      let usersData = [];

      // FIXED: Fetch reports from reports.py
      try {
        const reportsRes = await fetch(`${API_BASE}/reports/admin/all`);
        if (reportsRes.ok) {
          const reportsJson = await reportsRes.json();
          reportsData = reportsJson.reports || [];
        }
      } catch (err) {
        console.error("Error fetching reports:", err);
      }

      // Keep existing listings route if your backend already has it
      try {
        const listingsRes = await fetch(`${API_BASE}/admin/listings?email=${email}`);
        if (listingsRes.ok) {
          listingsData = await listingsRes.json();
        }
      } catch (err) {
        console.error("Error fetching listings:", err);
      }

      // Keep existing users route if your backend already has it
      try {
        const usersRes = await fetch(`${API_BASE}/admin/users?email=${email}`);
        if (usersRes.ok) {
          usersData = await usersRes.json();
        }
      } catch (err) {
        console.error("Error fetching users (route may not exist yet):", err);
      }

      const formattedReportedListings = reportsData.map((report) => {
        const listingId = report.target_type === "listing" ? report.target_id : null;

        const matchedListing = listingId
          ? listingsData.find((listing) => listing.id === listingId)
          : null;

        return {
          id: report._id,
          listingId,
          title:
            report.target_type === "listing"
              ? matchedListing
                ? `${matchedListing.title}${matchedListing.price ? ` - ₹${matchedListing.price}` : ""}`
                : `Listing ID: ${listingId}`
              : `User Report: ${report.target_user_email}`,
          seller:
            matchedListing?.owner_email ||
            report.target_user_email ||
            "Unknown",
          reason: report.reason || "No reason provided",
          status:
            report.status === "resolved"
              ? "Resolved"
              : report.status === "reviewed"
              ? "Under Review"
              : "Reported",
          targetType: report.target_type,
        };
      });

      const formattedModerationQueue = reportsData
        .filter((report) => report.status !== "resolved")
        .map((report) => {
          const listingId = report.target_type === "listing" ? report.target_id : null;

          const matchedListing = listingId
            ? listingsData.find((listing) => listing.id === listingId)
            : null;

          return {
            id: report._id,
            title:
              report.target_type === "listing"
                ? matchedListing?.title || `Listing ID: ${listingId}`
                : `User: ${report.target_user_email}`,
            seller:
              matchedListing?.owner_email ||
              report.target_user_email ||
              "Unknown",
            action:
              report.target_type === "listing"
                ? "Review reported listing"
                : "Review reported user",
          };
        });

      const formattedUsers = usersData.map((user) => ({
        id: user.id,
        name: user.full_name || user.email.split("@")[0],
        email: user.email,
        role: user.role || "user",
        status: user.banned ? "Flagged" : "Active",
      }));

      setReportedListings(formattedReportedListings);
      setModerationQueue(formattedModerationQueue);
      setUsers(formattedUsers);

      setStats({
        reports: reportsData.length,
        listings: listingsData.length,
        users: usersData.length,
        moderationQueue: formattedModerationQueue.length,
      });
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!listingId) {
      alert("This is a user report, not a listing report.");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/admin/listing/${listingId}?email=${adminEmail}`,
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        fetchAdminData(adminEmail);
      } else {
        alert("Failed to delete listing");
      }
    } catch (error) {
      console.error("Error deleting listing:", error);
      alert("Error deleting listing");
    }
  };

  // FIXED: match reports.py route
  const handleResolveReport = async (reportId) => {
    try {
      const res = await fetch(
        `${API_BASE}/reports/admin/${reportId}?status=resolved`,
        {
          method: "PATCH",
        }
      );

      if (res.ok) {
        fetchAdminData(adminEmail);
      } else {
        alert("Failed to resolve report");
      }
    } catch (error) {
      console.error("Error resolving report:", error);
      alert("Error resolving report");
    }
  };

    const handleMarkUnderReview = async (reportId) => {
      try {
        const res = await fetch(
          `${API_BASE}/reports/admin/${reportId}?status=reviewed`,
          {
            method: "PATCH",
          }
        );

        if (res.ok) {
          fetchAdminData(adminEmail);
          alert("Marked as under review");
        } else {
          alert("Failed to mark report as under review");
        }
      } catch (error) {
        console.error("Error marking report as under review:", error);
        alert("Error updating report");
      }
    };

  const handleReview = (item) => {
    if (!item?.id) {
      alert("Report not found");
      return;
    }

    handleMarkUnderReview(item.id);
  };

  const handlePromoteUser = async (userId) => {
    try {
      const res = await fetch(
        `${API_BASE}/admin/user/promote/${userId}?email=${adminEmail}`,
        {
          method: "PUT",
        }
      );

      if (res.ok) {
        fetchAdminData(adminEmail);
      } else {
        alert("Promote user route not added yet in backend");
      }
    } catch (error) {
      console.error("Error promoting user:", error);
      alert("Promote user route not available yet");
    }
  };

  const handleFlagUser = async (userId) => {
    try {
      const res = await fetch(
        `${API_BASE}/admin/user/flag/${userId}?email=${adminEmail}`,
        {
          method: "PUT",
        }
      );

      if (res.ok) {
        fetchAdminData(adminEmail);
      } else {
        alert("Flag user route not added yet in backend");
      }
    } catch (error) {
      console.error("Error flagging user:", error);
      alert("Flag user route not available yet");
    }
  };

  if (userRole !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-blue-600 rounded-3xl p-8 text-white shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-8 h-8" />
            <h1 className="text-3xl md:text-4xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-emerald-100 text-base md:text-lg max-w-2xl">
            Monitor reports, moderate suspicious listings, and manage platform users
            to maintain trust and safety within Bazaar@IITGN.
          </p>
        </div>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <FileWarning className="w-6 h-6 text-red-500" />
              <h3 className="font-semibold text-slate-800">Reports</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.reports}</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <Package className="w-6 h-6 text-blue-600" />
              <h3 className="font-semibold text-slate-800">Total Listings</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.listings}</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-6 h-6 text-emerald-600" />
              <h3 className="font-semibold text-slate-800">Users</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.users}</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h3 className="font-semibold text-slate-800">Moderation Queue</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.moderationQueue}</p>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-5">
                Reported Listings / Users
              </h2>

              <div className="space-y-4">
                {reportedListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {listing.title}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          Target: {listing.seller}
                        </p>
                        <p className="text-sm text-red-500 mt-2">
                          Reason: {listing.reason}
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          listing.status === "Resolved"
                            ? "bg-emerald-100 text-emerald-700"
                            : listing.status === "Under Review"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {listing.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-4 flex-wrap">
                      <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100">
                        <Eye className="w-4 h-4" />
                        View
                      </button>

                      {listing.targetType === "listing" && listing.listingId && (
                        <button
                          onClick={() => handleDeleteListing(listing.listingId)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Listing
                        </button>
                      )}

                      <button
                        onClick={() => handleResolveReport(listing.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-5">
                Moderation Queue
              </h2>

              <div className="space-y-4">
                {moderationQueue.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Target: {item.seller}
                      </p>
                      <p className="text-sm text-amber-600 mt-1">
                        Action: {item.action}
                      </p>
                    </div>

                    <button
                    onClick={() => handleReview(item)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition">
                      Review
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-5">
                Manage Users
              </h2>

              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{user.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{user.email}</p>
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {user.role}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user.status === "Active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {user.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4 flex-wrap">
                      <button
                        onClick={() => handlePromoteUser(user.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100"
                      >
                        <UserCheck className="w-4 h-4" />
                        Promote
                      </button>

                      <button
                        onClick={() => handleFlagUser(user.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                      >
                        <Ban className="w-4 h-4" />
                        Flag
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}