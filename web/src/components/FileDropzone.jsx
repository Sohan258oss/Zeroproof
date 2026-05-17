import { useState, useRef, useCallback } from "react";

export default function FileDropzone({ onFileSelect, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items?.length > 0) setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files?.length > 0) {
        const file = files[0];
        setSelectedFile(file);
        onFileSelect?.(file);
      }
    },
    [disabled, onFileSelect]
  );

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect?.(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    onFileSelect?.(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getFileIcon = (type) => {
    if (type?.startsWith("image/")) {
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    );
  };

  if (selectedFile) {
    return (
      <div className="dropzone-selected glass-panel rounded-2xl p-6 animate-fade-in">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            {getFileIcon(selectedFile.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500">{formatSize(selectedFile.size)}</span>
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider">
                {selectedFile.type?.split("/")[1] || "file"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Ready for upload</span>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="flex-shrink-0 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            title="Remove file"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* File hash preview */}
        <div className="mt-4 px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5">
          <p className="text-[10px] text-slate-600 font-mono tracking-wider uppercase mb-1">Document Hash (SHA-256) — computed on upload</p>
          <p className="text-xs text-slate-400 font-mono">Pending server-side computation...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`
        dropzone relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer
        transition-all duration-300 group
        ${isDragging
          ? "border-sky-400 bg-sky-500/5 shadow-[0_0_40px_rgba(56,189,248,0.08)]"
          : "border-slate-700/50 hover:border-slate-600 bg-slate-900/30 hover:bg-slate-900/50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload icon */}
      <div className={`
        mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300
        ${isDragging
          ? "bg-sky-500/15 text-sky-400 scale-110"
          : "bg-slate-800/50 text-slate-500 group-hover:text-sky-400 group-hover:bg-sky-500/10"
        }
      `}>
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>

      <p className="text-sm font-medium text-slate-300 mb-1">
        {isDragging ? "Drop your document here" : "Drag & drop your document"}
      </p>
      <p className="text-xs text-slate-600">
        or <span className="text-sky-400 hover:text-sky-300 font-medium">browse files</span>
      </p>
      <p className="text-[10px] text-slate-700 mt-3 font-mono tracking-wider">
        PDF · JPEG · PNG · WebP — Max 10 MB
      </p>

      {/* Corner accents */}
      {isDragging && (
        <>
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-sky-400/50 rounded-tl-md" />
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-sky-400/50 rounded-tr-md" />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-sky-400/50 rounded-bl-md" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-sky-400/50 rounded-br-md" />
        </>
      )}
    </div>
  );
}
