"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CalendarIcon, Upload, FileText, Type } from "lucide-react";

/**
 * /dashboard/group/[id]/brief — Project brief form.
 *
 * Only accessible to the group creator (enforced server-side via API).
 * Supports two modes:
 * 1. Manual text entry — paste content into individual fields.
 * 2. Document upload — upload a PDF, DOCX, TXT, or MD file. AI parses it into the four fields.
 *
 * On submit: creates/updates brief → triggers AI task assignment.
 */
export default function ProjectBriefPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [ideaStatement, setIdeaStatement] = useState("");
  const [solutionApproach, setSolutionApproach] = useState("");
  const [deadline, setDeadline] = useState("");
  const [scopeStatement, setScopeStatement] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "assigning" | "done">("form");
  const [inputMode, setInputMode] = useState<"text" | "upload">("text");
  const [isParsing, setIsParsing] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsParsing(true);
    setParseSuccess(false);
    setSelectedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/briefs/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to parse document");
        return;
      }

      // Populate fields with parsed data
      setIdeaStatement(data.data.ideaStatement ?? "");
      setSolutionApproach(data.data.solutionApproach ?? "");
      setScopeStatement(data.data.scopeStatement ?? "");
      if (data.data.deadline) {
        setDeadline(data.data.deadline);
      }
      setParseSuccess(true);
      // Auto-switch to text view so user can review/edit
      setInputMode("text");
    } catch {
      setError("An unexpected error occurred while parsing the document");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Step 1: Create or update the brief
      const briefRes = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          ideaStatement: ideaStatement.trim(),
          solutionApproach: solutionApproach.trim(),
          deadline,
          scopeStatement: scopeStatement.trim(),
        }),
      });

      const briefData = await briefRes.json();

      if (!briefData.success) {
        setError(briefData.error ?? "Failed to save brief");
        setIsLoading(false);
        return;
      }

      // Step 2: Trigger AI task assignment
      setStep("assigning");

      const assignRes = await fetch("/api/ai/assign-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefId: briefData.data.id }),
      });

      const assignData = await assignRes.json();

      if (!assignData.success) {
        setError(assignData.error ?? "Failed to assign tasks. You can retry from the group dashboard.");
        setStep("form");
        setIsLoading(false);
        return;
      }

      setStep("done");
      router.refresh();
      setTimeout(() => {
        router.push(`/dashboard/group/${groupId}/tasks`);
      }, 1500);
    } catch {
      setError("An unexpected error occurred");
      setStep("form");
    } finally {
      if (step !== "done") {
        setIsLoading(false);
      }
    }
  };

  // Today's date in YYYY-MM-DD format for the min attribute
  const today = new Date().toISOString().split("T")[0];

  if (step === "assigning") {
    return (
      <div className="max-w-lg mx-auto text-center py-20 animate-fade-in">
        <div className="h-12 w-12 border-2 border-accent-green border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-display font-bold text-text-primary mb-2">
          AI is assigning roles and tasks...
        </h2>
        <p className="text-text-secondary text-sm">
          Analyzing your project brief and team profiles. This may take a moment.
        </p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="max-w-lg mx-auto text-center py-20 animate-fade-in">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-xl font-display font-bold text-accent-gold mb-2">
          Tasks Assigned!
        </h2>
        <p className="text-text-secondary text-sm">
          Redirecting to the task board...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-2">Project Brief</h1>
      <p className="text-text-secondary text-sm mb-6">
        Describe your project. The AI will analyze this and assign roles and tasks
        to each team member.
      </p>

      {/* Input mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setInputMode("text")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display border transition-all duration-200 ${
            inputMode === "text"
              ? "bg-accent-green/10 border-accent-green text-accent-green"
              : "bg-bg-tertiary border-border text-text-secondary hover:border-text-secondary"
          }`}
        >
          <Type className="h-4 w-4" />
          Paste Text
        </button>
        <button
          type="button"
          onClick={() => setInputMode("upload")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display border transition-all duration-200 ${
            inputMode === "upload"
              ? "bg-accent-blue/10 border-accent-blue text-accent-blue"
              : "bg-bg-tertiary border-border text-text-secondary hover:border-text-secondary"
          }`}
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      {/* Parse success message */}
      {parseSuccess && (
        <div className="p-3 rounded-lg bg-accent-green/10 border border-accent-green/20 mb-6">
          <p className="text-accent-green text-sm">
            ✓ Document parsed successfully. Review the extracted fields below and make any edits before submitting.
          </p>
        </div>
      )}

      {/* Upload area */}
      {inputMode === "upload" && (
        <div className="mb-6">
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center w-full p-8 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 ${
              isParsing
                ? "border-accent-blue bg-accent-blue/5"
                : "border-border bg-bg-tertiary hover:border-accent-blue/50"
            }`}
          >
            {isParsing ? (
              <>
                <div className="h-8 w-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-text-secondary text-sm font-display">
                  Parsing {selectedFileName}...
                </span>
                <span className="text-text-muted text-xs mt-1">
                  AI is extracting project information
                </span>
              </>
            ) : (
              <>
                <FileText className="h-8 w-8 text-text-muted mb-3" />
                <span className="text-text-secondary text-sm font-display">
                  {selectedFileName ?? "Click to upload or drag and drop"}
                </span>
                <span className="text-text-muted text-xs mt-1">
                  PDF, DOCX, TXT, or MD (max 5MB)
                </span>
              </>
            )}
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileUpload}
              disabled={isParsing || isLoading}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Form — always visible when mode is "text" or after parse */}
      {(inputMode === "text" || parseSuccess) && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Idea Statement */}
          <div>
            <label
              htmlFor="idea"
              className="block text-sm font-medium text-text-primary mb-2"
            >
              Idea Statement
            </label>
            <textarea
              id="idea"
              value={ideaStatement}
              onChange={(e) => setIdeaStatement(e.target.value)}
              placeholder="What are you building? Describe the core idea in 2-3 sentences."
              rows={3}
              required
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder:text-text-muted font-body text-sm neon-focus resize-none disabled:opacity-50"
            />
          </div>

          {/* Solution Approach */}
          <div>
            <label
              htmlFor="solution"
              className="block text-sm font-medium text-text-primary mb-2"
            >
              Solution Approach
            </label>
            <textarea
              id="solution"
              value={solutionApproach}
              onChange={(e) => setSolutionApproach(e.target.value)}
              placeholder="How will you build it? What technologies, architecture, or methodology?"
              rows={3}
              required
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder:text-text-muted font-body text-sm neon-focus resize-none disabled:opacity-50"
            />
          </div>

          {/* Deadline */}
          <div>
            <label
              htmlFor="deadline"
              className="block text-sm font-medium text-text-primary mb-2"
            >
              <CalendarIcon className="inline-block h-4 w-4 mr-1 -mt-0.5" />
              Deadline
            </label>
            <input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={today}
              required
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border text-text-primary font-body text-sm neon-focus disabled:opacity-50"
            />
          </div>

          {/* Scope Statement */}
          <div>
            <label
              htmlFor="scope"
              className="block text-sm font-medium text-text-primary mb-2"
            >
              What is in scope and what is out of scope?
            </label>
            <textarea
              id="scope"
              value={scopeStatement}
              onChange={(e) => setScopeStatement(e.target.value)}
              placeholder="In scope: user authentication, task board, API routes. Out of scope: mobile app, payments, analytics."
              rows={4}
              required
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border text-text-primary placeholder:text-text-muted font-body text-sm neon-focus resize-none disabled:opacity-50"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-accent-magenta/10 border border-accent-magenta/20">
              <p className="text-accent-magenta text-sm" role="alert">
                {error}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-accent-green text-bg-primary font-display font-semibold text-sm tracking-wide hover:bg-accent-green/90 active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
          >
            Submit Brief & Assign Tasks
          </button>
        </form>
      )}

      {/* Error shown in upload mode (before parse) */}
      {inputMode === "upload" && !parseSuccess && error && (
        <div className="p-3 rounded-lg bg-accent-magenta/10 border border-accent-magenta/20 mt-4">
          <p className="text-accent-magenta text-sm" role="alert">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
