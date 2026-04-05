import Link from "next/link";
import {
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
  BookOpen,
  MessageCircle,
  LayoutDashboard,
  Users,
  Sparkles,
  Bike,
  Laptop,
  Bed,
  FlaskConical,
} from "lucide-react";

export default function AboutPage() {
  const features = [
    {
      title: "Trusted Campus Marketplace",
      description:
        "A dedicated buying, selling, and exchange platform designed specifically for the IITGN student community.",
      icon: ShieldCheck,
    },
    {
      title: "Smart Category-Based Browsing",
      description:
        "Find books, cycles, electronics, hostel items, sports gear, and lab essentials in one clean marketplace.",
      icon: BookOpen,
    },
    {
      title: "Direct Buyer-Seller Communication",
      description:
        "Students can quickly connect with sellers using the built-in chat flow for smooth and fast transactions.",
      icon: MessageCircle,
    },
    {
      title: "Seller Dashboard & Admin Support",
      description:
        "Sellers manage their listings easily, while admins can monitor listings and maintain a safe platform.",
      icon: LayoutDashboard,
    },
  ];

  const categories = [
    { name: "Books", icon: BookOpen },
    { name: "Electronics", icon: Laptop },
    { name: "Cycles", icon: Bike },
    { name: "Lab Essentials", icon: FlaskConical },
    { name: "Hostel Items", icon: Bed },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 rounded-3xl p-8 md:p-12 text-white shadow-lg">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full text-sm font-medium mb-5">
              <Sparkles className="w-4 h-4" />
              Built for the IITGN Community
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Welcome to Bazaar@IITGN
            </h1>

            <p className="mt-5 text-blue-100 text-lg md:text-xl max-w-3xl leading-relaxed">
              Bazaar@IITGN is a trusted student marketplace where IIT Gandhinagar students
              can buy, sell, and exchange useful items within the campus community. It
              makes student-to-student transactions faster, safer, and more convenient.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/home"
                className="bg-white text-blue-700 hover:bg-slate-100 font-semibold px-6 py-3 rounded-2xl transition text-center"
              >
                Explore Marketplace
              </Link>

              <Link
                href="/sell"
                className="bg-white/15 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3 rounded-2xl transition text-center"
              >
                Sell an Item
              </Link>
            </div>
          </div>
        </section>

        {/* Why Bazaar Section */}
        <section className="mt-10">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-7 h-7 text-blue-600" />
              <h2 className="text-3xl font-bold text-slate-900">Why Bazaar@IITGN?</h2>
            </div>

            <p className="text-slate-600 text-lg leading-relaxed">
              Students often need quick access to second-hand books, calculators, cycles,
              lab coats, electronics, and hostel essentials. Existing platforms are often
              too broad, unverified, or inconvenient for campus-based exchanges.
              <br />
              <br />
              Bazaar@IITGN solves this by creating a focused, trusted, and student-friendly
              marketplace exclusively for the IITGN community — reducing waste, saving money,
              and making exchanges easier within the campus ecosystem.
            </p>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="mt-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Key Features</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-blue-600" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-900">{feature.title}</h3>
                  <p className="text-slate-600 mt-3 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Categories Section */}
        <section className="mt-10">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Popular Categories</h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {categories.map((category) => {
                const Icon = category.icon;

                return (
                  <div
                    key={category.name}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3"
                  >
                    <Icon className="w-7 h-7 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700 text-center">
                      {category.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mt-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-slate-900">Browse Listings</h3>
              <p className="text-slate-600 mt-3 leading-relaxed">
                Search and explore items posted by fellow IITGN students across useful campus categories.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-slate-900">Chat & Connect</h3>
              <p className="text-slate-600 mt-3 leading-relaxed">
                View item details, contact the seller, and discuss price, pickup location, and exchange terms.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-900">Sell & Manage</h3>
              <p className="text-slate-600 mt-3 leading-relaxed">
                Post your own items, manage listings through the dashboard, and let the admin help maintain trust and safety.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-10 mb-8">
          <div className="bg-slate-900 rounded-3xl p-8 md:p-10 text-white">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to use Bazaar@IITGN?
            </h2>
            <p className="text-slate-300 mt-4 text-lg max-w-2xl">
              Explore listings, connect with sellers, and make campus exchanges faster and smarter.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <Link
                href="/home"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-2xl transition text-center"
              >
                Go to Home
              </Link>

              <Link
                href="/sell"
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-6 py-3 rounded-2xl transition text-center"
              >
                List an Item
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}