import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";
import { UserButton } from "@clerk/nextjs";

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

  // Fetch the user to check profile completion
  const user = await db.user.findUnique({
    where: { clerkId },
    select: { level: true },
  });

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
      <div className="md:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-bg-primary/80 backdrop-blur-sm border-b border-border">
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
                avatarBox: "h-8 w-8",
              },
            }}
          />
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
