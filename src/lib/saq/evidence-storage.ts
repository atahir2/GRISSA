import { promises as fs } from "fs";
import path from "path";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED = new Map<string, string>([
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
]);

export function evidenceRoot(): string {
  const configured = process.env.SAQ_EVIDENCE_DIR?.trim();
  return path.resolve(configured && configured.length > 0 ? configured : path.join(process.cwd(), "data", "evidence"));
}

function assertUuid(value: string, label: string): void {
  if (!UUID.test(value)) {
    throw new Error(`Invalid ${label}.`);
  }
}

export function evidenceExtension(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  if (!ALLOWED.has(extension)) {
    throw new Error("Upload a PDF, PNG, JPG, or DOCX file.");
  }
  return extension === ".jpeg" ? ".jpg" : extension;
}

export function evidenceContentType(extension: string): string {
  const type = ALLOWED.get(extension === ".jpg" ? ".jpg" : extension);
  if (!type) {
    throw new Error("Upload a PDF, PNG, JPG, or DOCX file.");
  }
  return type;
}

export function displayFileName(fileName: string): string {
  const base = path.basename(fileName).replace(/[^\w.\- ()]/g, "_").slice(0, 180);
  return base.length > 0 ? base : "evidence";
}

export function evidenceFilePath(assessmentId: string, versionId: string, storedName: string): string {
  assertUuid(assessmentId, "assessment");
  assertUuid(versionId, "version");
  if (!/^[0-9a-f-]{36}\.(pdf|png|jpg|docx)$/i.test(storedName)) {
    throw new Error("Invalid evidence file name.");
  }
  const root = evidenceRoot();
  const full = path.resolve(root, assessmentId, versionId, storedName);
  const relative = path.relative(root, full);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid evidence path.");
  }
  return full;
}

export async function writeEvidenceBytes(
  assessmentId: string,
  versionId: string,
  storedName: string,
  bytes: Buffer,
): Promise<void> {
  if (bytes.length === 0 || bytes.length > EVIDENCE_MAX_BYTES) {
    throw new Error("Evidence files must be under 10 MB.");
  }
  const full = evidenceFilePath(assessmentId, versionId, storedName);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, bytes);
}

export async function readEvidenceBytes(
  assessmentId: string,
  versionId: string,
  storedName: string,
): Promise<Buffer> {
  return fs.readFile(evidenceFilePath(assessmentId, versionId, storedName));
}

export async function removeEvidenceFile(
  assessmentId: string,
  versionId: string,
  storedName: string,
): Promise<void> {
  await fs.rm(evidenceFilePath(assessmentId, versionId, storedName), { force: true });
}

export async function removeEvidenceTree(assessmentId: string, versionId?: string): Promise<void> {
  assertUuid(assessmentId, "assessment");
  const root = evidenceRoot();
  const target = versionId
    ? path.resolve(root, assessmentId, versionId)
    : path.resolve(root, assessmentId);
  if (versionId) assertUuid(versionId, "version");
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return;
  await fs.rm(target, { recursive: true, force: true });
}
