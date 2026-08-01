"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { AssessmentResults, ThemeResultSummary } from "@/src/lib/saq/engine/results";
import type { ActionPlan, ActionItem } from "@/src/lib/saq/engine/actions";
import type { AssessmentInterpretation, ReadinessLevel } from "@/src/lib/saq/engine/interpretation";

// Web-aligned palette (Tailwind slate, rose, amber, emerald, sky)
const colors = {
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8", 
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  rose: { 50: "#fff1f2", 200: "#fecdd3", 400: "#fb7185", 600: "#e11d48", 700: "#be123c", 800: "#9f1239" },
  amber: { 50: "#fffbeb", 200: "#fde68a", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309", 800: "#92400e", 900: "#78350f" },
  emerald: { 50: "#ecfdf5", 200: "#a7f3d0", 500: "#10b981", 600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b", 950: "#022c22" },
  sky: { 50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 800: "#075985", 900: "#0c4a6e" },
  green: { 500: "#22c55e" },
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    paddingBottom: 48,
    fontSize: 10,
    color: colors.slate[700],
  },
  // Cover
  coverPage: { padding: 36, paddingBottom: 48, fontSize: 10 },
  coverBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: colors.green[500],
  },
  coverTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 28,
    color: colors.slate[900],
    letterSpacing: -0.5,
  },
  coverSubtitle: { fontSize: 11, color: colors.slate[600], marginTop: 6 },
  coverMetaWrap: { marginTop: 20 },
  coverMetaRow: { flexDirection: "row", marginTop: 4 },
  coverMetaLabel: { fontSize: 10, fontWeight: "bold", color: colors.slate[700], marginRight: 4 },
  coverMetaValue: { fontSize: 10, color: colors.slate[900] },
  coverFooter: {
    position: "absolute",
    bottom: 28,
    left: 36,
    right: 36,
    fontSize: 8,
    color: colors.slate[500],
    textAlign: "center",
  },
  // Sections (match ReportSection: border-t, pt)
  section: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
  },
  sectionFirst: { marginTop: 0, paddingTop: 0, borderTopWidth: 0 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: colors.slate[900],
    letterSpacing: -0.3,
  },
  subsectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 8,
    color: colors.slate[800],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  body: { fontSize: 10, color: colors.slate[700], marginBottom: 6, lineHeight: 1.45 },
  bodyBold: { fontSize: 10, fontWeight: "bold", color: colors.slate[900], marginRight: 4 },

  // Readiness hero (ReadinessHeroCard)
  heroCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 14,
  },
  heroInner: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  heroLeft: { flex: 1, minWidth: 200 },
  heroLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.slate[700],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroSummary: { fontSize: 10, color: colors.slate[800], lineHeight: 1.5, marginTop: 8 },
  heroStats: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: 180 },
  heroStat: {
    flex: 1,
    minWidth: 80,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  heroStatLabel: { fontSize: 8, fontWeight: "bold", color: colors.slate[500], textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 },
  heroStatValue: { fontSize: 14, fontWeight: "bold", color: colors.slate[900] },

  // Summary cards (ReportSummaryCard)
  cardRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  card: {
    padding: 12,
    backgroundColor: colors.slate[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[200],
    minWidth: 90,
  },
  cardLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.slate[500],
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  cardValue: { fontSize: 12, fontWeight: "bold", color: colors.slate[900] },

  // Strengths / Improvement panels (StrengthsImprovementPanel)
  twoCol: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 14 },
  strengthsPanel: {
    flex: 1,
    minWidth: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.emerald[200],
    backgroundColor: "rgba(236, 253, 245, 0.7)",
    padding: 16,
  },
  improvementPanel: {
    flex: 1,
    minWidth: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.amber[200],
    backgroundColor: "rgba(255, 251, 235, 0.7)",
    padding: 16,
  },
  panelTitle: { fontSize: 9, fontWeight: "bold", color: colors.slate[800], textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  panelTitleEmerald: { color: colors.emerald[900] },
  panelTitleAmber: { color: colors.amber[900] },
  panelDesc: { fontSize: 9, color: colors.slate[600], marginBottom: 8 },
  bulletList: { marginLeft: 4 },
  bulletItem: { flexDirection: "row", marginBottom: 6, alignItems: "flex-start" },
  bulletIcon: { width: 14, height: 14, borderRadius: 7, marginRight: 8, marginTop: 2, alignItems: "center", justifyContent: "center" },
  bulletIconText: { fontSize: 8, fontWeight: "bold", color: "white" },
  bulletText: { flex: 1, fontSize: 10, lineHeight: 1.4, color: colors.slate[800] },

  // Readiness meaning + legend
  meaningBox: { marginTop: 8, marginBottom: 10 },
  legendBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: "rgba(248, 250, 252, 0.7)",
    fontSize: 9,
    color: colors.slate[600],
    lineHeight: 1.4,
  },

  // Theme snapshot (ThemeReadinessSnapshot)
  snapshotCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: "#ffffff",
    padding: 18,
    marginBottom: 14,
  },
  snapshotTitle: { fontSize: 11, fontWeight: "bold", color: colors.slate[900], marginBottom: 4 },
  snapshotDesc: { fontSize: 9, color: colors.slate[600], marginBottom: 12 },
  snapshotRow: { marginBottom: 10 },
  snapshotRowInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  snapshotThemeName: { fontSize: 10, fontWeight: "bold", color: colors.slate[800], flex: 1 },
  snapshotScore: { fontSize: 10, color: colors.slate[700], marginRight: 8 },
  snapshotChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.slate[200],
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4 },

  // Theme cards (ReportThemeCard)
  themeCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: "#ffffff",
    padding: 14,
    marginBottom: 10,
  },
  themeCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  themeCardTitle: { fontSize: 11, fontWeight: "bold", color: colors.slate[900] },
  themeCardMetrics: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },

  // Strategic recommendations (StrategicRecommendationsCard)
  strategicCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sky[200],
    backgroundColor: "rgba(240, 249, 255, 0.8)",
    padding: 18,
    marginBottom: 14,
  },
  strategicTitle: { fontSize: 11, fontWeight: "bold", color: colors.sky[900], marginBottom: 4 },
  strategicDesc: { fontSize: 9, color: colors.sky[900], opacity: 0.85, marginBottom: 10 },
  strategicItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8, gap: 8 },
  strategicTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.sky[100],
    fontSize: 8,
    fontWeight: "bold",
    color: colors.sky[800],
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  strategicText: { flex: 1, fontSize: 10, color: colors.slate[900], lineHeight: 1.4 },

  // Action items (ReportActionItemCard)
  actionGroup: { marginBottom: 18 },
  actionGroupTitle: { fontSize: 11, fontWeight: "bold", color: colors.slate[900], marginBottom: 10 },
  actionItem: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: "#ffffff",
    borderLeftWidth: 5,
  },
  actionCode: { fontSize: 9, color: colors.slate[600], marginBottom: 4 },
  actionMetaLine: { fontSize: 9, color: colors.slate[700], marginBottom: 8 },
  actionQuestion: { fontSize: 11, fontWeight: "bold", color: colors.slate[900], marginBottom: 6, lineHeight: 1.35 },
  actionLabel: { fontSize: 10, fontWeight: "bold", color: colors.slate[800], marginBottom: 2 },
  actionRecommendation: { fontSize: 10, color: colors.slate[700], lineHeight: 1.4 },
  actionDivider: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.slate[100] },
  actionMetaRow: { flexDirection: "row", marginBottom: 4 },
  actionRemarks: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    backgroundColor: colors.slate[50],
    fontSize: 9,
    color: colors.slate[700],
    lineHeight: 1.4,
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: colors.slate[500],
    textAlign: "center",
  },
});

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d instanceof Date ? d.toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
}

function computeThemeReadiness(summary: ThemeResultSummary): { score: number; level: ReadinessLevel } {
  const completion = summary.completionRate;
  const totalPriority =
    summary.highPriorityCount + summary.mediumPriorityCount + summary.lowPriorityCount || 1;
  const highShare = summary.highPriorityCount / totalPriority;
  const scoreRaw = 0.7 * completion + 0.3 * (100 - highShare * 100);
  const score = Math.max(0, Math.min(100, Math.round(scoreRaw)));
  if (score < 40) return { score, level: "Early" };
  if (score < 70) return { score, level: "Developing" };
  return { score, level: "Advanced" };
}

const TAGS = ["Immediate", "Short term", "Medium term", "Consolidate"] as const;

export interface AssessmentReportPDFProps {
  assessmentId: string;
  assessmentName: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  assessmentResults: AssessmentResults;
  actionPlan: ActionPlan;
  interpretation: AssessmentInterpretation;
  themeTitleById: Record<string, string>;
  actionPlanInterpretation: string;
}

export function AssessmentReportPDF({
  assessmentId,
  assessmentName,
  createdAt,
  updatedAt,
  assessmentResults,
  actionPlan,
  interpretation,
  themeTitleById,
  actionPlanInterpretation,
}: AssessmentReportPDFProps) {
  const summary = assessmentResults.summary;
  const actionSummary = actionPlan.summary;

  const actionItemsByTheme = new Map<string, ActionItem[]>();
  for (const item of actionPlan.actionItems) {
    const themeId = item.themeId ?? "unknown";
    const arr = actionItemsByTheme.get(themeId) ?? [];
    arr.push(item);
    actionItemsByTheme.set(themeId, arr);
  }
  const sortedThemes = Array.from(actionItemsByTheme.entries()).sort((a, b) =>
    (themeTitleById[a[0]] ?? a[0]).localeCompare(themeTitleById[b[0]] ?? b[0])
  );

  const level = interpretation.readinessLevel;
  const heroBorder = level === "Early" ? colors.rose[200] : level === "Developing" ? colors.amber[200] : colors.emerald[200];
  const heroBg = level === "Early" ? colors.rose[50] : level === "Developing" ? colors.amber[50] : colors.emerald[50];
  const heroBadgeColor = level === "Early" ? colors.rose[800] : level === "Developing" ? colors.amber[800] : colors.emerald[800];
  const heroBadgeBg = level === "Early" ? colors.rose[50] : level === "Developing" ? colors.amber[50] : colors.emerald[50];

  const readinessMeaning =
    level === "Early"
      ? "Foundational sustainability practices are still limited or not yet established."
      : level === "Developing"
      ? "A sustainability baseline exists, but important capability gaps remain."
      : "Sustainability practices are broadly embedded and supported by monitoring and governance.";

  return (
    <Document title="Sustainability Self-Assessment Report" author="GreenDIGIT SAQ">
      {/* Cover page — matches ReportHeader */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverBar} fixed />
        <Text style={styles.coverTitle}>Sustainability Self-Assessment Report</Text>
        <Text style={styles.coverSubtitle}>
          Prepared for sustainability baseline review and stakeholder discussion.
        </Text>
        <View style={styles.coverMetaWrap}>
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Organisation:</Text>
            <Text style={styles.coverMetaValue}>{assessmentName ?? "—"}</Text>
          </View>
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Assessment ID:</Text>
            <Text style={styles.coverMetaValue}>{assessmentId}</Text>
          </View>
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Created:</Text>
            <Text style={styles.coverMetaValue}>{formatDate(createdAt)}</Text>
          </View>
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Updated:</Text>
            <Text style={styles.coverMetaValue}>{formatDate(updatedAt)}</Text>
          </View>
        </View>
        <Text style={styles.coverFooter} fixed>
          Generated by GreenDIGIT GRISSA Assessment Toolkit
        </Text>
      </Page>

      {/* Assessment interpretation — ReadinessHeroCard, meaning, StrengthsImprovementPanel, ThemeReadinessSnapshot, Legend, StrategicRecommendations */}
      <Page size="A4" style={styles.page}>
        <View style={[styles.section, styles.sectionFirst]}>
          <Text style={styles.sectionTitle}>Assessment interpretation</Text>
        </View>

        {/* Readiness hero */}
        <View style={[styles.heroCard, { borderColor: heroBorder, backgroundColor: heroBg }]}>
          <View style={styles.heroInner}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>Overall readiness</Text>
              <View style={[styles.heroBadge, { backgroundColor: heroBadgeBg, color: heroBadgeColor }]}>
                <Text>{interpretation.readinessLevel} readiness</Text>
              </View>
              <Text style={[styles.heroSummary, { fontSize: 9, color: colors.slate[600] }]}>
                Based on completion, targets, and improvement priorities.
              </Text>
              <Text style={styles.heroSummary}>{interpretation.summary}</Text>
            </View>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Completion</Text>
                <Text style={styles.heroStatValue}>{Math.round(summary.completionRate)}%</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Targets met</Text>
                <Text style={styles.heroStatValue}>{summary.targetMetCount}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>High-priority gaps</Text>
                <Text style={styles.heroStatValue}>{summary.highPriorityCount}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Total questions</Text>
                <Text style={styles.heroStatValue}>{summary.totalQuestions}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.meaningBox}>
          <Text style={styles.body}>
            <Text style={styles.bodyBold}>What this means:</Text>
            {readinessMeaning}
          </Text>
        </View>

        {/* Strengths & Improvement — two columns */}
        <View style={styles.twoCol}>
          <View style={styles.strengthsPanel}>
            <Text style={[styles.panelTitle, styles.panelTitleEmerald]}>Strengths</Text>
            <Text style={styles.panelDesc}>
              Areas where the organisation is building a stronger sustainability baseline.
            </Text>
            {interpretation.strengths.length === 0 ? (
              <Text style={styles.bulletText}>None identified.</Text>
            ) : (
              interpretation.strengths.map((s, i) => (
                <View key={i} style={styles.bulletItem}>
                  <View style={[styles.bulletIcon, { backgroundColor: colors.emerald[600] }]}>
                    <Text style={styles.bulletIconText}>✓</Text>
                  </View>
                  <Text style={styles.bulletText}>{s}</Text>
                </View>
              ))
            )}
          </View>
          <View style={styles.improvementPanel}>
            <Text style={[styles.panelTitle, styles.panelTitleAmber]}>Improvement areas</Text>
            <Text style={styles.panelDesc}>
              Themes and topics that require additional focus to reach the desired maturity.
            </Text>
            {interpretation.improvementAreas.length === 0 ? (
              <Text style={styles.bulletText}>None identified.</Text>
            ) : (
              interpretation.improvementAreas.map((a, i) => (
                <View key={i} style={styles.bulletItem}>
                  <View style={[styles.bulletIcon, { backgroundColor: colors.amber[500] }]}>
                    <Text style={styles.bulletIconText}>!</Text>
                  </View>
                  <Text style={styles.bulletText}>{a}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Theme readiness snapshot */}
        <View style={styles.snapshotCard}>
          <Text style={styles.snapshotTitle}>Theme readiness snapshot</Text>
          <Text style={styles.snapshotDesc}>
            Readiness per theme, combining completion and the balance of improvement priorities.
          </Text>
          {assessmentResults.themeResults.map((tr) => {
            const { score, level: l } = computeThemeReadiness(tr.summary);
            const chipBg = l === "Early" ? colors.rose[50] : l === "Developing" ? colors.amber[50] : colors.emerald[50];
            const chipColor = l === "Early" ? colors.rose[800] : l === "Developing" ? colors.amber[800] : colors.emerald[800];
            const barColor = l === "Early" ? colors.rose[400] : l === "Developing" ? colors.amber[400] : colors.emerald[500];
            return (
              <View key={tr.themeId} style={styles.snapshotRow}>
                <View style={styles.snapshotRowInner}>
                  <Text style={styles.snapshotThemeName}>{tr.themeTitle}</Text>
                  <Text style={styles.snapshotScore}>{score}%</Text>
                  <View style={[styles.snapshotChip, { backgroundColor: chipBg, color: chipColor }]}>
                    <Text>{l}</Text>
                  </View>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { backgroundColor: barColor, width: `${score}%` }]} />
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.legendBox}>
          <Text>
            <Text style={{ fontWeight: "bold", color: colors.slate[700] }}>Readiness levels: </Text>
            <Text style={{ color: colors.rose[700], fontWeight: "bold" }}>Early</Text>
            <Text> = foundational practices not yet established; </Text>
            <Text style={{ color: colors.amber[700], fontWeight: "bold" }}>Developing</Text>
            <Text> = partial implementation / baseline emerging; </Text>
            <Text style={{ color: colors.emerald[700], fontWeight: "bold" }}>Advanced</Text>
            <Text> = strong maturity and operational integration.</Text>
          </Text>
        </View>

        {/* Strategic recommendations */}
        {interpretation.strategicRecommendations.length > 0 && (
          <View style={styles.strategicCard}>
            <Text style={styles.strategicTitle}>Strategic recommendations</Text>
            <Text style={styles.strategicDesc}>
              Suggested next steps to strengthen the sustainability baseline and prepare for certification, standards alignment, or regulatory reporting.
            </Text>
            {interpretation.strategicRecommendations.map((item, idx) => {
              const tag = TAGS[Math.min(idx, TAGS.length - 1)];
              return (
                <View key={idx} style={styles.strategicItem}>
                  <View style={styles.strategicTag}>
                    <Text>{tag}</Text>
                  </View>
                  <Text style={styles.strategicText}>{item}</Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages} · GreenDIGIT Sustainability Self-Assessment Toolkit`} />
      </Page>

      {/* Assessment summary — Overview, Capability & targets, Improvement priorities */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assessment summary</Text>
        </View>

        <Text style={styles.subsectionTitle}>Overview</Text>
        <View style={styles.cardRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total themes</Text>
            <Text style={styles.cardValue}>{summary.totalThemes}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>In-scope items</Text>
            <Text style={styles.cardValue}>{summary.inScopeCount}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total questions</Text>
            <Text style={styles.cardValue}>{summary.totalQuestions}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Answered</Text>
            <Text style={styles.cardValue}>{summary.answeredQuestions}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Completion</Text>
            <Text style={styles.cardValue}>{Math.round(summary.completionRate)}%</Text>
          </View>
        </View>

        <Text style={styles.subsectionTitle}>Capability & targets</Text>
        <View style={styles.cardRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Pass level 1</Text>
            <Text style={styles.cardValue}>{summary.passLevel1Count}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Pass level 2</Text>
            <Text style={styles.cardValue}>{summary.passLevel2Count}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Pass level 3</Text>
            <Text style={styles.cardValue}>{summary.passLevel3Count}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Targets met</Text>
            <Text style={styles.cardValue}>{summary.targetMetCount}</Text>
          </View>
        </View>

        <Text style={styles.subsectionTitle}>Improvement priorities</Text>
        <View style={styles.cardRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>High priority</Text>
            <Text style={styles.cardValue}>{summary.highPriorityCount}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Medium priority</Text>
            <Text style={styles.cardValue}>{summary.mediumPriorityCount}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Low priority</Text>
            <Text style={styles.cardValue}>{summary.lowPriorityCount}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages} · GreenDIGIT Sustainability Self-Assessment Toolkit`} />
      </Page>

      {/* Theme summaries — ReportThemeCard style */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme summaries</Text>
        </View>
        {assessmentResults.themeResults.map((tr) => {
          const readiness = computeThemeReadiness(tr.summary);
          const chipBg = readiness.level === "Early" ? colors.rose[50] : readiness.level === "Developing" ? colors.amber[50] : colors.emerald[50];
          const chipColor = readiness.level === "Early" ? colors.rose[800] : readiness.level === "Developing" ? colors.amber[800] : colors.emerald[800];
          const barColor = readiness.level === "Early" ? colors.rose[400] : readiness.level === "Developing" ? colors.amber[400] : colors.emerald[500];
          return (
            <View key={tr.themeId} style={styles.themeCard}>
              <View style={styles.themeCardHeader}>
                <Text style={styles.themeCardTitle}>{tr.themeTitle}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 10, color: colors.slate[600] }}>{readiness.score}%</Text>
                  <View style={[styles.snapshotChip, { backgroundColor: chipBg, color: chipColor }]}>
                    <Text>{readiness.level}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { backgroundColor: barColor, width: `${readiness.score}%` }]} />
              </View>
              <View style={styles.themeCardMetrics}>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Completion</Text>
                  <Text style={styles.cardValue}>{Math.round(tr.summary.completionRate)}%</Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Targets met</Text>
                  <Text style={styles.cardValue}>{tr.summary.targetMetCount}</Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Pass L1 / L2 / L3</Text>
                  <Text style={styles.cardValue}>
                    {tr.summary.passLevel1Count} / {tr.summary.passLevel2Count} / {tr.summary.passLevel3Count}
                  </Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Priorities H / M / L</Text>
                  <Text style={styles.cardValue}>
                    {tr.summary.highPriorityCount} / {tr.summary.mediumPriorityCount} / {tr.summary.lowPriorityCount}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages} · GreenDIGIT Sustainability Self-Assessment Toolkit`} />
      </Page>

      {/* Action plan summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Action plan summary</Text>
        </View>
        <View style={styles.cardRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total action items</Text>
            <Text style={styles.cardValue}>{actionSummary.totalActionItems}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Immediate</Text>
            <Text style={styles.cardValue}>{actionSummary.immediateCount}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Urgent</Text>
            <Text style={styles.cardValue}>{actionSummary.urgentCount}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Planned</Text>
            <Text style={styles.cardValue}>{actionSummary.plannedCount}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Low priority</Text>
            <Text style={styles.cardValue}>{actionSummary.lowPriorityImplementationCount}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>No action needed</Text>
            <Text style={styles.cardValue}>{actionSummary.noActionNeededCount}</Text>
          </View>
        </View>
        <Text style={[styles.body, { marginTop: 14 }]}>{actionPlanInterpretation}</Text>

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages} · GreenDIGIT Sustainability Self-Assessment Toolkit`} />
      </Page>

      {/* Detailed action plan — ReportActionGroup + ReportActionItemCard */}
      {sortedThemes.map(([themeId, items]) => (
        <Page key={themeId} size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detailed action plan</Text>
          </View>
          <View style={styles.actionGroup}>
            <Text style={styles.actionGroupTitle}>{themeTitleById[themeId] ?? themeId}</Text>
            {items.map((item, idx) => {
              const borderLeftColor =
                item.improvementPriority === "High"
                  ? colors.rose[600]
                  : item.improvementPriority === "Medium"
                  ? colors.amber[600]
                  : colors.slate[400];
              const metaParts: string[] = [];
              metaParts.push(`Priority: ${item.improvementPriority}`);
              if (item.implementationPriority) metaParts.push(`Implementation: ${item.implementationPriority}`);
              if (item.effortRequired) metaParts.push(`Effort: ${item.effortRequired}`);
              const hasLowerMeta = item.leader || item.deadline || item.status;
              return (
                <View key={`${item.questionId}-${idx}`} style={[styles.actionItem, { borderLeftColor }]}>
                  <Text style={styles.actionCode}>
                    {item.questionCode}
                    {themeTitleById[themeId] ? ` · ${themeTitleById[themeId]}` : ""}
                  </Text>
                  <Text style={styles.actionMetaLine}>{metaParts.join(" · ")}</Text>
                  <Text style={styles.actionQuestion}>{item.questionText}</Text>
                  <Text style={styles.actionLabel}>Recommended action:</Text>
                  <Text style={styles.actionRecommendation}>{item.recommendedAction}</Text>
                  {hasLowerMeta && (
                    <View style={styles.actionDivider}>
                      {item.leader && (
                        <Text style={[styles.body, { marginBottom: 4 }]}>
                          <Text style={styles.bodyBold}>Leader: </Text>
                          {item.leader}
                        </Text>
                      )}
                      {item.deadline && (
                        <Text style={[styles.body, { marginBottom: 4 }]}>
                          <Text style={styles.bodyBold}>Deadline: </Text>
                          {item.deadline}
                        </Text>
                      )}
                      {item.status && (
                        <Text style={styles.body}>
                          <Text style={styles.bodyBold}>Status: </Text>
                          {item.status}
                        </Text>
                      )}
                    </View>
                  )}
                  {item.remarks && (
                    <View style={styles.actionRemarks}>
                      <Text style={styles.body}>
                        <Text style={styles.bodyBold}>Remarks: </Text>
                        {item.remarks}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages} · GreenDIGIT Sustainability Self-Assessment Toolkit`} />
        </Page>
      ))}

      {actionPlan.actionItems.length === 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detailed action plan</Text>
          </View>
          <Text style={styles.body}>No action items.</Text>
          <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages} · GreenDIGIT Sustainability Self-Assessment Toolkit`} />
        </Page>
      )}
    </Document>
  );
}
