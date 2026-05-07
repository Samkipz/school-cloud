import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — School Cloud",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f0fdf4] via-[#f8f9fc] to-[#eff6ff] p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#10b981] shadow-md mb-2">
            <span className="text-white font-bold text-lg">SC</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#0f172a]">Welcome to School Cloud</h1>
          <p className="text-sm text-[#64748b] leading-relaxed">
            Sign in with your <span className="font-medium text-[#475569]">school phone number</span> (same format
            you use for WhatsApp, e.g. 0712… or +254712…). If you do not have an account yet, ask your school admin
            to invite you.
          </p>
        </div>

        <div className="rounded-2xl border border-[#bbf7d0] bg-white shadow-lg shadow-[#10b981]/10 p-1 sm:p-2">
          <SignIn
            routing="path"
            path="/sign-in"
            fallbackRedirectUrl="/"
            appearance={{
              layout: { socialButtonsPlacement: "bottom", shimmer: true },
              variables: {
                colorPrimary: "#10b981",
                colorText: "#0f172a",
                colorTextSecondary: "#64748b",
                colorBackground: "#ffffff",
                borderRadius: "0.75rem",
              },
              elements: {
                card: "shadow-none border-0",
                headerTitle: "text-[#0f172a] font-semibold",
                headerSubtitle: "text-[#64748b] text-sm",
                formButtonPrimary: "bg-gradient-to-r from-[#10b981] to-[#059669] hover:opacity-95",
                footerActionLink: "text-[#059669] font-medium",
                identityPreviewText: "text-[#0f172a]",
                formFieldLabel: "text-[#475569] text-sm",
                dividerLine: "bg-[#e3e6ef]",
                dividerText: "text-[#94a3b8]",
              },
            }}
          />
        </div>

        <p className="text-center text-xs text-[#64748b] px-2">
          Cannot find your account? Contact your school administrator for access, or use your provider&apos;s
          recovery options if you forgot your sign-in identifier.
        </p>
      </div>
    </div>
  );
}
