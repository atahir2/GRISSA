import { Suspense, type ReactNode } from "react";
import { BetaBanner } from "@/src/components/saq/BetaBanner";
import { SaqAuthenticatedHeader } from "@/src/components/saq/SaqAuthenticatedHeader";

/** Matches header chrome so layout does not jump while search-params hydrate (Next.js CSR bailout). */
function SaqHeaderFallback() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[96rem] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="h-10 w-48 max-w-full animate-pulse rounded-md bg-slate-100" aria-hidden />
        <div className="h-8 w-40 shrink-0 animate-pulse rounded-md bg-slate-100" aria-hidden />
      </div>
    </header>
  );
}

export default function SaqLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-900">
      <BetaBanner />
      <Suspense fallback={<SaqHeaderFallback />}>
        <SaqAuthenticatedHeader />
      </Suspense>
      <div className="flex w-full flex-1 flex-col">{children}</div>
    </div>
  );
}

