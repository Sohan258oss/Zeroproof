import { useState, useRef, useCallback } from "react";

export default function FileDropzone({ onFileSelect, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [localHash, setLocalHash] = useState("");
  const [computingHash, setComputingHash] = useState(false);
  const fileInputRef = useRef(null);

  const calculateHash = async (file) => {
    setComputingHash(true);
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      setLocalHash(hashHex);
    } catch (err) {
      console.error("Local hash computation failed:", err);
      setLocalHash("ERROR_COMPUTING_HASH");
    } finally {
      setComputingHash(false);
    }
  };

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
        calculateHash(file);
        onFileSelect?.(file);
      }
    },
    [disabled, onFileSelect]
  );

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      calculateHash(file);
      onFileSelect?.(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setLocalHash("");
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
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    );
  };

  if (selectedFile) {
    return (
      <div className="bg-[#030e05]/30 border border-emerald-950 rounded-2xl p-5 animate-fade-in relative overflow-hidden shadow-xl">
        {/* Subtle breathing animation border */}
        <div className="absolute inset-0 border border-emerald-500/15 rounded-2xl pointer-events-none animate-pulse-border" />
        
        <div className="flex items-start gap-4 relative z-10">
          <div className="flex-shrink-0 w-11 h-11 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center text-emerald-450">
            {getFileIcon(selectedFile.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono font-bold text-white truncate">{selectedFile.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-slate-500">{formatSize(selectedFile.size)}</span>
              <span className="text-emerald-950 font-mono text-[9px]">•</span>
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                {selectedFile.type?.split("/")[1] || "file"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-pulse" />
              <span className="text-[9px] font-mono text-[#00ff66] font-bold uppercase tracking-wider">STAGE_READY</span>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="flex-shrink-0 p-1.5 text-slate-500 hover:text-slate-200 bg-emerald-950/30 border border-emerald-950 hover:border-emerald-500/20 rounded-lg transition-all cursor-pointer"
            title="Remove file"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Real-time client-side computed hash preview */}
        <div className="mt-4 px-3.5 py-3 rounded-xl border border-emerald-950/80 bg-black/60 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase font-semibold">LOCAL_SHA256_HASH</span>
            {computingHash ? (
              <span className="text-[9px] text-emerald-450 font-mono animate-pulse">COMPUTING...</span>
            ) : (
              <span className="text-[9px] text-emerald-400 font-mono font-bold uppercase border border-emerald-500/15 px-2 py-0.5 rounded bg-emerald-500/5">CLIENT_CALCULATED</span>
            )}
          </div>
          <p className="text-[10px] text-[#00ff66]/90 font-mono break-all leading-normal bg-[#020402] p-2.5 border border-emerald-950 rounded select-all">
            {localHash || "Awaiting hash calculation..."}
          </p>
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
        relative rounded-2xl border border-dashed p-10 text-center cursor-pointer
        transition-all duration-300 group select-none
        ${isDragging
          ? "border-[#00ff66] bg-[#00ff66]/5 shadow-[0_0_20px_rgba(0,255,102,0.08)]"
          : "border-emerald-950/80 hover:border-emerald-500/30 bg-emerald-950/10 hover:bg-emerald-950/20"
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
        mx-auto w-12 h-12 rounded-xl border flex items-center justify-center mb-4 transition-all duration-300
        ${isDragging
          ? "border-emerald-500/30 bg-emerald-500/10 text-[#00ff66] scale-105"
          : "border-emerald-950 bg-emerald-950/30 text-slate-500 group-hover:text-emerald-400 group-hover:border-emerald-500/25"
        }
      `}>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>

      <p className="text-xs font-mono font-bold text-slate-400 group-hover:text-white transition-colors mb-1.5 uppercase tracking-wide">
        {isDragging ? "DROP_FILE_NOW" : "DRAG_AND_DROP_DOCUMENT"}
      </p>
      <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider">
        or click to <span className="text-slate-400 hover:text-white underline">browse_directory</span>
      </p>
      <p className="text-[9px] text-slate-650 mt-4 font-mono tracking-widest uppercase font-semibold">
        PDF · JPEG · PNG · WebP — Max 10 MB
      </p>

      {/* Corner accents */}
      <div className="absolute top-2.5 left-2.5 w-2.5 h-2.5 border-t border-l border-emerald-950 group-hover:border-emerald-500/20 transition-colors" />
      <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 border-t border-r border-emerald-950 group-hover:border-emerald-500/20 transition-colors" />
      <div className="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 border-b border-l border-emerald-950 group-hover:border-emerald-500/20 transition-colors" />
      <div className="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 border-b border-r border-emerald-950 group-hover:border-emerald-500/20 transition-colors" />
    </div>
  );
}
