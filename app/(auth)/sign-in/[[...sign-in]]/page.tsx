"use client";

import { SignIn } from "@clerk/nextjs";
import { motion } from "framer-motion";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-[128px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 glass-panel rounded-2xl p-2"
      >
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-transparent shadow-none",
              headerTitle: "text-text-primary font-display",
              headerSubtitle: "text-text-secondary font-body",
              formButtonPrimary: "bg-accent-green text-bg-primary hover:bg-accent-green/80 neon-focus font-bold",
              formFieldInput: "bg-bg-tertiary border-border/50 text-text-primary focus:border-accent-green neon-focus",
              formFieldLabel: "text-text-secondary",
              footerActionLink: "text-accent-blue hover:text-accent-green transition-colors",
            },
          }}
        />
      </motion.div>
    </main>
  );
}
