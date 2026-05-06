"use client";

import { useRef, useState } from "react";

interface Props {
  label:     string;
  icon:      string;
  onFile:    (file: File) => void;
  accept?:   string;
  fileName?: string;
  rowCount?: number;
}

export function CSVDropzone({ label, icon, onFile, accept = ".csv,.xlsx,.ofx,.qfx", fileName, rowCount }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (file) onFile(file);
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        className={`
          border-2 border-dashed rounded-xl p-11 text-center cursor-pointer transition-all
          ${dragging || fileName
            ? "border-[#4f8fff] bg-[rgba(79,143,255,0.08)]"
            : "border-[rgba(255,255,255,0.11)] bg-[#111118] hover:border-[#4f8fff] hover:bg-[rgba(79,143,255,0.06)]"
          }
        `}
      >
        <div className="text-4xl mb-2.5">{icon}</div>
        {fileName ? (
          <>
            <div className="text-[13px] font-medium text-[#00d4aa]">{fileName}</div>
            {rowCount != null && (
              <div className="text-[11px] text-[#8080a0] mt-1">{rowCount} rows detected</div>
            )}
          </>
        ) : (
          <>
            <div className="text-[13px] font-medium mb-1">{label}</div>
            <div className="text-[11px] text-[#8080a0]">
              Drop here or click · .csv, .xlsx, .ofx accepted
            </div>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
