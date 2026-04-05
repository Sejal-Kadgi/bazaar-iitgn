"use client";
import { useState } from "react";

export default function ReviewForm({ listingId, reviewerEmail, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const submitReview = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/reviews/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listing_id: listingId,
          reviewer_email: reviewerEmail,
          rating,
          comment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "Failed to submit review");
      } else {
        alert("Review submitted successfully!");
        setComment("");
        setRating(5);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error("Review error:", error);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow border mt-3">
      <h3 className="text-lg font-semibold text-black mb-3">Leave a Review</h3>

      <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
      <select
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
        className="w-full border rounded px-3 py-2 mb-3 text-black"
      >
        <option value={5}>5 - Excellent</option>
        <option value={4}>4 - Good</option>
        <option value={3}>3 - Okay</option>
        <option value={2}>2 - Poor</option>
        <option value={1}>1 - Bad</option>
      </select>

      <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write your feedback..."
        className="w-full border rounded px-3 py-2 mb-3 text-black"
        rows={3}
      />

      <button
        onClick={submitReview}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        {loading ? "Submitting..." : "Submit Review"}
      </button>
    </div>
  );
}