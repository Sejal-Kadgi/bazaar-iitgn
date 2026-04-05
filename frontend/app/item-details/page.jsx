"use client";

import MakeOfferModal from "../../components/MakeOfferModal";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  ArrowLeft,
  Heart,
  MessageCircle,
  IndianRupee,
  MapPin,
  User,
  ShieldCheck,
  Clock3,
  Tag,
  CheckCircle2,
  XCircle,
  Star,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function ItemDetailsPage() {
  const router = useRouter();

  const [listingId, setListingId] = useState("");
  const [listing, setListing] = useState(null);
  const [seller, setSeller] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState("");
  const [showOfferModal, setShowOfferModal] = useState(false);

  const [myOffer, setMyOffer] = useState(null);

  // Buyer-only review flow
  const [transactionId, setTransactionId] = useState(null);
  const [buyerReviewed, setBuyerReviewed] = useState(false);

  // Review modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Seller reviews display
  const [sellerReviews, setSellerReviews] = useState([]);
  const [sellerRating, setSellerRating] = useState(0);
  const [sellerReviewsCount, setSellerReviewsCount] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      const email = localStorage.getItem("userEmail") || "";

      setListingId(id || "");
      setUserEmail(email);

      if (id) {
        fetchListingDetails(id, email);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const fetchListingDetails = async (id, email) => {
    try {
      const listingRes = await fetch(`${API_BASE}/listings/${id}`);
      if (!listingRes.ok) throw new Error("Failed to fetch listing");

      const listingData = await listingRes.json();
      setListing(listingData);

      if (listingData.images && listingData.images.length > 0) {
        setSelectedImage(listingData.images[0]);
      }

      const sellerRes = await fetch(
        `${API_BASE}/user/profile/${encodeURIComponent(listingData.owner_email)}`
      );
      if (sellerRes.ok) {
        const sellerData = await sellerRes.json();
        setSeller(sellerData);
      }

      // Fetch seller reviews
      const reviewsRes = await fetch(
        `${API_BASE}/reviews/user/${encodeURIComponent(listingData.owner_email)}`
      );

      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        const reviewsList = reviewsData.reviews || [];
        setSellerReviews(reviewsList.slice(0, 3));
        setSellerReviewsCount(reviewsData.count || 0);

        if (reviewsList.length > 0) {
          const avg =
            reviewsList.reduce((sum, r) => sum + (r.rating || 0), 0) /
            reviewsList.length;
          setSellerRating(Number(avg.toFixed(1)));
        } else {
          setSellerRating(0);
        }
      } else {
        setSellerReviews([]);
        setSellerReviewsCount(0);
        setSellerRating(0);
      }

      if (email) {
        const watchlistRes = await fetch(
          `${API_BASE}/watchlist/${encodeURIComponent(email)}`
        );

        if (watchlistRes.ok) {
          const watchlistData = await watchlistRes.json();

          const alreadySaved = watchlistData.some(
            (item) => (item.id || item._id) === id
          );
          setIsSaved(alreadySaved);
        }

        const offersRes = await fetch(
          `${API_BASE}/offers/buyer/${encodeURIComponent(email)}`
        );

        if (offersRes.ok) {
          const offersData = await offersRes.json();

          const matchedOffer = offersData.find((offer) => offer.listing_id === id);

          if (matchedOffer) {
            setMyOffer(matchedOffer);

            if ((matchedOffer.status || "").toLowerCase() === "completed") {
              try {
                const txRes = await fetch(
                  `${API_BASE}/transactions/by-offer/${matchedOffer.id}`
                );

                if (txRes.ok) {
                  const txData = await txRes.json();
                  setTransactionId(txData.id);
                  setBuyerReviewed(txData.buyer_reviewed || false);
                } else {
                  setTransactionId(null);
                  setBuyerReviewed(false);
                }
              } catch (err) {
                console.error("Error fetching transaction:", err);
                setTransactionId(null);
                setBuyerReviewed(false);
              }
            } else {
              setTransactionId(null);
              setBuyerReviewed(false);
            }
          } else {
            setMyOffer(null);
            setTransactionId(null);
            setBuyerReviewed(false);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching item details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSave = async () => {
    if (!userEmail) {
      alert("Please login first");
      return;
    }

    try {
      if (isSaved) {
        const res = await fetch(
          `${API_BASE}/watchlist/remove?user_email=${encodeURIComponent(
          userEmail
        )}&listing_id=${encodeURIComponent(listingId)}`,
        {
          method: "DELETE",
        }
      );

        const data = await res.json();

        if (res.ok) {
          setIsSaved(false);
        } else {
          alert(data.detail || "Failed to remove from watchlist");
        }
      } else {
        const res = await fetch(`${API_BASE}/watchlist/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_email: userEmail,
            listing_id: listingId,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setIsSaved(true);
        } else {
          alert(data.detail || "Failed to save item");
        }
      }
    } catch (error) {
      console.error("Error toggling watchlist:", error);
      alert("Error updating watchlist");
    }
  };

  const handleMakeOffer = () => {
    if (!userEmail) {
      alert("Please login first");
      return;
    }

    if (!listing) return;

    const currentStatus = (listing.status || "available").toLowerCase();

    if (currentStatus !== "available") {
      alert(
        currentStatus === "reserved"
          ? "This item is currently reserved."
          : "This item has already been sold."
      );
      return;
    }

    if (
      myOffer &&
      ["pending", "countered", "accepted"].includes(
        (myOffer.status || "").toLowerCase()
      )
    ) {
      alert("You already have an active offer for this item.");
      return;
    }

    setShowOfferModal(true);
  };

    const handleChatSeller = async () => {
    try {
      const buyer_email = userEmail || localStorage.getItem("userEmail") || "";
      const seller_email = listing?.owner_email;

      if (!buyer_email) {
        alert("Please login first");
        return;
      }

      if (!seller_email) {
        alert("Seller information missing");
        return;
      }

      if (buyer_email === seller_email) {
        alert("You cannot chat with yourself for your own listing.");
        return;
      }

      const res = await fetch(`${API_BASE}/chat/conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listing_id: listingId,
          buyer_email,
          seller_email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to create conversation");
      }

      const conversationId = data.conversation._id;

      router.push(
        `/chat?conversationId=${conversationId}&sender=${encodeURIComponent(
          buyer_email
        )}&seller=${encodeURIComponent(seller_email)}`
      );
    } catch (error) {
      console.error("Error starting chat:", error);
      alert("Failed to start chat");
    }
  };

  const handleAcceptCounter = async () => {
    if (!myOffer?.id) return;

    try {
      const res = await fetch(`${API_BASE}/offers/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offer_id: myOffer.id,
          user_email: userEmail,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        fetchListingDetails(listingId, userEmail);
      } else {
        alert(data.detail || "Failed to accept counter offer");
      }
    } catch (error) {
      console.error("Error accepting counter offer:", error);
      alert("Error accepting counter offer");
    }
  };

  const handleRejectCounter = async () => {
    if (!myOffer?.id) return;

    try {
      const res = await fetch(`${API_BASE}/offers/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offer_id: myOffer.id,
          user_email: userEmail,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        fetchListingDetails(listingId, userEmail);
      } else {
        alert(data.detail || "Failed to reject counter offer");
      }
    } catch (error) {
      console.error("Error rejecting counter offer:", error);
      alert("Error rejecting counter offer");
    }
  };

  const handleReportListing = async () => {
    if (!userEmail) {
      alert("Please login first");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/reports/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reporter_email: userEmail,
          target_type: "listing",
          target_id: listingId,
          reason: "Suspicious listing",
          description: "Reported by user from item details page",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Listing reported successfully");
      } else {
        alert(data.detail || "Failed to report listing");
      }
    } catch (error) {
      console.error("Error reporting listing:", error);
      alert("Error reporting listing");
    }
  };

  const handleReportUser = async () => {
    if (!userEmail) {
      alert("Please login first");
      return;
    }

    if (!listing?.owner_email) {
      alert("Seller information not available");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/reports/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reporter_email: userEmail,
          target_type: "user",
          target_user_email: listing.owner_email,
          reason: "Non-responsive or suspicious user",
          description: "Reported by user from item details page",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("User reported successfully");
      } else {
        alert(data.detail || "Failed to report user");
      }
    } catch (error) {
      console.error("Error reporting user:", error);
      alert("Error reporting user");
    }
  };

  const handleLeaveReview = () => {
    if (!transactionId || !listing?.owner_email) {
      alert("Review is not available yet");
      return;
    }

    setReviewRating(5);
    setReviewComment("");
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!transactionId || !listing?.owner_email) {
      alert("Review is not available yet");
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      alert("Rating must be between 1 and 5");
      return;
    }

    try {
      setSubmittingReview(true);

      const res = await fetch(`${API_BASE}/reviews/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          reviewer_email: userEmail,
          reviewee_email: listing.owner_email,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Review submitted successfully");
        setShowReviewModal(false);
        fetchListingDetails(listingId, userEmail);
      } else {
        alert(data.detail || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Error submitting review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Loading item details...
          </h2>
          <p className="text-slate-500 mt-2">Fetching listing from backend.</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Item not found</h2>
          <p className="text-slate-500 mt-2">
            This listing may have been removed.
          </p>
          <Link
            href="/home"
            className="inline-block mt-5 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-medium"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const images =
    listing.images && listing.images.length > 0
      ? listing.images
      : [
          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
        ];

  const displayImage = selectedImage || images[0];

  const listingStatus = (listing.status || "available").toLowerCase();
  const isAvailable = listingStatus === "available";
  const isReserved = listingStatus === "reserved";
  const isSold = listingStatus === "sold";

  const myOfferStatus = (myOffer?.status || "").toLowerCase();

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
        <div className="mb-6">
          <p className="text-sm text-slate-500">Marketplace / Item Details</p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">
            {listing.title || "Untitled Item"}
          </h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <img
                src={displayImage}
                alt={listing.title}
                className="w-full h-[420px] object-cover"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {images.slice(0, 3).map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(img)}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                >
                  <img
                    src={img}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Listed Price</p>
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-6 h-6 text-blue-600" />
                    <span className="text-4xl font-bold text-slate-900">
                      {listing.price}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                    {listing.category || "Other"}
                  </span>

                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      isAvailable
                        ? "bg-emerald-100 text-emerald-700"
                        : isReserved
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {isAvailable ? "Available" : isReserved ? "Reserved" : "Sold"}
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Tag className="w-4 h-4" />
                    <span className="text-sm">Condition</span>
                  </div>
                  <p className="font-semibold text-slate-900 mt-1">
                    {listing.condition || "Good"}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">Pickup Location</span>
                  </div>
                  <p className="font-semibold text-slate-900 mt-1">
                    {listing.hostel || "Campus"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Description</h2>
              <p className="text-slate-600 leading-relaxed">
                {listing.description || "No description provided for this item."}
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Seller Information
              </h2>

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                    <User className="w-7 h-7 text-blue-600" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {seller?.full_name ||
                        listing.owner_email?.split("@")[0] ||
                        "Seller"}
                    </h3>
                    <p className="text-sm text-slate-500">{listing.owner_email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-2 rounded-full text-sm font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  Verified IITGN Seller
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <p className="text-sm text-slate-500">Response Time</p>
                  <p className="font-semibold text-slate-900 mt-1 flex items-center gap-2">
                    <Clock3 className="w-4 h-4 text-blue-600" />
                    Usually within 15 mins
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <p className="text-sm text-slate-500">Listings Posted</p>
                  <p className="font-semibold text-slate-900 mt-1">
                    {seller?.stats?.listings ?? 0} items
                  </p>
                </div>
              </div>

              {/* Seller Rating */}
              <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h3 className="font-semibold text-slate-900">Buyer Reviews</h3>
                </div>

                <p className="text-slate-700 font-medium">
                  {sellerReviewsCount > 0
                    ? `${sellerRating} / 5 rating from ${sellerReviewsCount} review${
                        sellerReviewsCount > 1 ? "s" : ""
                      }`
                    : "No reviews yet"}
                </p>

                {sellerReviews.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {sellerReviews.map((review) => (
                      <div
                        key={review.id}
                        className="bg-white border border-amber-100 rounded-2xl p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-semibold text-slate-800">
                            {review.rating}/5
                          </span>
                        </div>

                        <p className="text-sm text-slate-700">
                          {review.comment?.trim()
                            ? review.comment
                            : "Buyer left a rating without a written comment."}
                        </p>

                        <p className="text-xs text-slate-400 mt-2">
                          From: {review.reviewer_email}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {myOffer && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  My Offer Status
                </h2>

                <p className="text-slate-600">
                  Current Offer:{" "}
                  <span className="font-semibold text-slate-900">
                    ₹{myOffer.current_price ?? myOffer.offer_price ?? 0}
                  </span>
                </p>

                <p className="text-slate-600 mt-2">
                  Status:{" "}
                  <span className="font-semibold text-slate-900 capitalize">
                    {myOffer.status}
                  </span>
                </p>

                {myOfferStatus === "countered" && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    <button
                      onClick={handleAcceptCounter}
                      className="flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl font-medium transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Accept Counter
                    </button>

                    <button
                      onClick={handleRejectCounter}
                      className="flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-3 rounded-2xl font-medium transition"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Counter
                    </button>
                  </div>
                )}

                {myOfferStatus === "pending" && (
                  <p className="text-amber-700 mt-4 font-medium">
                    Waiting for seller response.
                  </p>
                )}

                {myOfferStatus === "accepted" && (
                  <p className="text-emerald-700 mt-4 font-medium">
                    Your offer has been accepted.
                  </p>
                )}

                {myOfferStatus === "rejected" && (
                  <p className="text-red-700 mt-4 font-medium">
                    Your offer was rejected.
                  </p>
                )}

                {myOfferStatus === "completed" && (
                  <div className="mt-4">
                    <p className="text-purple-700 font-medium">
                      Trade completed successfully.
                    </p>

                    {!buyerReviewed && transactionId && (
                      <button
                        onClick={handleLeaveReview}
                        className="mt-4 flex items-center justify-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-3 rounded-2xl font-medium transition"
                      >
                        <Star className="w-4 h-4" />
                        Leave Review
                      </button>
                    )}

                    {buyerReviewed && (
                      <p className="text-emerald-700 mt-4 font-medium">
                        You have already reviewed this seller.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-4">
              <button
                onClick={handleToggleSave}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium py-4 rounded-2xl transition"
              >
                <Heart
                  className={`w-5 h-5 ${
                    isSaved ? "fill-red-500 text-red-500" : ""
                  }`}
                />
                {isSaved ? "Saved" : "Save"}
              </button>

              <button
                onClick={handleMakeOffer}
                disabled={
                  !isAvailable ||
                  (myOffer &&
                    ["pending", "countered", "accepted"].includes(myOfferStatus))
                }
                className={`font-semibold py-4 rounded-2xl transition ${
                  isAvailable &&
                  !(
                    myOffer &&
                    ["pending", "countered", "accepted"].includes(myOfferStatus)
                  )
                    ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                    : isReserved
                    ? "bg-amber-100 text-amber-700 cursor-not-allowed"
                    : isSold
                    ? "bg-red-100 text-red-700 cursor-not-allowed"
                    : "bg-slate-200 text-slate-700 cursor-not-allowed"
                }`}
              >
                {!isAvailable
                  ? isReserved
                    ? "Reserved"
                    : "Sold"
                  : myOffer &&
                    ["pending", "countered", "accepted"].includes(myOfferStatus)
                  ? "Offer Active"
                  : "Make Offer"}
              </button>

              <button
                onClick={handleChatSeller}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl transition"
              >
                <MessageCircle className="w-5 h-5" />
                Chat With Seller
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <button
                onClick={handleReportListing}
                className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium py-3 rounded-2xl border border-red-200 transition"
              >
                Report Listing
              </button>

              <button
                onClick={handleReportUser}
                className="flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium py-3 rounded-2xl border border-amber-200 transition"
              >
                Report Seller
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Leave a Review</h3>
            <p className="text-slate-500 mb-5">
              Rate your experience with this seller after the completed trade.
            </p>

            <div className="mb-5">
              <p className="text-sm font-medium text-slate-700 mb-3">Select Rating</p>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setReviewRating(num)}
                    className={`w-12 h-12 rounded-2xl border font-semibold transition ${
                      reviewRating === num
                        ? "bg-amber-100 border-amber-300 text-amber-700"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Comment (optional)
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                placeholder="Write a short review..."
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                disabled={submittingReview}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-2xl font-medium transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={submitReview}
                disabled={submittingReview}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-medium transition disabled:opacity-50"
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      <MakeOfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        listing={{
          ...listing,
          _id: listingId,
        }}
        onOfferSuccess={() => {
          setShowOfferModal(false);
          fetchListingDetails(listingId, userEmail);
        }}
      />
    </div>
  );
}