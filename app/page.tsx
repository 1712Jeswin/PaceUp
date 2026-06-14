"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Target, Users, Zap, ShieldCheck, Activity } from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center overflow-x-hidden bg-bg-primary">
      {/* Background Cover Image with Overlay */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none mix-blend-screen">
        <Image
          src="/assets/paceup-icon.png"
          alt="PaceUp Logo Cover"
          fill
          className="object-contain p-12"
          priority
        />
      </div>
      
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent-green/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent-blue/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-magenta/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Header/Nav */}
      <header className="w-full max-w-7xl px-6 py-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 md:w-10 md:h-10">
            <Image
              src="/assets/paceup-icon.png"
              alt="PaceUp"
              fill
              className="object-contain drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]"
              priority
            />
          </div>
          <span className="text-xl md:text-2xl font-display font-bold text-gradient-neon tracking-wide">PaceUp</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-text-secondary hover:text-accent-green transition-colors">
            Log in
          </Link>
          <Button asChild className="hidden sm:inline-flex bg-accent-green text-bg-primary hover:bg-accent-green/80 neon-focus font-bold">
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="z-10 w-full max-w-7xl px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-green/10 border border-accent-green/20 text-accent-green text-sm font-mono mb-8">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            PaceUp AI is now in Beta
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-bold text-text-primary leading-tight mb-6">
            The intelligent operating system for <span className="text-gradient-neon">high-performance teams.</span>
          </h1>

          <p className="text-text-secondary text-lg md:text-2xl mb-12 max-w-3xl leading-relaxed">
            Stop arguing over who does what. PaceUp analyzes your project brief, assigns optimal roles based on member skills, and holds everyone accountable until the product ships.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Button asChild size="lg" className="h-14 px-8 text-base font-bold bg-accent-green text-bg-primary hover:bg-accent-green/80 shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:shadow-[0_0_30px_rgba(57,255,20,0.5)] transition-all duration-300">
              <Link href="/sign-up">
                Start Building Free <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base font-bold border-border/50 bg-bg-secondary/50 backdrop-blur-md hover:bg-bg-secondary hover:text-text-primary transition-all duration-300">
              <Link href="#how-it-works">
                See How It Works
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Feature Showcase Image */}
      <section className="z-10 w-full max-w-6xl px-6 pb-32">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="relative w-full aspect-video rounded-2xl overflow-hidden border border-border/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent z-10" />
          <Image
            src="/assets/ai-dashboard.png"
            alt="PaceUp AI Dashboard Interface"
            fill
            className="object-cover"
          />
        </motion.div>
      </section>

      {/* Benefits Section */}
      <section id="how-it-works" className="z-10 w-full max-w-7xl px-6 py-24 bg-bg-secondary/30 border-y border-border/30">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-text-primary mb-4">How PaceUp works</h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            A streamlined workflow designed to eliminate friction, automate assignment, and ensure your project reaches the finish line.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              icon: Bot, 
              title: "1. AI Analysis", 
              desc: "Upload your project brief or type it directly. Our AI instantly parses requirements, dependencies, and deliverables.",
              color: "text-accent-blue",
              bg: "bg-accent-blue/10",
              border: "group-hover:border-accent-blue/50"
            },
            { 
              icon: Users, 
              title: "2. Smart Allocation", 
              desc: "PaceUp reads your team members' profiles and algorithmically assigns the most suitable roles and task chunks to each person.",
              color: "text-accent-magenta",
              bg: "bg-accent-magenta/10",
              border: "group-hover:border-accent-magenta/50"
            },
            { 
              icon: Target, 
              title: "3. Execution Tracking", 
              desc: "Live task boards and dynamic health gauges keep everyone accountable. Identify blockers before they become critical failures.",
              color: "text-accent-green",
              bg: "bg-accent-green/10",
              border: "group-hover:border-accent-green/50"
            }
          ].map((feature, i) => (
            <motion.div 
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`glass-card p-8 flex flex-col items-start text-left relative overflow-hidden group transition-all duration-300 ${feature.border}`}
            >
              <div className={`p-4 rounded-xl mb-6 ${feature.bg}`}>
                <feature.icon className={`w-8 h-8 ${feature.color}`} />
              </div>
              <h3 className="text-2xl font-display font-bold mb-3 text-text-primary">{feature.title}</h3>
              <p className="text-text-secondary leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Secondary Showcase */}
      <section className="z-10 w-full max-w-7xl px-6 py-32 flex flex-col md:flex-row items-center gap-16">
        <motion.div 
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full md:w-1/2"
        >
          <div className="relative aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden border border-border/50 ring-1 ring-white/5">
            <Image
              src="/assets/team-collaboration.png"
              alt="Digital Team Collaboration"
              fill
              className="object-cover"
            />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full md:w-1/2 flex flex-col space-y-6"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold text-text-primary leading-tight">
            Stop managing.<br/>Start shipping.
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed">
            Student teams and hackathon squads waste hours figuring out who should do what. PaceUp removes the friction of project management so you can focus entirely on writing code and building the product.
          </p>
          <ul className="space-y-4 mt-4">
            {[
              { icon: Zap, text: "Instant project scaffolding" },
              { icon: ShieldCheck, text: "No biased role assignments" },
              { icon: Activity, text: "Real-time health monitoring" }
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center border border-border/50">
                  <item.icon className="w-4 h-4 text-accent-gold" />
                </div>
                <span className="text-text-primary font-medium">{item.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="z-10 w-full max-w-4xl px-6 py-24 mb-12">
        <div className="glass-card p-12 text-center rounded-3xl relative overflow-hidden border border-accent-green/30">
          <div className="absolute inset-0 bg-accent-green/5" />
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-text-primary mb-6">
              Ready to accelerate your team?
            </h2>
            <p className="text-text-secondary text-lg mb-8 max-w-xl">
              Join thousands of developers building better projects, faster. PaceUp is entirely free during our beta period.
            </p>
            <Button asChild size="lg" className="h-14 px-10 text-lg font-bold bg-accent-green text-bg-primary hover:bg-accent-green/80 neon-focus transition-all duration-300">
              <Link href="/sign-up">
                Create Your Workspace
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full px-6 py-8 border-t border-border/30 bg-bg-primary flex flex-col md:flex-row items-center justify-between text-text-muted text-sm font-mono z-10">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <div className="w-5 h-5 relative grayscale opacity-50">
            <Image src="/assets/paceup-icon.png" alt="PaceUp" fill className="object-contain" />
          </div>
          <span>© {new Date().getFullYear()} PaceUp. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-accent-green transition-colors">Privacy</a>
          <a href="#" className="hover:text-accent-green transition-colors">Terms</a>
          <a href="https://github.com/1712Jeswin" target="_blank" rel="noopener noreferrer" className="hover:text-accent-green transition-colors">
            Built by Jeswin
          </a>
        </div>
      </footer>
    </main>
  );
}
