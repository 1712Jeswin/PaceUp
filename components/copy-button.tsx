"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

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
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-2 h-8 px-3 rounded-md text-sm font-mono border-border/50 bg-bg-tertiary/50 transition-all duration-300 relative overflow-hidden",
        "hover:border-accent-green/50 hover:bg-accent-green/10 hover:text-accent-green hover:shadow-[0_0_10px_rgba(57,255,20,0.15)]",
        isCopied && "border-accent-gold text-accent-gold bg-accent-gold/10 hover:bg-accent-gold/20 hover:text-accent-gold hover:border-accent-gold hover:shadow-[0_0_10px_rgba(255,215,0,0.15)]",
        className
      )}
      aria-label={`Copy ${label ?? "text"} to clipboard`}
    >
      <span className="relative z-10">{text}</span>
      <AnimatePresence mode="wait">
        {isCopied ? (
          <motion.div
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative z-10"
          >
            <Check className="h-3.5 w-3.5" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative z-10"
          >
            <Copy className="h-3.5 w-3.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
}
