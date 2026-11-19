import { AuthForm } from "@/modules/auth/components/auth-form";

export const instant = false;

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-background relative selection:bg-primary/20 selection:text-primary">
      {/* Background glow accent */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[130px] dark:bg-primary/15" />
      </div>

      <AuthForm />
    </div>
  );
}
