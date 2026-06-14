"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CalendarIcon, Upload, FileText, Type, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

      setIdeaStatement(data.data.ideaStatement ?? "");
      setSolutionApproach(data.data.solutionApproach ?? "");
      setScopeStatement(data.data.scopeStatement ?? "");
      if (data.data.deadline) {
        setDeadline(data.data.deadline);
      }
      setParseSuccess(true);
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

  const today = new Date().toISOString().split("T")[0];

  if (step === "assigning") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-green/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative">
          <div className="h-16 w-16 border-4 border-accent-green border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-[0_0_15px_rgba(57,255,20,0.5)]" />
          <h2 className="text-2xl font-display font-bold text-gradient-neon mb-3 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-accent-gold" />
            AI is analyzing...
          </h2>
          <p className="text-text-secondary text-sm max-w-sm mx-auto">
            Breaking down the project brief and dynamically assigning optimal roles and tasks to team members.
          </p>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-gold/10 rounded-full blur-[100px] pointer-events-none" />
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }} className="relative">
          <div className="w-24 h-24 bg-accent-gold/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-accent-gold/50 shadow-[0_0_30px_rgba(255,215,0,0.3)]">
            <CheckCircle2 className="w-12 h-12 text-accent-gold" />
          </div>
          <h2 className="text-3xl font-display font-bold text-accent-gold mb-3">
            Tasks Assigned!
          </h2>
          <p className="text-text-secondary">
            Redirecting to your new task board...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in py-8 relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-text-primary mb-3 text-gradient-neon">Project Brief</h1>
        <p className="text-text-secondary">
          Describe what you&apos;re building. Our AI will automatically parse this and generate a fully assigned task board for your team.
        </p>
      </div>

      <Tabs value={inputMode} onValueChange={(val) => setInputMode(val as "text" | "upload")} className="w-full mb-8">
        <TabsList className="grid w-full max-w-sm grid-cols-2 bg-bg-secondary/50 backdrop-blur-md border border-border/50 p-1 rounded-xl h-12">
          <TabsTrigger value="text" className="rounded-lg data-[state=active]:bg-accent-green/20 data-[state=active]:text-accent-green">
            <Type className="w-4 h-4 mr-2" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="upload" className="rounded-lg data-[state=active]:bg-accent-blue/20 data-[state=active]:text-accent-blue">
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {parseSuccess && (
        <div className="p-4 rounded-xl bg-accent-green/10 border border-accent-green/30 mb-8 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-accent-green shrink-0 mt-0.5" />
          <p className="text-accent-green text-sm">
            Document parsed successfully by AI. Please review the extracted fields below and make any necessary edits before submitting.
          </p>
        </div>
      )}

      {inputMode === "upload" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center w-full p-12 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
              isParsing
                ? "border-accent-blue bg-accent-blue/10 shadow-[0_0_20px_rgba(0,207,255,0.15)]"
                : "border-border/50 bg-bg-tertiary/30 hover:border-accent-blue/50 hover:bg-bg-tertiary/50"
            }`}
          >
            {isParsing ? (
              <div className="flex flex-col items-center text-center">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 border-4 border-accent-blue/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-accent-blue border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(0,207,255,0.5)]" />
                  <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-accent-blue animate-pulse" />
                </div>
                <span className="text-text-primary font-display font-medium text-lg mb-1">
                  AI is reading {selectedFileName}...
                </span>
                <span className="text-text-secondary text-sm">
                  Extracting project goals, scope, and deadlines.
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-accent-blue/10 group-hover:text-accent-blue transition-all duration-300 ring-1 ring-border/50 group-hover:ring-accent-blue/30">
                  <FileText className="w-8 h-8 text-text-muted group-hover:text-accent-blue transition-colors" />
                </div>
                <span className="text-text-primary font-display font-medium text-lg mb-1 group-hover:text-accent-blue transition-colors">
                  {selectedFileName ?? "Click to upload or drag and drop"}
                </span>
                <span className="text-text-secondary text-sm">
                  Supported formats: PDF, DOCX, TXT, or MD (max 5MB)
                </span>
              </div>
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

          {!parseSuccess && error && (
            <div className="p-4 rounded-xl bg-accent-magenta/10 border border-accent-magenta/30 mt-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent-magenta shrink-0 mt-0.5" />
              <p className="text-accent-magenta text-sm">{error}</p>
            </div>
          )}
        </motion.div>
      )}

      {(inputMode === "text" || parseSuccess) && (
        <Card className="glass-card overflow-hidden">
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 md:p-8 space-y-8">
              
              <div className="space-y-3">
                <Label htmlFor="idea" className="text-base text-text-primary">Idea Statement</Label>
                <Textarea
                  id="idea"
                  value={ideaStatement}
                  onChange={(e: any) => setIdeaStatement(e.target.value)}
                  placeholder="What are you building? Describe the core idea in 2-3 sentences."
                  rows={3}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-lg bg-bg-tertiary/50 border-border/50 text-text-primary focus-visible:ring-accent-green resize-none text-sm md:text-base leading-relaxed"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="solution" className="text-base text-text-primary">Solution Approach</Label>
                <Textarea
                  id="solution"
                  value={solutionApproach}
                  onChange={(e: any) => setSolutionApproach(e.target.value)}
                  placeholder="How will you build it? What technologies, architecture, or methodology will be used?"
                  rows={4}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-lg bg-bg-tertiary/50 border-border/50 text-text-primary focus-visible:ring-accent-green resize-none text-sm md:text-base leading-relaxed"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="scope" className="text-base text-text-primary">Scope Statement</Label>
                <Textarea
                  id="scope"
                  value={scopeStatement}
                  onChange={(e: any) => setScopeStatement(e.target.value)}
                  placeholder="What is strictly in scope? What is explicitly out of scope? Defining boundaries helps AI assign accurate tasks."
                  rows={4}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-lg bg-bg-tertiary/50 border-border/50 text-text-primary focus-visible:ring-accent-green resize-none text-sm md:text-base leading-relaxed"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="deadline" className="text-base text-text-primary flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-accent-blue" />
                  Project Deadline
                </Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={today}
                  required
                  disabled={isLoading}
                  className="w-full md:w-1/2 h-12 px-4 rounded-lg bg-bg-tertiary/50 border-border/50 text-text-primary focus-visible:ring-accent-blue text-base"
                />
              </div>

              {error && inputMode === "text" && (
                <div className="p-4 rounded-xl bg-accent-magenta/10 border border-accent-magenta/30 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-accent-magenta shrink-0 mt-0.5" />
                  <p className="text-accent-magenta text-sm">{error}</p>
                </div>
              )}

            </CardContent>
            <CardFooter className="bg-bg-tertiary/20 border-t border-border/50 p-6 md:p-8">
              <Button
                type="submit"
                disabled={isLoading || !ideaStatement || !solutionApproach || !scopeStatement || !deadline}
                className="w-full h-14 bg-accent-green text-bg-primary hover:bg-accent-green/80 neon-focus font-bold text-lg transition-all shadow-[0_0_15px_rgba(57,255,20,0.2)] hover:shadow-[0_0_25px_rgba(57,255,20,0.4)]"
              >
                {isLoading ? (
                  <>
                    <div className="h-5 w-5 border-2 border-bg-primary border-t-transparent rounded-full animate-spin mr-3" />
                    Saving Brief...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Submit Brief & Auto-Assign Tasks
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
