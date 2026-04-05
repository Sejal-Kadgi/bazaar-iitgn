"use client";

import { useState } from "react";
import { X, IndianRupee, Tag } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function MakeOfferModal({
  isOpen,
  onClose,
  listing,
  onOfferSuccess,
}) {
  const [offerPrice, setOfferPrice] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !listing) return null;

  const handleSubmit = async () => {
    const buyerEmail = localStorage.getItem("userEmail");

    if (!buyerEmail) {
      alert("Please login first");
      return;
    }

    const currentStatus = (listing.status || "available").toLowerCase();

    if (currentStatus !== "available") {
      alert(
        currentStatus === "reserved"
          ? "This item is currently reserved and cannot accept offers."
          : "This item has already been sold."
      );
      return;
    }

    if (!offerPrice || Number(offerPrice) <= 0) {
      alert("Please enter a valid offer price");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/offers/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listing_id: listing._id || listing.id,
          buyer_email: buyerEmail,
          offer_price: Number(offerPrice),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Offer create error:", data);

        const errorMessage =
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.detail)
            ? data.detail.map((err) => `${err.loc?.join(" → ")}: ${err.msg}`).join("\n")
            : JSON.stringify(data);

        alert(errorMessage || "Failed to create offer");
        return;
      }

      alert("Offer sent successfully 🎉");
      setOfferPrice("");
      onClose();

      if (onOfferSuccess) {
        onOfferSuccess(data.offer);
      }
    } catch (error) {
      console.error("Error creating offer:", error);
      alert("Something went wrong while sending the offer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Make an Offer</h2>
            <p className="text-sm text-slate-500 mt-1">
              Negotiate directly with the seller
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        <div className="px-6 py-5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 flex-shrink-0">
              <img
                src={listing.images?.[0] || "/placeholder.png"}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 line-clamp-2">
                {listing.title}
              </h3>

              <div className="mt-2 flex items-center gap-2 text-slate-600 text-sm">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>{listing.category || "General"}</span>
              </div>

              <div className="mt-2 flex items-center gap-1 text-blue-700 font-bold text-lg">
                <IndianRupee className="w-4 h-4" />
                {listing.price}
              </div>

              <div className="mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    (listing.status || "available").toLowerCase() === "available"
                      ? "bg-emerald-100 text-emerald-700"
                      : (listing.status || "available").toLowerCase() === "reserved"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {(listing.status || "available").charAt(0).toUpperCase() +
                    (listing.status || "available").slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Your Offer Price
          </label>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
              ₹
            </span>
            <input
              type="number"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              placeholder="Enter your offer"
              disabled={(listing.status || "available").toLowerCase() !== "available"}
              className="w-full pl-9 pr-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>

          <p className="text-xs text-slate-500 mt-2">
            Listed price: ₹{listing.price}. The seller can accept, reject, or counter your offer.
          </p>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || (listing.status || "available").toLowerCase() !== "available"}
            className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Offer"}
          </button>
        </div>
      </div>
    </div>
  );
}