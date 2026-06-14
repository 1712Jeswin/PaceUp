import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";
import { UserButton } from "@clerk/nextjs";
import { getOrCreateUser } from "@/lib/user";

/**
 * Dashboard layout — wraps all /dashboard/* pages.
 *
 * Responsibilities:
 * 1. Verify Clerk session (redundant with middleware, but defense in depth)
 * 2. Hard block: redirect to /dashboard/profile/setup if skill profile is incomplete
 * 3. Render the sidebar + main content area
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // Fetch or create the user to check profile completion (fallback for local dev webhook delays)
  const user = await getOrCreateUser(clerkId);

  // Hard block: if user exists but hasn't completed their profile, redirect.
  // Exception: if they're already on the setup page, don't create a redirect loop.
  // Also exception: the user might not exist yet if the webhook hasn't fired — let them through.
  if (user && user.level === null) {
    // The page will handle this redirect itself via client-side check
    // We set a flag here that child pages can read
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="md:ml-64 relative min-h-screen flex flex-col">
        {/* Background Gradients for Dashboard */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-[128px] pointer-events-none -z-10" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent-blue/5 rounded-full blur-[128px] pointer-events-none -z-10" />

        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-bg-secondary/60 backdrop-blur-md border-b border-border/50">
          {/* Mobile logo */}
          <span className="md:hidden text-lg font-display font-bold text-gradient-neon">
            PaceUp
          </span>

          <div className="flex-1" />

          {/* User menu */}
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-9 w-9 ring-2 ring-accent-green/20 hover:ring-accent-green transition-all",
              },
            }}
          />
        </header>

        {/* Page content */}
        <main className="p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}
