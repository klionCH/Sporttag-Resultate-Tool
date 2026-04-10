"use client";

import { X, Pencil, Trash2 } from "lucide-react";
import React from "react";

export default function EditClassModal({ isOpen, onClose, onEdit, onDelete, className }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-lg p-6 space-y-4 animate-fadeIn">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Klasse bearbeiten</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Beschreibung */}
        <p className="text-sm text-gray-600">
          Was möchtest du mit <strong>{className}</strong> machen?
        </p>

        {/* Buttons */}
        
        <div className="flex flex-col gap-3">
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Pencil className="w-5 h-5" />
            Bearbeiten
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
            <Trash2 className="w-5 h-5" />
            Löschen
            </button>
        </div>
      </div>
    </div>
  );
}