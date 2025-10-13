"use client";
import React, { useState } from "react";

export default function PDFViewer({
  fileUrl,
  onClose,
  fileName,
}: {
  fileUrl: string;
  onClose: () => void;
  fileName: string;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div 
          style={{
            width: '100% !important',
            height: '100% !important'
          }}
        className="relative bg-white/10  dark:bg-slate-900/80 rounded-2xl shadow-xl border border-white/10 flex flex-col overflow-hidden"
      >
        <div className="flex w-[100%] h-[100%] justify-between items-center px-4 py-2 bg-white/10 backdrop-blur rounded-t-2xl border-b border-white/10">
          <span className="text-white font-semibold text-sm truncate">{fileName}</span>
          <button
            onClick={onClose}
            className="text-white hover:text-purple-400 transition"
            aria-label="Close"
          >
            ✖
          </button>
        </div>

        {/* PDF Viewer Section */}
        <div className="flex-1 overflow-auto bg-black/20">
          {error ? (
            <div className="text-white text-center p-6">Failed to load PDF: {error}</div>
          ) : (
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-[90%] h-[90%]"
              title={fileName}
              style={{
                border: "none",
                width: "100%",
                height: "100%"
              }}
              onError={() => setError("PDF failed to load")}
            />
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-center gap-4 p-4 bg-white/5 border-t border-white/10">
          <button
            onClick={() => {
              const a = document.createElement("a");
              a.href = fileUrl;
              a.download = fileName;
              a.click();
            }}
            className="px-4 py-2 bg-white/10 hover:bg-purple-500/30 text-white rounded-lg transition"
          >
            Download PDF
          </button>
          <button
            onClick={() => window.open(fileUrl, "_blank")}
            className="px-4 py-2 bg-white/10 hover:bg-purple-500/30 text-white rounded-lg transition"
          >
            Open in New Tab
          </button>
        </div>
      </div>
    </div>
  );
}
