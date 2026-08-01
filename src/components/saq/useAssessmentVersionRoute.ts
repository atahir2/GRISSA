"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listAssessmentVersions } from "@/src/lib/saq/assessment.repository";
import type { AssessmentVersion } from "@/src/lib/saq/assessment.types";

/**
 * Loads versions for an assessment, resolves the active version from the `versionId` query param
 * (default: latest by version number), and syncs the URL when the param is missing.
 */
export function useAssessmentVersionRoute(assessmentId: string | undefined) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const versionIdParam = searchParams.get("versionId");
  const [versions, setVersions] = useState<AssessmentVersion[]>([]);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(!!assessmentId);

  const loadVersions = useCallback(async () => {
    if (!assessmentId) return;
    setVersionError(null);
    setVersionsLoading(true);
    try {
      const list = await listAssessmentVersions(assessmentId);
      setVersions(list);
      if (list.length === 0) {
        setVersionError("No versions found for this assessment. Apply database migrations if needed.");
      }
    } catch (e) {
      setVersionError(e instanceof Error ? e.message : "Failed to load versions.");
    } finally {
      setVersionsLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const effectiveVersionId = useMemo(() => {
    if (!versions.length) return null;
    if (versionIdParam && versions.some((v) => v.id === versionIdParam)) return versionIdParam;
    return versions[versions.length - 1].id;
  }, [versions, versionIdParam]);

  const currentVersion = useMemo(
    () =>
      effectiveVersionId
        ? versions.find((v) => v.id === effectiveVersionId) ?? null
        : null,
    [versions, effectiveVersionId]
  );

  useEffect(() => {
    if (!assessmentId || !pathname || !effectiveVersionId) return;
    if (!versionIdParam) {
      router.replace(`${pathname}?versionId=${effectiveVersionId}`);
    }
  }, [assessmentId, pathname, effectiveVersionId, versionIdParam, router]);

  const navigateToVersion = useCallback(
    (versionId: string) => {
      if (!pathname) return;
      router.push(`${pathname}?versionId=${versionId}`);
    },
    [pathname, router]
  );

  return {
    versions,
    versionsLoading,
    versionError,
    effectiveVersionId,
    currentVersion,
    reloadVersions: loadVersions,
    navigateToVersion,
  };
}
