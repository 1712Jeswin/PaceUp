import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center animate-fade-in">
        {/* Logo / Title */}
        <h1 className="text-5xl font-display font-bold tracking-tight mb-2">
          <span className="text-gradient-neon">PaceUp</span>
        </h1>
        <p className="text-text-secondary text-lg mb-8 font-body">
          Built for teams that actually want to finish.
        </p>

        {/* Tagline */}
        <p className="text-text-primary text-xl mb-12 leading-relaxed max-w-lg mx-auto">
          An AI project leader for student teams. Submit your brief, get roles
          assigned based on skills, and let the AI hold everyone accountable
          until the project ships.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-accent-green text-bg-primary font-display font-semibold text-sm tracking-wide hover:bg-accent-green/90 active:scale-[0.97] transition-all duration-200"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg border border-border text-text-primary font-display font-semibold text-sm tracking-wide neon-hover transition-all duration-200"
          >
            Sign In
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-16 flex flex-wrap gap-3 justify-center">
          {[
            "AI Task Assignment",
            "BYOK — Bring Your Own Key",
            "Skill-Based Roles",
            "Invite Code Groups",
            "Project Health Score",
          ].map((feature) => (
            <span
              key={feature}
              className="px-3 py-1 rounded-full text-xs font-mono border border-border text-text-secondary"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* Footer credit */}
      <footer className="absolute bottom-6 text-text-muted text-xs font-mono">
        Built by{" "}
        <a
          href="https://github.com/1712Jeswin"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-secondary hover:text-accent-green transition-colors"
        >
          Jeswin
        </a>
      </footer>
    </main>
  );
}
