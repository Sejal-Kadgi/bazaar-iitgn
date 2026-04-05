"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShoppingBag,
  ArrowLeft,
  Upload,
  IndianRupee,
  Tag,
  MapPin,
  FileText,
  Package,
  CheckCircle,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function SellPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    price: "",
    condition: "",
    hostel: "",
    description: "",
    contact: "",
    tags: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [existingImages, setExistingImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);

  const categories = [
    "Books",
    "Electronics",
    "Cycles",
    "Hostel Gear",
    "Furniture",
    "Clothing",
    "Sports",
    "Others",
  ];

  const conditions = ["New", "Like New", "Good", "Used", "Old but Working"];

  useEffect(() => {
    if (editId) {
      fetchListingForEdit(editId);
    }
  }, [editId]);

  const fetchListingForEdit = async (listingId) => {
    try {
      setIsLoadingEditData(true);

      const res = await fetch(`${API_BASE}/listings/${listingId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to fetch listing");
      }

      setFormData({
        title: data.title || "",
        category: data.category || "",
        price: data.price ? String(data.price) : "",
        condition: data.condition || "",
        hostel: data.hostel || "",
        description: data.description || "",
        contact: data.contact || "",
        tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
      });

      setExistingImages(Array.isArray(data.images) ? data.images : []);
      setSelectedFileName(
        Array.isArray(data.images) && data.images.length > 0
          ? "Current image attached"
          : ""
      );
    } catch (error) {
      console.error("Error fetching listing for edit:", error);
      alert(error.message || "Failed to load listing for edit");
    } finally {
      setIsLoadingEditData(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedFileName(file.name);
    }
  };

  const uploadImageToCloudinary = async () => {
    if (!selectedFile) return null;

    const uploadFormData = new FormData();
    uploadFormData.append("file", selectedFile);

    const res = await fetch(`${API_BASE}/listings/upload-image`, {
      method: "POST",
      body: uploadFormData,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.detail || "Image upload failed");
    }

    return data.image_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const ownerEmail =
      typeof window !== "undefined" ? localStorage.getItem("userEmail") : "";

    if (!ownerEmail) {
      alert("Please login first");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalImages = [...existingImages];

      // If new image selected, upload and replace existing image list
      if (selectedFile) {
        const uploadedImageUrl = await uploadImageToCloudinary();
        finalImages = uploadedImageUrl ? [uploadedImageUrl] : [];
      }

      const payload = {
        title: formData.title.trim(),
        category: formData.category.trim(),
        price: parseInt(formData.price, 10),
        condition: formData.condition.trim() || "Good",
        hostel: formData.hostel.trim(),
        description: formData.description.trim(),
        contact: formData.contact.trim(),
        owner_email: ownerEmail,
        images: finalImages,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      let res;

      if (editId) {
        // EDIT MODE
        res = await fetch(`${API_BASE}/listings/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } else {
        // CREATE MODE
        res = await fetch(`${API_BASE}/listings/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            (editId ? "Failed to update listing" : "Failed to create listing")
        );
      }

      alert(
        editId
          ? "Your listing has been updated successfully! 🎉"
          : "Your item has been listed successfully! 🎉"
      );

      router.push("/dashboard");
    } catch (error) {
      console.error(editId ? "Error updating listing:" : "Error creating listing:", error);
      alert(
        error.message ||
          (editId
            ? "Failed to update item. Please try again."
            : "Failed to post item. Please try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/home"
            className="flex items-center gap-3 text-xl font-bold text-slate-900"
          >
            <ShoppingBag className="w-7 h-7 text-blue-600" />
            <span>Bazaar@IITGN</span>
          </Link>

          <Link
            href="/home"
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Page Content */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-3 gap-8">
        {/* Left Info Section */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-emerald-500 rounded-3xl p-8 text-white shadow-xl">
            <h1 className="text-3xl font-bold leading-tight">
              {editId ? "Edit your listing easily on campus" : "Sell your item easily on campus"}
            </h1>
            <p className="mt-4 text-blue-100">
              List books, electronics, cycles, hostel gear, and more for fellow IITGN students.
            </p>

            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 mt-1" />
                <div>
                  <p className="font-semibold">Trusted campus marketplace</p>
                  <p className="text-sm text-blue-100">Only for the IITGN community</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 mt-1" />
                <div>
                  <p className="font-semibold">Quick local exchange</p>
                  <p className="text-sm text-blue-100">Easy hostel pickup and drop</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 mt-1" />
                <div>
                  <p className="font-semibold">Promote sustainable reuse</p>
                  <p className="text-sm text-blue-100">Give your unused items a second life</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">
                {editId ? "Edit Your Listing" : "Post an Item for Sale"}
              </h2>
              <p className="text-slate-500 mt-2">
                {editId
                  ? "Update the details below to edit your item listing."
                  : "Fill in the details below to list your item on Bazaar@IITGN."}
              </p>
            </div>

            {isLoadingEditData ? (
              <p className="text-slate-500">Loading listing details...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Item Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Item Name
                  </label>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="e.g. Engineering Mechanics Book"
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                  </div>
                </div>

                {/* Category + Price */}
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Category
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black appearance-none bg-white"
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Price (₹)
                    </label>
                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        placeholder="Enter price"
                        required
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                      />
                    </div>
                  </div>
                </div>

                {/* Condition + Hostel */}
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Condition
                    </label>
                    <select
                      name="condition"
                      value={formData.condition}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                    >
                      <option value="">Select condition</option>
                      {conditions.map((condition) => (
                        <option key={condition} value={condition}>
                          {condition}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Hostel / Pickup Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        name="hostel"
                        value={formData.hostel}
                        onChange={handleChange}
                        placeholder="e.g. Hostel A"
                        required
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Describe the item, usage, defects (if any), and why someone should buy it..."
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black resize-none"
                    />
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Contact Preference
                  </label>
                  <input
                    type="text"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    placeholder="e.g. WhatsApp / Email / Call"
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    placeholder="e.g. calculator, exam, casio"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>

                {/* Upload Box */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Upload Item Image
                  </label>
                  <label className="border-2 border-dashed border-slate-300 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                    <Upload className="w-8 h-8 text-blue-500 mb-3" />
                    <p className="font-medium text-slate-700">
                      {selectedFileName ? selectedFileName : "Click to upload image"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      PNG, JPG up to 5MB
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl py-4 font-semibold text-lg transition"
                >
                  {isSubmitting
                    ? editId
                      ? "Updating Your Item..."
                      : "Listing Your Item..."
                    : editId
                    ? "Update Item"
                    : "Post Item for Sale"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}