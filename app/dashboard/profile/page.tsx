import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/user";
import Link from "next/link";
import type { ExtendedProfileData } from "@/types";
import { Github, Linkedin, Globe, MapPin, Briefcase, GraduationCap } from "lucide-react";

export default async function ProfileSummaryPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  const user = await getOrCreateUser(clerkId);

  if (!user || !user.profileData) {
    redirect("/dashboard/profile/setup");
  }

  const profile = user.profileData as unknown as ExtendedProfileData;
  const domains = (user.domains as unknown as string[]) || [];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-6 md:p-12 font-body selection:bg-accent-green/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Top Header Card */}
        <div className="relative group overflow-hidden rounded-none border border-border/50 bg-bg-secondary/40 backdrop-blur-xl p-8">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-green via-accent-blue to-accent-magenta opacity-70" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6">
              {/* Avatar Placeholder with Neon Glow */}
              <div className="relative">
                <div className="absolute -inset-1 bg-accent-blue opacity-30 blur-xl rounded-full" />
                <div className="w-24 h-24 rounded-full bg-bg-tertiary border-2 border-accent-blue flex items-center justify-center relative z-10 overflow-hidden">
                  <span className="text-3xl font-display font-bold text-accent-blue">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
                  {user.name}
                </h1>
                <p className="text-accent-green font-mono text-sm mt-1 mb-3">
                  {profile.headline}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text-secondary">
                  {profile.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-accent-magenta" />
                      {profile.location}
                    </div>
                  )}
                  {profile.currentRole && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase size={14} className="text-accent-gold" />
                      {profile.currentRole}
                    </div>
                  )}
                  {profile.education && (
                    <div className="flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-accent-blue" />
                      {profile.education}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Link
              href="/dashboard/profile/setup"
              className="group/btn relative px-6 py-2.5 bg-accent-green text-bg-primary font-mono text-sm font-bold uppercase tracking-wider overflow-hidden hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all duration-300"
            >
              <div className="absolute inset-0 w-0 bg-white/20 transition-all duration-300 ease-out group-hover/btn:w-full" />
              <span className="relative">Edit Profile</span>
            </Link>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Main Content (Left) */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Bio Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-[1px] w-8 bg-accent-magenta" />
                <h2 className="text-sm font-display uppercase tracking-[0.2em] text-text-secondary">
                  Biography
                </h2>
              </div>
              <p className="text-text-primary leading-relaxed bg-bg-tertiary/20 p-6 border-l-2 border-accent-magenta/50 backdrop-blur-md">
                {profile.bio}
              </p>
            </section>

            {/* Experience & Projects (Optional, if any exist) */}
            {profile.previousProjects && profile.previousProjects.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-[1px] w-8 bg-accent-blue" />
                  <h2 className="text-sm font-display uppercase tracking-[0.2em] text-text-secondary">
                    Notable Projects
                  </h2>
                </div>
                <div className="grid gap-4">
                  {profile.previousProjects.map((proj, idx) => (
                    <div key={idx} className="p-4 border border-border/40 bg-bg-secondary/20 hover:bg-bg-tertiary/40 transition-colors">
                      <h3 className="font-bold text-accent-blue mb-1">{proj.name}</h3>
                      <p className="text-sm text-text-secondary">{proj.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            
          </div>

          {/* Sidebar (Right) */}
          <div className="space-y-8">
            
            {/* Links */}
            <section className="space-y-4">
              <h2 className="text-sm font-display uppercase tracking-[0.2em] text-text-secondary border-b border-border/50 pb-2">
                Connect
              </h2>
              <div className="flex gap-4">
                {profile.githubUrl && (
                  <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center border border-border/50 hover:border-accent-gold hover:text-accent-gold transition-colors bg-bg-tertiary/30">
                    <Github size={18} />
                  </a>
                )}
                {profile.linkedinUrl && (
                  <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center border border-border/50 hover:border-accent-blue hover:text-accent-blue transition-colors bg-bg-tertiary/30">
                    <Linkedin size={18} />
                  </a>
                )}
                {profile.portfolioUrl && (
                  <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center border border-border/50 hover:border-accent-magenta hover:text-accent-magenta transition-colors bg-bg-tertiary/30">
                    <Globe size={18} />
                  </a>
                )}
              </div>
            </section>

            {/* Tech Skills */}
            <section className="space-y-4">
              <h2 className="text-sm font-display uppercase tracking-[0.2em] text-text-secondary border-b border-border/50 pb-2">
                Tech Stack
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.languageProficiencies?.map((lang, idx) => (
                  <span key={idx} className="px-2.5 py-1 text-xs font-mono bg-accent-green/10 text-accent-green border border-accent-green/30">
                    {lang.language}
                  </span>
                ))}
                {profile.frameworks?.map((fw, idx) => (
                  <span key={idx} className="px-2.5 py-1 text-xs font-mono bg-bg-tertiary border border-border/80 text-text-primary">
                    {fw}
                  </span>
                ))}
                {profile.tools?.map((tool, idx) => (
                  <span key={idx} className="px-2.5 py-1 text-xs font-mono bg-bg-tertiary border border-border/80 text-text-primary">
                    {tool}
                  </span>
                ))}
              </div>
            </section>

            {/* Domains */}
            {domains.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-sm font-display uppercase tracking-[0.2em] text-text-secondary border-b border-border/50 pb-2">
                  Domain Areas
                </h2>
                <div className="flex flex-wrap gap-2">
                  {domains.map((domain, idx) => (
                    <span key={idx} className="px-2.5 py-1 text-xs font-mono bg-accent-blue/10 text-accent-blue border border-accent-blue/30">
                      {domain}
                    </span>
                  ))}
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
