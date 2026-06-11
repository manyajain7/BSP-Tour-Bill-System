'use client';

import { FileText, ImageIcon, Eye } from 'lucide-react';

export interface GalleryDoc {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface DocumentGalleryProps {
  documents: GalleryDoc[];
  onView: (doc: GalleryDoc) => void;
  emptyText?: string;
}

export function DocumentGallery({ documents, onView, emptyText = 'No documents uploaded.' }: DocumentGalleryProps) {
  if (!documents || documents.length === 0) {
    return <p className="text-xs text-gray-500">{emptyText}</p>;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {documents.map((doc) => {
        const isImage = doc.type?.startsWith('image/') && doc.url && doc.url !== '#';
        return (
          <button
            key={doc.id}
            onClick={() => onView(doc)}
            className="group relative flex flex-col border border-slate-200 rounded overflow-hidden bg-slate-50 hover:border-blue-400 hover:shadow-sm transition text-left"
            title={`View ${doc.name}`}
          >
            <div className="h-16 flex items-center justify-center bg-white overflow-hidden">
              {isImage ? (
                <img src={doc.url || "/placeholder.svg"} alt={doc.name} className="w-full h-full object-cover" />
              ) : doc.type?.startsWith('image/') ? (
                <ImageIcon size={22} className="text-slate-400" />
              ) : (
                <FileText size={22} className="text-slate-400" />
              )}
              <span className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-blue-600/70 text-white text-[10px] font-semibold gap-1">
                <Eye size={12} /> View
              </span>
            </div>
            <div className="px-1 py-0.5 border-t border-slate-200">
              <p className="text-[10px] text-gray-700 truncate" title={doc.name}>{doc.name}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
