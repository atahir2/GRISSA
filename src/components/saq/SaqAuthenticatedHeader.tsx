"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { withBasePath } from "@/src/lib/base-path";

function sessionDisplayLabel(name?: string | null, email?: string | null) {
  if (name?.trim()) return name.trim();
  if (email?.trim()) return email.trim();
  return null;
}

export function SaqAuthenticatedHeader() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleLogout() {
    const home = `${window.location.origin}${withBasePath("/saq")}`;
    void signOut({ redirect: false })
      .then(() => {
        window.location.assign(home);
      })
      .catch(() => {
        window.location.assign(home);
      });
  }
  const versionId = searchParams.get("versionId");

  const homeActive = pathname === "/saq";
  const workspaceActive =
    pathname.startsWith("/saq/manage") ||
    pathname.startsWith("/saq/assessment") ||
    pathname.startsWith("/saq/dashboard") ||
    pathname.startsWith("/saq/report") ||
    pathname.startsWith("/saq/team-access") ||
    pathname.startsWith("/saq/versioning");

  const parts = pathname.split("/").filter(Boolean);
  const assessmentId =
    parts[1] === "assessment" || parts[1] === "dashboard" || parts[1] === "report" || parts[1] === "manage"
      ? parts[2]
      : undefined;

  const contextualLinks: Array<{ href: string; label: string }> = [];
  let breadcrumbLabel: string | null = null;
  if (assessmentId && (parts[1] === "assessment" || parts[1] === "dashboard" || parts[1] === "report")) {
    if (parts[1] !== "assessment") {
      contextualLinks.push({
        href: `/saq/assessment/${assessmentId}${versionId ? `?versionId=${versionId}` : ""}`,
        label: "Back to assessment",
      });
    }
    if (parts[1] !== "dashboard") {
      contextualLinks.push({
        href: `/saq/dashboard/${assessmentId}${versionId ? `?versionId=${versionId}` : ""}`,
        label: "Dashboard",
      });
    }
    if (parts[1] !== "report") {
      contextualLinks.push({
        href: `/saq/report/${assessmentId}${versionId ? `?versionId=${versionId}` : ""}`,
        label: "Report",
      });
    }
  }
  if (assessmentId && parts[1] === "manage") {
    breadcrumbLabel = "Workspace > Team & Access / Versioning";
    contextualLinks.push(
      { href: `/saq/assessment/${assessmentId}`, label: "Open assessment" },
      { href: `/saq/dashboard/${assessmentId}`, label: "Dashboard" },
      { href: `/saq/report/${assessmentId}`, label: "Report" }
    );
  }
  if (parts[1] === "team-access") {
    breadcrumbLabel = "Workspace > Team & Access";
  }
  if (parts[1] === "versioning") {
    breadcrumbLabel = "Workspace > Versioning";
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[96rem] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <div className="mr-2 shrink-0">
            <Link
              href="/saq"
              className="inline-block bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 bg-clip-text text-sm font-bold text-transparent transition-all duration-200 hover:from-emerald-500 hover:via-green-500 hover:to-lime-500"
            >
              GRISSA
            </Link>
            <p className="text-[11px] text-slate-500">Green Research Infrastructure Sustainability Self Assessment</p>
          </div>
          <Link
            href="/saq"
            className={`rounded-md px-2.5 py-1 text-sm font-medium ${
              homeActive
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Home
          </Link>
          <Link
            href="/saq/manage"
            className={`rounded-md px-2.5 py-1 text-sm font-medium ${
              workspaceActive
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Workspace
          </Link>
          {breadcrumbLabel && (
            <span className="max-w-[16rem] truncate rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 lg:max-w-[22rem]">
              {breadcrumbLabel}
            </span>
          )}
          {contextualLinks.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              className="shrink-0 rounded-md px-2.5 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status === "loading" ? (
            <div
              className="h-8 w-[10rem] animate-pulse rounded-md bg-slate-100"
              aria-hidden
            />
          ) : status === "authenticated" ? (
            <>
              <p className="whitespace-nowrap text-sm text-slate-600">
                Signed in as{" "}
                <span className="font-medium text-slate-900">
                  {sessionDisplayLabel(session?.user?.name, session?.user?.email) ??
                    "your account"}
                </span>
              </p>
              <button type="button" onClick={handleLogout} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
                Logout
              </button>
            </>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-lg border border-emerald-600 bg-emerald-600 px-2.5 py-1 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

