/**
 * Informational banner for the GRISSA / SAQ workspace (`/saq/*`).
 */
export function BetaBanner() {
  return (
    <div
      role="status"
      className="border-b border-amber-500/35 bg-gradient-to-r from-amber-950/90 via-amber-900/95 to-amber-950/90 px-4 py-2 text-center text-xs leading-snug text-amber-100 sm:text-[13px] sm:leading-normal"
    >
      <strong className="font-semibold text-amber-50">Beta Version</strong>
      {" — "}
      This release is under active development; more features and improvements
      are on the way. Your feedback is welcome.
    </div>
  );
}
