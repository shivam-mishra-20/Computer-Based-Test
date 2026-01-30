/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import Protected from "@/components/Protected";

interface Batch {
  _id: string;
  name: string;
  classLevels: string[];
  isDefault: boolean;
  description?: string;
  source?: "firebase" | "mongodb";
  createdAt?: string;
  updatedAt?: string;
}

const CLASS_LEVELS = ["7", "8", "9", "10", "11", "12"];

export default function BatchManagement() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    classLevels: [] as string[],
    description: "",
    isDefault: false,
  });

  const loadBatches = async () => {
    try {
      setLoading(true);
      // Fetch batches from Firebase (combined endpoint)
      const data = await apiFetch("/schedule/firebase/batches");
      setBatches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load batches:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || formData.classLevels.length === 0) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      if (editingBatch) {
        await apiFetch(`/schedule/batches/${editingBatch._id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch("/schedule/batches", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }

      setIsModalOpen(false);
      setEditingBatch(null);
      resetForm();
      loadBatches();
    } catch (error: any) {
      alert(error.message || "Failed to save batch");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this batch?")) return;
    
    try {
      await apiFetch(`/schedule/batches/${id}`, { method: "DELETE" });
      loadBatches();
    } catch (error: any) {
      alert(error.message || "Failed to delete batch");
    }
  };

  const openEditModal = (batch: Batch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name,
      classLevels: batch.classLevels,
      description: batch.description || "",
      isDefault: batch.isDefault,
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      classLevels: [],
      description: "",
      isDefault: false,
    });
  };

  const toggleClassLevel = (level: string) => {
    setFormData((prev) => ({
      ...prev,
      classLevels: prev.classLevels.includes(level)
        ? prev.classLevels.filter((l) => l !== level)
        : [...prev.classLevels, level],
    }));
  };

  return (
    <Protected requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center justify-between"
          >
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                Batch Management
              </h1>
              <p className="text-slate-600">
                Manage batches from Firebase and create new ones in MongoDB
              </p>
            </div>
            
            <button
              onClick={() => {
                setEditingBatch(null);
                resetForm();
                setIsModalOpen(true);
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Batch
            </button>
          </motion.div>

          {/* Batches Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {batches.map((batch) => (
                <BatchCard
                  key={batch._id}
                  batch={batch}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {!loading && batches.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <svg className="w-24 h-24 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No Batches Found</h3>
              <p className="text-slate-600 mb-4">Create your first batch to get started</p>
            </div>
          )}
        </div>

        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
              onClick={() => {
                setIsModalOpen(false);
                setEditingBatch(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {editingBatch ? "Edit Batch" : "Create New Batch"}
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Batch Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., JEE Advanced, NEET, Basic"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Optional description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Class Levels <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CLASS_LEVELS.map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => toggleClassLevel(level)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            formData.classLevels.includes(level)
                              ? "bg-indigo-600 text-white shadow-md"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          Class {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) =>
                        setFormData({ ...formData, isDefault: e.target.checked })
                      }
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="isDefault" className="text-sm text-slate-700">
                      Set as default batch (shown to all users)
                    </label>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingBatch(null);
                      }}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                    >
                      {editingBatch ? "Update Batch" : "Create Batch"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Protected>
  );
}

const BatchCard = ({
  batch,
  onEdit,
  onDelete,
}: {
  batch: Batch;
  onEdit: (batch: Batch) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.15)" }}
      className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900 mb-1">{batch.name}</h3>
          <div className="flex items-center gap-2">
            {batch.isDefault && (
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
                DEFAULT
              </span>
            )}
            {batch.source && (
              <span
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  batch.source === "firebase"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {batch.source.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(batch)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Edit batch"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {!batch.isDefault && (
            <button
              onClick={() => onDelete(batch._id)}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete batch"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {batch.description && (
        <p className="text-sm text-slate-600 mb-4">{batch.description}</p>
      )}

      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Class Levels:</p>
        <div className="flex flex-wrap gap-2">
          {batch.classLevels.map((level) => (
            <span
              key={level}
              className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full"
            >
              Class {level}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
