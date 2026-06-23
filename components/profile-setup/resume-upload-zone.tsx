"use client";

import { useState, useRef, useCallback } from "react";

/**
 * Resume upload zone with drag & drop support.
 * Accepts PDF, DOCX, and TXT files up to 5MB.
 * Shows upload state, file preview, and clear option.
 */

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ACCEPTED_EXTENSIONS = ".pdf,.docx,.txt";

interface ResumeUploadZoneProps {
  file: File | null;
  onFileChange: (_file: File | null) => void;
  error?: string | null;
}

export function ResumeUploadZone({
  file,
  onFileChange,
  error,
}: ResumeUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayError = error ?? localError;

  const validateFile = useCallback((selectedFile: File): boolean => {
    setLocalError(null);

    if (!ACCEPTED_MIME_TYPES.includes(selectedFile.type)) {
      setLocalError("Only PDF, DOCX, and TXT files are accepted");
      return false;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setLocalError(
        `File too large (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.`
      );
      return false;
    }

    return true;
  }, []);

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      if (validateFile(selectedFile)) {
        onFileChange(selectedFile);
      }
    },
    [validateFile, onFileChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const clearFile = () => {
    onFileChange(null);
    setLocalError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string): string => {
    if (type === "application/pdf") return "📕";
    if (type.includes("wordprocessingml")) return "📘";
    return "📄";
  };

  if (file) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-text-primary">
          Resume Uploaded
        </label>

        <div className="flex items-center gap-3 p-4 rounded-xl border border-accent-green/30 bg-accent-green/5">
          <span className="text-2xl">{getFileIcon(file.type)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display font-semibold text-text-primary truncate">
              {file.name}
            </p>
            <p className="text-xs text-text-secondary">
              {formatFileSize(file.size)} •{" "}
              {file.type === "application/pdf"
                ? "PDF"
                : file.type.includes("wordprocessingml")
                ? "DOCX"
                : "Text"}
            </p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="px-3 py-1.5 rounded-lg border border-accent-magenta/30 text-accent-magenta text-xs font-display hover:bg-accent-magenta/10 transition-all min-h-[44px]"
            aria-label="Remove uploaded resume"
          >
            Remove
          </button>
        </div>

        <p className="text-xs text-text-muted italic">
          ✓ Your resume will be parsed to help the AI leader understand your background better
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text-primary">
        Upload Your Resume
      </label>
      <p className="text-xs text-text-secondary">
        Your resume helps the AI leader understand your full background for better task assignment.
        It is stored securely and never shared externally.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 min-h-[180px] ${
          isDragOver
            ? "border-accent-green bg-accent-green/5 shadow-[0_0_30px_rgba(57,255,20,0.1)]"
            : "border-border bg-bg-tertiary/50 hover:border-text-muted hover:bg-bg-secondary/50"
        }`}
        role="button"
        tabIndex={0}
        aria-label="Upload resume file"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        {/* Upload icon */}
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isDragOver
              ? "bg-accent-green/20 text-accent-green"
              : "bg-bg-secondary text-text-muted"
          }`}
        >
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <div className="text-center">
          <p
            className={`text-sm font-display font-semibold ${
              isDragOver ? "text-accent-green" : "text-text-primary"
            }`}
          >
            {isDragOver ? "Drop your file here" : "Drag & drop your resume"}
          </p>
          <p className="text-xs text-text-muted mt-1">
            or{" "}
            <span className="text-accent-blue underline underline-offset-2">
              browse files
            </span>
          </p>
        </div>

        <p className="text-[11px] text-text-muted">
          PDF, DOCX, or TXT • Max 5MB
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {/* Error message */}
      {displayError && (
        <p className="text-xs text-accent-magenta" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}
