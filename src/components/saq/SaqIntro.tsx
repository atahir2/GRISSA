import Image from "next/image";
import Link from "next/link";
import { assetUrl } from "@/src/lib/base-path";
import { GrissaPageHeader } from "./GrissaPageHeader";

export function SaqIntro() {
  return (
    <main className="min-h-0 flex-1 bg-transparent pb-12">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <GrissaPageHeader
          title="GRISSA Home"
          description=""
        />
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50/40 p-8 shadow-sm">
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-2xl">
            Green Research Infrastructure Sustainability Self Assessment (GRISSA)
          </h2>
          <p className="mt-3 max-w-5xl text-slate-700">
           GRISSA is a structured self-assessment tool that helps organisations evaluate their sustainability maturity,
            identify improvement gaps, prioritise actions, and prepare a baseline for certification, standards
            alignment, regulatory readiness, and strategic sustainability planning. The GRISSA is not a certification
            system, rather it supports preparation and planning so you can get ready for audits, directives, or
            internal goals.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold tracking-wide text-slate-900">WHO IT’S FOR</h3>
              <p className="mt-2 text-sm text-slate-700">
                Research Infrastructures, Datacenters, Digital Infrastructures, and Organisations that need to
                understand their sustainability status and prepare for certification, standards, regulations,
                directives, or internal improvement planning.
              </p>
            </section>
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold tracking-wide text-slate-900">WHAT YOU GET</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li>Results overview: completion, capability levels, targets met</li>
                <li>Priority summary: high / medium / low improvement priorities</li>
                <li>Action plan: recommended actions with effort and implementation priority</li>
                <li>Print-friendly report: for stakeholders and certification-baseline discussion</li>
              </ul>
            </section>
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold tracking-wide text-slate-900">HOW IT HELPS</h3>
              <p className="mt-2 text-sm text-slate-700">
                Use the GRISSA to assess your current sustainability capability level, identify gaps and weak areas,
                understand improvement priorities and recommended actions, and estimate implementation effort. The
                outputs give you a structured baseline for future certification or standards-alignment pathways
                (e.g. ISO, ITU, etc.), regulatory readiness (e.g. EU directives), and internal sustainability
                strategy, so you can prioritise what to do next.
              </p>
            </section>
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold tracking-wide text-slate-900">HOW IT WORKS</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-green-100 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Step 1</p>
                  <p className="mt-1">Define scope and goals: Choose which topic areas are in scope and set optional target capability levels.</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-green-100 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Step 2</p>
                  <p className="mt-1">Answer the assessment: Rate your current capability (1–3) for each in-scope question.</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-green-100 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Step 3</p>
                  <p className="mt-1">Review dashboard and results: See completion, pass levels, targets met, and priority summaries.</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-green-100 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Step 4</p>
                  <p className="mt-1">Generate action plan and report: Get a prioritised action plan and export a PDF report for stakeholders.</p>
                </div>
              </div>
            </section>
          </div>
          <div className="mt-8">
            <Link
              href="/saq/manage"
              className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Proceed to Workspace
            </Link>
          </div>
        </section>

        <footer className="mt-8 rounded-3xl border border-slate-700 bg-slate-950 px-8 py-6 text-slate-200 shadow-sm shadow-black/20">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <p className="inline-block bg-gradient-to-r from-emerald-400 via-green-400 to-lime-300 bg-clip-text text-sm font-bold text-transparent transition-all duration-200 hover:from-emerald-300 hover:via-green-300 hover:to-lime-200">
                GRISSA
              </p>
              <p className="text-xs text-slate-300">
                Green Research Infrastructure Sustainability Self Assessment
              </p>
              <p className="mt-8 text-sm text-slate-300">
                GRISSA is developed in the context of sustainability-focused research and open digital infrastructure
                efforts aligned with the GreenDIGIT initiative and related collaboration partners.
                
              </p>
            </div>

            <div></div>
            
            <div>
              <p className="text-sm font-semibold text-slate-100">Acknowledgement</p>
              <p className="mt-2 text-sm text-slate-300">
                This work is funded from the European Union&apos;s Horizon Europe research and innovation programme
                through the{" "}
                <a
                  href="https://greendigit-project.eu/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-300 hover:underline"
                >
                  GreenDIGIT
                </a>{" "}
                project, under the grant agreement No.
                <a
                  href="https://cordis.europa.eu/project/id/101131207"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-300 hover:underline"
                >
                  101131207
                </a>
                .
              </p>
              
              <div className="mt-4 flex items-center gap-3">
                <Image
                  src={assetUrl("/acknowledgements/eu-funded.png")}
                  alt="Funded by the European Union"
                  width={200}
                  height={48}
                  className="h-10 w-auto"
                  unoptimized
                />
                <Image
                  src={assetUrl("/acknowledgements/greendigit.png")}
                  alt="GreenDIGIT project"
                  width={160}
                  height={40}
                  className="h-8 w-auto"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

