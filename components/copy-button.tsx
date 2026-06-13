"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

/**
 * Copy-to-clipboard button with visual feedback.
 * Shows a checkmark icon for 2 seconds after copying.
 */
export function CopyButton({ text, label, className }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      console.error("[CopyButton] Failed to copy to clipboard");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-mono",
        "border border-border bg-bg-tertiary transition-all duration-200",
        "hover:border-accent-green hover:text-accent-green active:scale-[0.97]",
        isCopied && "border-accent-gold text-accent-gold",
        className
      )}
      aria-label={`Copy ${label ?? "text"} to clipboard`}
    >
      {text}
      {isCopied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
