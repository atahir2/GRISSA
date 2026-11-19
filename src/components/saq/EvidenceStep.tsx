"use client";

import { useState } from "react";
import type { EvidenceFileRecord, QuestionEvidence } from "@/src/lib/saq/assessment.types";
import type { AssessmentAnswer, ScopeSelection } from "@/src/lib/saq/engine/results";
import {
  buildEvidenceReadiness,
  type EvidenceChecklistItem,
} from "@/src/lib/saq/engine/evidence";
import type { Question, Theme } from "@/src/lib/saq/questionnaire.types";
import { deleteEvidenceFile, uploadEvidenceFile } from "@/src/lib/saq/assessment.repository";
import { withBasePath } from "@/src/lib/base-path";
import { SectionHeader } from "./SectionHeader";

interface EvidenceStepProps {
  assessmentId?: string;
  versionId?: string;
  themes: Theme[];
  questions: Question[];
  scopeSelections: ScopeSelection[];
  answers: AssessmentAnswer[];
  evidence: QuestionEvidence[];
  files: EvidenceFileRecord[];
  onEvidenceChange: (evidence: QuestionEvidence[]) => void;
  onFilesChange: (files: EvidenceFileRecord[]) => void;
  readOnly?: boolean;
}

function evidenceFor(questionId: string, evidence: QuestionEvidence[]): QuestionEvidence {
  return (
    evidence.find((item) => item.questionId === questionId) ?? {
      questionId,
      notes: "",
      presentKeys: [],
    }
  );
}

function Checklist({
  items,
  tone,
  record,
  readOnly,
  onToggle,
}: {
  items: EvidenceChecklistItem[];
  tone: "recorded" | "target";
  record: QuestionEvidence;
  readOnly: boolean;
  onToggle: (presentKeys: string[]) => void;
}) {
  const levels = [1, 2, 3].filter((level) => items.some((item) => item.supportsLevel === level));
  if (levels.length === 0) return null;
  return (
    <div className="space-y-3">
      {levels.map((level) => (
        <div key={level} className="space-y-2">
          <p className="text-sm font-medium text-slate-900">To achieve level {level}:</p>
          <ol className="list-decimal space-y-2 pl-5">
            {items
              .filter((item) => item.supportsLevel === level)
              .map((item) => {
                const open = !item.present;
                return (
                  <li key={item.key}>
                    <label
                      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                        open && tone === "recorded"
                          ? "border-amber-300 bg-amber-50"
                          : open
                            ? "border-sky-200 bg-sky-50"
                            : "border-slate-200 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={record.presentKeys.includes(item.key)}
                        disabled={readOnly}
                        onChange={(event) => {
                          const presentKeys = event.target.checked
                            ? [...record.presentKeys, item.key]
                            : record.presentKeys.filter((key) => key !== item.key);
                          onToggle(presentKeys);
                        }}
                      />
                      <span>
                        {item.text}
                        {open && tone === "recorded" ? (
                          <span className="mt-0.5 block text-xs text-slate-600">
                            Still needed to support the level you recorded.
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
          </ol>
        </div>
      ))}
    </div>
  );
}

export function EvidenceStep({
  assessmentId,
  versionId,
  themes,
  questions,
  scopeSelections,
  answers,
  evidence,
  files,
  onEvidenceChange,
  onFilesChange,
  readOnly = false,
}: EvidenceStepProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const readiness = buildEvidenceReadiness(themes, questions, scopeSelections, answers, evidence);

  const updateQuestion = (questionId: string, patch: Partial<QuestionEvidence>) => {
    if (readOnly) return;
    const current = evidenceFor(questionId, evidence);
    const next = evidence.filter((item) => item.questionId !== questionId);
    next.push({ ...current, ...patch, questionId });
    onEvidenceChange(next);
  };

  const upload = async (questionId: string, file: File | undefined) => {
    if (!file || !assessmentId || !versionId || readOnly) return;
    setBusyKey(questionId);
    setFileError(null);
    try {
      const saved = await uploadEvidenceFile(assessmentId, versionId, questionId, file);
      onFilesChange([...files, saved]);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusyKey(null);
    }
  };

  const removeFile = async (fileId: string) => {
    if (readOnly) return;
    setBusyKey(fileId);
    setFileError(null);
    try {
      await deleteEvidenceFile(fileId);
      onFilesChange(files.filter((file) => file.id !== fileId));
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Could not remove the file.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Evidence"
        subtitle="Open a question to add its evidence. The level you recorded stays as it is."
      />
      {fileError ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{fileError}</p> : null}
      {readiness.map((theme) => (
        <section key={theme.themeId} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-base font-semibold text-slate-900">{theme.themeTitle}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {theme.questions.map((question) => {
              const record = evidenceFor(question.questionId, evidence);
              const questionFiles = files.filter((file) => file.questionId === question.questionId);
              const fileLabel =
                questionFiles.length === 0
                  ? "No file"
                  : `${questionFiles.length} file${questionFiles.length === 1 ? "" : "s"}`;
              return (
                <details key={question.questionId} className="group">
                  <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {question.questionCode}
                          {question.selectedScore ? (
                            <span className="font-normal text-slate-500"> · Current level {question.selectedScore}</span>
                          ) : null}
                          {question.targetScore ? (
                            <span className="font-normal text-slate-500"> · Target level {question.targetScore}</span>
                          ) : null}
                        </p>
                        {question.evidenceExpected ? (
                          <p className="mt-0.5 truncate text-sm text-slate-600">
                            <span className="font-medium text-slate-800">Evidence required: </span>
                            {question.evidenceExpected}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs text-slate-500">{fileLabel}</span>
                    </div>
                  </summary>
                  <div className="space-y-3 px-4 pb-4">
                    <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-slate-900">
                      {question.questionText}
                    </p>
                    {question.hasChecklist ? (
                      <>
                        <Checklist
                          items={question.recordedItems}
                          tone="recorded"
                          record={record}
                          readOnly={readOnly}
                          onToggle={(presentKeys) => updateQuestion(question.questionId, { presentKeys })}
                        />
                        <Checklist
                          items={question.targetItems}
                          tone="target"
                          record={record}
                          readOnly={readOnly}
                          onToggle={(presentKeys) => updateQuestion(question.questionId, { presentKeys })}
                        />
                      </>
                    ) : null}
                    <label className="block text-sm text-slate-700">
                      Notes
                      <textarea
                        value={record.notes}
                        disabled={readOnly}
                        rows={2}
                        onChange={(event) => updateQuestion(question.questionId, { notes: event.target.value })}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50"
                      />
                    </label>
                    <div className="space-y-2">
                      {questionFiles.map((file) => (
                        <div key={file.id} className="flex flex-wrap items-center gap-3 text-sm">
                          <a
                            href={withBasePath(`/api/saq/evidence/${file.id}`)}
                            className="font-medium text-emerald-700 hover:underline"
                          >
                            {file.fileName}
                          </a>
                          <span className="text-xs text-slate-500">
                            {Math.max(1, Math.round(file.sizeBytes / 1024))} KB
                          </span>
                          {!readOnly ? (
                            <button
                              type="button"
                              disabled={busyKey === file.id}
                              onClick={() => void removeFile(file.id)}
                              className="text-xs font-medium text-slate-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      ))}
                      {!readOnly && assessmentId && versionId ? (
                        <div>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.docx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            disabled={busyKey === question.questionId}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.target.value = "";
                              void upload(question.questionId, file);
                            }}
                            className="block text-sm text-slate-600"
                          />
                          <p className="mt-1 text-xs text-slate-500">PDF, PNG, JPG, or DOCX, up to 10 MB.</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
