"use client";

import { useEffect, useState } from "react";
import { INDUSTRIES } from "@/src/lib/auth/organisation-profile";
import { getStandardsCatalog, standardMatchesBaseline } from "@/src/lib/saq/standards.repository";
import type { StandardKind } from "@/src/lib/saq/standards.types";

const KIND_LABEL: Record<StandardKind, string> = {
  standard: "Standard",
  regulation: "Regulation",
  directive: "Directive",
  certification: "Certification",
};

const CATEGORIES: Array<{ id: "" | StandardKind; label: string }> = [
  { id: "", label: "All categories" },
  { id: "standard", label: "Standards" },
  { id: "regulation", label: "Regulations" },
  { id: "directive", label: "Directives" },
  { id: "certification", label: "Certifications" },
];

interface StandardsPortalProps {
  initialIndustry?: string | null;
}

export function StandardsPortal({ initialIndustry = null }: StandardsPortalProps) {
  const [category, setCategory] = useState<"" | StandardKind>("");
  const [industry, setIndustry] = useState(initialIndustry ?? "");

  useEffect(() => {
    if (initialIndustry) setIndustry(initialIndustry);
  }, [initialIndustry]);
  const visible = getStandardsCatalog().filter((entry) => {
    if (category && entry.kind !== category) return false;
    if (industry && !standardMatchesBaseline(entry, industry, "")) {
      return false;
    }
    return true;
  });

  return (
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="standards-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="standards-heading" className="text-xl font-semibold text-slate-900">
            Standards, regulations, and directives
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Choose a category to see what each one is for. Industry narrows the list to this organisation. Each card links to the official source.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm font-medium text-slate-700">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as "" | StandardKind)}
              className="mt-1 block min-w-[12rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {CATEGORIES.map((item) => (
                <option key={item.label} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Industry
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="mt-1 block min-w-[12rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">All industries</option>
              {INDUSTRIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">Nothing in this category matches the selected industry.</p>
      ) : (
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {visible.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                  {KIND_LABEL[entry.kind]}
                </span>
                <span className="text-[11px] text-slate-500">{entry.audiences.join(" · ")}</span>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-slate-900">{entry.name}</h3>
              <p className="mt-1 text-sm text-slate-700">{entry.summary}</p>
              <a
                href={entry.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-sm font-medium text-emerald-700 hover:underline"
              >
                Official source
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
