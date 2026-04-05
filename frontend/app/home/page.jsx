"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Search,
  Plus,
  User,
  LayoutDashboard,
  Shield,
  BookOpen,
  Laptop,
  Bike,
  FlaskConical,
  Bed,
  Dumbbell,
  Heart,
  MapPin,
  MessageCircle,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const categories = [
  { name: "Books", icon: BookOpen },
  { name: "Electronics", icon: Laptop },
  { name: "Cycles", icon: Bike },
  { name: "Lab Essentials", icon: FlaskConical },
  { name: "Hostel Gear", icon: Bed },
  { name: "Sports", icon: Dumbbell },
];

const hostels = [
  "All",
  "Aibaan",
  "Beauki",
  "Chimair",
  "Duven",
  "Emiet",
  "Firpeal",
  "Griwiksh",
  "Hiqom",
  "Ijokha",
  "Jurqia",
  "Kyzeel",
  "Lekhaag",
];

export default function HomePage() {
  const router = useRouter();

  const [userRole, setUserRole] = useState("user");
  const [userEmail, setUserEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedItems, setSavedItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedHostel, setSelectedHostel] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedRole = localStorage.getItem("userRole");
    const savedEmail = localStorage.getItem("userEmail");

    if (savedRole) {
      setUserRole(savedRole);
    }

    if (savedEmail) {
      setUserEmail(savedEmail);
      fetchWatchlist(savedEmail);
    }

    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const res = await fetch(`${API_BASE}/listings/`);
      if (!res.ok) {
        throw new Error("Failed to fetch listings");
      }

      const data = await res.json();

      const formattedListings = data.map((item, index) => ({
        id: String(item.id || item._id),
        title: item.title || "Untitled Item",
        price:
          typeof item.price === "number"
            ? `₹${item.price}`
            : item.price || "Price not available",
        category: item.category || "Other",
        hostel: item.hostel || "Campus",
        description: item.description || "",
        tags: item.tags || [],
        image:
          item.images && item.images.length > 0
            ? item.images[0]
            : "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
        owner_email: item.owner_email || "",
        rawIndex: index,
      }));

      setListings(formattedListings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlist = async (email) => {
    try {
      const res = await fetch(`${API_BASE}/user/watchlist/${email}`);
      if (!res.ok) {
        throw new Error("Failed to fetch watchlist");
      }

      const data = await res.json();

      const ids = data.map((item) => String(item.id));
      setSavedItems(ids);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      setSavedItems([]);
    }
  };

  const toggleSaveItem = async (itemId) => {
    if (!userEmail) {
      alert("Please log in to use watchlist.");
      return;
    }

    const isAlreadySaved = savedItems.includes(itemId);

    try {
      if (isAlreadySaved) {
        const res = await fetch(`${API_BASE}/watchlist/remove`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_email: userEmail,
            listing_id: itemId,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to remove from watchlist");
        }

        setSavedItems((prev) => prev.filter((id) => id !== itemId));
      } else {
        const res = await fetch(`${API_BASE}/watchlist/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_email: userEmail,
            listing_id: itemId,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to add to watchlist");
        }

        setSavedItems((prev) => [...prev, itemId]);
      }
    } catch (error) {
      console.error("Watchlist update error:", error);
    }
  };

  const handleChatSeller = async (item) => {
    try {
      const buyer_email = userEmail || localStorage.getItem("userEmail") || "";
      const seller_email = item.owner_email;

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
          listing_id: item.id,
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

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return listings.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.hostel.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.price.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query));

      const matchesCategory =
        !selectedCategory || item.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesHostel =
        selectedHostel === "All" || item.hostel.toLowerCase() === selectedHostel.toLowerCase();

      const numericPrice = parseInt(String(item.price).replace(/[^\d]/g, "")) || 0;

      const matchesMinPrice = !minPrice || numericPrice >= Number(minPrice);
      const matchesMaxPrice = !maxPrice || numericPrice <= Number(maxPrice);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesHostel &&
        matchesMinPrice &&
        matchesMaxPrice
      );
    });
  }, [listings, searchQuery, selectedCategory, selectedHostel, minPrice, maxPrice]);

  const handleCategoryClick = (categoryName) => {
    setSelectedCategory((prev) => (prev === categoryName ? "" : categoryName));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
          <Link
            href="/about"
            className="flex items-center gap-3 text-2xl font-bold text-slate-900 hover:opacity-90 transition"
          >
            <ShoppingBag className="w-8 h-8 text-blue-600" />
            <span>Bazaar@IITGN</span>
          </Link>

          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for books, cycles, electronics, hostel items..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-black placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/sell"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-semibold transition"
            >
              <Plus className="w-5 h-5" />
              <span>Sell Item</span>
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition"
            >
              <User className="w-5 h-5" />
              <span className="hidden sm:inline">Profile</span>
            </Link>

            {userRole === "admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition font-medium"
              >
                <Shield className="w-5 h-5" />
                <span className="hidden sm:inline">Admin Panel</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Banner */}
      <section className="max-w-7xl mx-auto px-4 pt-8">
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 rounded-3xl p-8 md:p-10 text-white shadow-lg">
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            Buy, Sell & Exchange within IITGN
          </h1>
          <p className="mt-4 text-blue-100 text-base md:text-lg max-w-2xl">
            A trusted student marketplace for books, electronics, cycles, lab essentials,
            hostel items, and more — built for the IITGN community.
          </p>
        </div>
      </section>

      {/* Hostel Filter */}
      <section className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900">Filter by Hostel</h2>

            <select
              value={selectedHostel}
              onChange={(e) => setSelectedHostel(e.target.value)}
              className="w-full sm:w-64 px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {hostels.map((hostel) => (
                <option key={hostel} value={hostel}>
                  {hostel}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Price Range Filter */}
      <section className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900">Filter by Price</h2>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min Price"
                className="w-full sm:w-40 px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max Price"
                className="w-full sm:w-40 px-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 pt-8">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-5">Popular Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.name;

              return (
                <button
                  key={category.name}
                  onClick={() => handleCategoryClick(category.name)}
                  className={`flex flex-col items-center justify-center gap-3 border rounded-2xl p-5 transition ${
                    isActive
                      ? "bg-blue-50 border-blue-300"
                      : "bg-slate-50 hover:bg-blue-50 border-slate-200"
                  }`}
                >
                  <Icon className="w-7 h-7 text-blue-600" />
                  <span className="text-sm font-medium text-slate-700 text-center">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="max-w-7xl mx-auto px-4 pt-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <h2 className="text-2xl font-bold text-slate-900">
            {searchQuery || selectedCategory || selectedHostel !== "All" || minPrice || maxPrice
              ? `Search Results (${filteredItems.length})`
              : "Featured Listings"}
          </h2>

          <div className="text-sm text-slate-500">
            Saved Items: <span className="font-semibold text-blue-600">{savedItems.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center">
            <h3 className="text-2xl font-bold text-slate-900">Loading listings...</h3>
            <p className="text-slate-500 mt-2">Fetching real marketplace data from backend.</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const isSaved = savedItems.includes(item.id);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition"
                >
                  <div className="relative">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-52 object-cover"
                    />

                    <button
                      onClick={() => toggleSaveItem(item.id)}
                      className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow hover:scale-105 transition"
                    >
                      <Heart
                        className={`w-5 h-5 transition ${
                          isSaved ? "fill-red-500 text-red-500" : "text-slate-700"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-slate-900">{item.price}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                        {item.category}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>

                    <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
                      <MapPin className="w-4 h-4" />
                      <span>{item.hostel} Pickup</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Link
                        href={`/item-details?id=${item.id}`}
                        className="w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium py-3 rounded-2xl transition"
                      >
                        View Details
                      </Link>

                      <button
                        onClick={() => handleChatSeller(item)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-2xl transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Chat Seller
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center">
            <h3 className="text-2xl font-bold text-slate-900">No items found</h3>
            <p className="text-slate-500 mt-2">
              Try searching for books, cycles, calculator, hostel items, or electronics.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}