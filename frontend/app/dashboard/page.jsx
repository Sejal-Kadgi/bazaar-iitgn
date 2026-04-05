"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  ArrowLeft,
  LayoutDashboard,
  Package,
  Tag,
  Heart,
  Bell,
  Clock3,
  Eye,
  Pencil,
  Trash2,
  IndianRupee,
  MessageCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function DashboardPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState("");

  const [myListings, setMyListings] = useState([]);
  const [sellerOffers, setSellerOffers] = useState([]); // offers on my listings
  const [buyerOffers, setBuyerOffers] = useState([]);   // offers I made
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [buyerEnquiries, setBuyerEnquiries] = useState([]);
  const [loadingEnquiries, setLoadingEnquiries] = useState(true);

  const [stats, setStats] = useState({
    listings: 0,
    sellerOffers: 0,
    buyerOffers: 0,
    watchlist: 0,
    alerts: 0,
  });

  const [counterPriceMap, setCounterPriceMap] = useState({});

  useEffect(() => {
    const savedEmail = localStorage.getItem("userEmail");
    if (savedEmail) {
      setUserEmail(savedEmail);
      fetchDashboardData(savedEmail);
      fetchBuyerEnquiries(savedEmail);
    } else {
      setLoadingEnquiries(false);
    }
  }, []);

  const fetchDashboardData = async (email) => {
    try {
      const [profileRes, listingsRes, sellerOffersRes, buyerOffersRes, watchlistRes, notificationsRes] =
        await Promise.all([
          fetch(`${API_BASE}/user/profile/${encodeURIComponent(email)}`), // keep if route exists
          fetch(`${API_BASE}/listings/my/${encodeURIComponent(email)}`),
          fetch(`${API_BASE}/offers/seller/${encodeURIComponent(email)}`),
          fetch(`${API_BASE}/offers/buyer/${encodeURIComponent(email)}`),
          fetch(`${API_BASE}/watchlist/${encodeURIComponent(email)}`),
          fetch(`${API_BASE}/notifications/${encodeURIComponent(email)}`),
        ]);

      const profileData = profileRes.ok ? await profileRes.json() : null;
      const listingsData = listingsRes.ok ? await listingsRes.json() : [];
      const sellerOffersData = sellerOffersRes.ok ? await sellerOffersRes.json() : [];
      const buyerOffersData = buyerOffersRes.ok ? await buyerOffersRes.json() : [];
      const watchlistData = watchlistRes.ok ? await watchlistRes.json() : [];
      const notificationsData = notificationsRes.ok ? await notificationsRes.json() : [];

      setMyListings(
        listingsData.map((item) => ({
          id: item.id || item._id,
          title: item.title,
          price: `₹${item.price}`,
          status: item.status
            ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
            : "Available",
        }))
      );

      setSellerOffers(
        sellerOffersData.map((offer) => ({
          id: offer.id || offer._id,
          item: offer.listing_title || `Listing ID: ${offer.listing_id}`,
          buyerEmail: offer.buyer_email,
          sellerEmail: offer.seller_email,
          listingId: offer.listing_id,
          offerAmount: offer.current_price ?? offer.offer_price ?? offer.price ?? 0,
          originalPrice: offer.original_price ?? null,
          status: offer.status
            ? offer.status.charAt(0).toUpperCase() + offer.status.slice(1)
            : "Pending",
        }))
      );

      setBuyerOffers(
        buyerOffersData.map((offer) => ({
          id: offer.id || offer._id,
          item: offer.listing_title || `Listing ID: ${offer.listing_id}`,
          sellerEmail: offer.seller_email,
          listingId: offer.listing_id,
          offerAmount: offer.current_price ?? offer.offer_price ?? offer.price ?? 0,
          originalPrice: offer.original_price ?? null,
          status: offer.status
            ? offer.status.charAt(0).toUpperCase() + offer.status.slice(1)
            : "Pending",
        }))
      );

      setWatchlistItems(
        watchlistData.map((item) => ({
          id: item.id || item._id,
          title: item.title || "Watchlisted Item",
          price: item.price ? `₹${item.price}` : "Price unavailable",
        }))
      );

      setNotifications(notificationsData);

      setStats({
        listings: profileData?.stats?.listings || listingsData.length || 0,
        sellerOffers: sellerOffersData.length || 0,
        buyerOffers: buyerOffersData.length || 0,
        watchlist: profileData?.stats?.watchlist || watchlistData.length || 0,
        alerts: notificationsData.length || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const fetchBuyerEnquiries = async (email) => {
    try {
      const res = await fetch(
        `${API_BASE}/chat/seller/${encodeURIComponent(email)}/conversations`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch buyer enquiries");
      }

      const data = await res.json();
      setBuyerEnquiries(data.conversations || []);
    } catch (error) {
      console.error("Error fetching buyer enquiries:", error);
      setBuyerEnquiries([]);
    } finally {
      setLoadingEnquiries(false);
    }
  };

  const handleReplyToBuyer = (conversation) => {
    const sellerEmail = userEmail;
    const buyerEmail = conversation.buyer_email;

    router.push(
      `/chat?conversationId=${conversation._id}&sender=${encodeURIComponent(
        sellerEmail
      )}&seller=${encodeURIComponent(buyerEmail)}`
    );
  };

  const handleViewListing = (listingId) => {
    router.push(`/item-details?id=${listingId}`);
  };

  const handleEditListing = (listingId) => {
    router.push(`/sell?edit=${listingId}`);
  };

  const handleDeleteListing = async (listingId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this listing?"
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/listings/${listingId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        setMyListings((prev) => prev.filter((item) => item.id !== listingId));
        fetchDashboardData(userEmail);
        alert("Listing deleted successfully");
      } else {
        alert(data.detail || "Failed to delete listing");
      }
    } catch (error) {
      console.error("Error deleting listing:", error);
      alert("Error deleting listing");
    }
  };

  const handleAcceptOffer = async (offerId) => {
    try {
      const res = await fetch(`${API_BASE}/offers/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offer_id: offerId,
          user_email: userEmail,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        fetchDashboardData(userEmail);
      } else {
        alert(data.detail || "Failed to accept offer");
      }
    } catch (error) {
      console.error("Error accepting offer:", error);
      alert("Error accepting offer");
    }
  };

  const handleRejectOffer = async (offerId) => {
    try {
      const res = await fetch(`${API_BASE}/offers/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offer_id: offerId,
          user_email: userEmail,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        fetchDashboardData(userEmail);
      } else {
        alert(data.detail || "Failed to reject offer");
      }
    } catch (error) {
      console.error("Error rejecting offer:", error);
      alert("Error rejecting offer");
    }
  };

  const handleCounterPriceChange = (offerId, value) => {
    setCounterPriceMap((prev) => ({
      ...prev,
      [offerId]: value,
    }));
  };

  const handleCounterOffer = async (offerId) => {
    const counterPrice = counterPriceMap[offerId];

    if (!counterPrice || Number(counterPrice) <= 0) {
      alert("Enter a valid counter price");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/offers/counter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offer_id: offerId,
          user_email: userEmail,
          counter_price: Number(counterPrice),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setCounterPriceMap((prev) => ({
          ...prev,
          [offerId]: "",
        }));
        fetchDashboardData(userEmail);
      } else {
        alert(data.detail || "Failed to send counter offer");
      }
    } catch (error) {
      console.error("Error sending counter offer:", error);
      alert("Error sending counter offer");
    }
  };

  const handleCompleteTrade = async (offerId) => {
    try {
      const res = await fetch(`${API_BASE}/offers/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offer_id: offerId,
          user_email: userEmail,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        fetchDashboardData(userEmail);
      } else {
        alert(data.detail || "Failed to complete trade");
      }
    } catch (error) {
      console.error("Error completing trade:", error);
      alert("Error completing trade");
    }
  };

  const handleRemoveWatchlist = async (listingId) => {
    try {
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
        fetchDashboardData(userEmail);
      } else {
        alert(data.detail || "Failed to remove from watchlist");
      }
    } catch (error) {
      console.error("Error removing watchlist item:", error);
      alert("Error removing from watchlist");
    }
  };

  const getStatusClass = (status) => {
    if (status === "Accepted") return "bg-emerald-100 text-emerald-700";
    if (status === "Rejected") return "bg-red-100 text-red-700";
    if (status === "Completed") return "bg-purple-100 text-purple-700";
    if (status === "Countered") return "bg-blue-100 text-blue-700";
    return "bg-amber-100 text-amber-700";
  };

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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <LayoutDashboard className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-slate-900">My Dashboard</h1>
              </div>
              <p className="text-slate-500">
                Active hub for your marketplace activity
              </p>
              <p className="text-sm text-slate-400 mt-2">
                {userEmail || "user@iitgn.ac.in"}
              </p>
            </div>

            <Link
              href="/sell"
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-semibold transition"
            >
              + Add New Listing
            </Link>
          </div>
        </div>

        <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <Package className="w-6 h-6 text-blue-600" />
              <h3 className="font-semibold text-slate-800">Items Selling</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.listings}</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <Tag className="w-6 h-6 text-amber-600" />
              <h3 className="font-semibold text-slate-800">Offers Received</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.sellerOffers}</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <Tag className="w-6 h-6 text-indigo-600" />
              <h3 className="font-semibold text-slate-800">My Offers</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.buyerOffers}</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <Heart className="w-6 h-6 text-pink-600" />
              <h3 className="font-semibold text-slate-800">Watchlist</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.watchlist}</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <Bell className="w-6 h-6 text-emerald-600" />
              <h3 className="font-semibold text-slate-800">Alerts</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.alerts}</p>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-5">Items I’m Selling</h2>

              <div className="space-y-4">
                {myListings.length > 0 ? (
                  myListings.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div>
                        <h3 className="font-semibold text-slate-900">{item.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{item.price}</p>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            item.status === "Available"
                              ? "bg-emerald-100 text-emerald-700"
                              : item.status === "Reserved"
                              ? "bg-amber-100 text-amber-700"
                              : item.status === "Sold"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {item.status}
                        </span>

                        <button
                          onClick={() => handleViewListing(item.id)}
                          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100"
                          title="View listing"
                        >
                          <Eye className="w-4 h-4 text-slate-700" />
                        </button>

                        <button
                          onClick={() => handleEditListing(item.id)}
                          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100"
                          title="Edit listing"
                        >
                          <Pencil className="w-4 h-4 text-slate-700" />
                        </button>

                        <button
                          onClick={() => handleDeleteListing(item.id)}
                          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-red-50"
                          title="Delete listing"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">No listings yet.</p>
                )}
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Buyer Enquiries</h2>
              <p className="text-slate-500 mb-5">
                Buyers who started conversations for your listings.
              </p>

              {loadingEnquiries ? (
                <p className="text-slate-500">Loading enquiries...</p>
              ) : buyerEnquiries.length > 0 ? (
                <div className="space-y-4">
                  {buyerEnquiries.map((conversation) => (
                    <div
                      key={conversation._id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          Buyer: {conversation.buyer_email}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          Listing ID: {conversation.listing_id}
                        </p>
                      </div>

                      <button
                        onClick={() => handleReplyToBuyer(conversation)}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-medium transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Reply
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No buyer enquiries yet.</p>
              )}
            </section>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-5">Offers on My Listings</h2>

              <div className="space-y-4">
                {sellerOffers.length > 0 ? (
                  sellerOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-slate-900">{offer.item}</h3>

                          <p className="text-sm text-slate-500 mt-1">
                            Buyer: {offer.buyerEmail}
                          </p>

                          <p className="text-sm text-slate-500 mt-1">
                            Listing ID: {offer.listingId}
                          </p>

                          {offer.originalPrice !== null && (
                            <p className="text-sm text-slate-500 mt-1">
                              Listed Price: ₹{offer.originalPrice}
                            </p>
                          )}

                          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                            <IndianRupee className="w-4 h-4" />
                            Offer: ₹{offer.offerAmount}
                          </p>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${getStatusClass(
                            offer.status
                          )}`}
                        >
                          {offer.status}
                        </span>
                      </div>

                      {(offer.status === "Pending" || offer.status === "Countered") && (
                        <div className="flex flex-wrap gap-3 items-center">
                          <button
                            onClick={() => handleAcceptOffer(offer.id)}
                            className="flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-2xl font-medium transition"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Accept
                          </button>

                          <button
                            onClick={() => handleRejectOffer(offer.id)}
                            className="flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-2xl font-medium transition"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>

                          <input
                            type="number"
                            min="1"
                            value={counterPriceMap[offer.id] || ""}
                            onChange={(e) =>
                              handleCounterPriceChange(offer.id, e.target.value)
                            }
                            placeholder="Counter price"
                            className="px-3 py-2 rounded-2xl border border-slate-300 bg-white text-slate-900 text-sm outline-none"
                          />

                          <button
                            onClick={() => handleCounterOffer(offer.id)}
                            className="flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-2xl font-medium transition"
                          >
                            Counter
                          </button>
                        </div>
                      )}

                      {offer.status === "Accepted" && (
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleCompleteTrade(offer.id)}
                            className="flex items-center justify-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-2xl font-medium transition"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Mark Complete
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">No offers on your listings yet.</p>
                )}
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-5">My Offers Made</h2>

              <div className="space-y-4">
                {buyerOffers.length > 0 ? (
                  buyerOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div>
                        <h3 className="font-semibold text-slate-900">{offer.item}</h3>

                        <p className="text-sm text-slate-500 mt-1">
                          Seller: {offer.sellerEmail}
                        </p>

                        {offer.originalPrice !== null && (
                          <p className="text-sm text-slate-500 mt-1">
                            Listed Price: ₹{offer.originalPrice}
                          </p>
                        )}

                        <p className="text-sm text-slate-500 mt-1">
                          Your Offer: ₹{offer.offerAmount}
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${getStatusClass(
                          offer.status
                        )}`}
                      >
                        {offer.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">You have not made any offers yet.</p>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-5">Watchlist</h2>

              <div className="space-y-4">
                {watchlistItems.length > 0 ? (
                  watchlistItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4"
                    >
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-500 mt-1 mb-3">{item.price}</p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewListing(item.id)}
                          className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-sm"
                        >
                          View
                        </button>

                        <button
                          onClick={() => handleRemoveWatchlist(item.id)}
                          className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">No watchlist items yet.</p>
                )}
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-5">
                Price-drop & Activity Alerts
              </h2>

              <div className="space-y-4">
                {notifications.length > 0 ? (
                  notifications.map((note) => (
                    <div
                      key={note.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3"
                    >
                      <Clock3 className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-700">
                          {note.message || "New activity"}
                        </p>
                        {!note.read && (
                          <p className="text-xs text-emerald-600 mt-1 font-medium">
                            New
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">No notifications yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}