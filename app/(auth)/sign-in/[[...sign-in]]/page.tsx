import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="animate-fade-in">
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-bg-secondary border border-border shadow-none",
            },
          }}
        />
      </div>
    </main>
  );
}
