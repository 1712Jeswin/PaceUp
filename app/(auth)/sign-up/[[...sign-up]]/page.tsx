import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="animate-fade-in">
        <SignUp
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
