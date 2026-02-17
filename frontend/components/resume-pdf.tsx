"use client";

import dynamic from "next/dynamic";
import { Document, Page, Text, View, StyleSheet, Font, Link } from "@react-pdf/renderer";

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf", fontWeight: 400 },
    { src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.ttf", fontWeight: 600 },
    { src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf", fontWeight: 700 },
  ],
});

export type TemplateType = "modern" | "classic" | "minimal";

interface ResumeData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  leetcode?: string;
  career_objective?: string;
  summary?: string;
  experience?: Array<{
    company: string;
    title: string;
    dates?: string;
    start_date?: string;
    end_date?: string;
    current?: boolean;
    location?: string;
    bullets?: string[];
  }>;
  projects?: Array<{
    name: string;
    tech_stack?: string;
    bullets?: string[];
  }>;
  skills?: {
    languages?: string[];
    frameworks?: string[];
    databases?: string[];
    cloud?: string[];
    tools?: string[];
    concepts?: string[];
  } | string[];
  education?: Array<{
    institution: string;
    degree: string;
    year?: string;
    field?: string;
    cgpa?: string;
  }>;
  certifications?: string[];
}

const normalizeData = (raw: Record<string, unknown>): ResumeData => {
  const data = raw as ResumeData;
  const experience = data.experience?.map(exp => ({
    ...exp,
    dates: exp.dates || formatDateRange(exp.start_date, exp.end_date, exp.current),
  }));
  
  // Normalize skills to categorized format
  let skills = data.skills;
  if (Array.isArray(skills)) {
    skills = { languages: skills };
  }
  
  return { ...data, experience, skills, career_objective: data.career_objective || data.summary };
};

const formatDateRange = (start?: string, end?: string, current?: boolean): string => {
  if (!start) return '';
  const formatDate = (d: string) => {
    const [year, month] = d.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return month ? `${months[parseInt(month) - 1]} ${year}` : year;
  };
  return `${formatDate(start)} - ${current ? 'Present' : (end ? formatDate(end) : 'Present')}`;
};

// ============ MODERN TEMPLATE (ATS-Optimized) ============
const styles = StyleSheet.create({
  page: { padding: 35, fontFamily: "Inter", fontSize: 9, color: "#1f2937" },
  // Header
  header: { alignItems: "center", marginBottom: 12, borderBottom: "1.5pt solid #4f46e5", paddingBottom: 8 },
  name: { fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 3 },
  location: { fontSize: 9, color: "#6b7280", marginBottom: 2 },
  contact: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", fontSize: 8, color: "#4b5563", gap: 8 },
  link: { color: "#4f46e5", textDecoration: "none" },
  // Sections
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: "#4f46e5", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: "0.5pt solid #e5e7eb", paddingBottom: 2 },
  // Career Objective
  objective: { fontSize: 9, lineHeight: 1.5, color: "#374151" },
  // Experience & Projects
  itemContainer: { marginBottom: 8 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
  itemTitle: { fontSize: 10, fontWeight: 600, color: "#111827" },
  itemSubtitle: { fontSize: 9, color: "#4f46e5" },
  itemDate: { fontSize: 8, color: "#6b7280" },
  itemLocation: { fontSize: 8, color: "#6b7280", fontStyle: "italic" },
  bullet: { flexDirection: "row", marginBottom: 2, paddingLeft: 6 },
  bulletPoint: { width: 8, fontSize: 8, color: "#6b7280" },
  bulletText: { flex: 1, fontSize: 8, lineHeight: 1.4, color: "#374151" },
  // Skills
  skillRow: { flexDirection: "row", marginBottom: 2 },
  skillLabel: { width: 100, fontSize: 8, fontWeight: 600, color: "#374151" },
  skillValue: { flex: 1, fontSize: 8, color: "#4b5563" },
  // Education
  eduHeader: { flexDirection: "row", justifyContent: "space-between" },
  eduDegree: { fontSize: 9, fontWeight: 600, color: "#111827" },
  eduInstitution: { fontSize: 8, color: "#4f46e5" },
  eduMeta: { fontSize: 8, color: "#6b7280" },
  // Certifications
  certItem: { fontSize: 8, lineHeight: 1.5, color: "#374151", marginBottom: 2 },
});

const ModernTemplate = ({ data }: { data: ResumeData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{data.name || "Your Name"}</Text>
        {data.location && <Text style={styles.location}>{data.location}</Text>}
        <View style={styles.contact}>
          {data.phone && <Text>{data.phone}</Text>}
          {data.email && <Link src={`mailto:${data.email}`} style={styles.link}>{data.email}</Link>}
          {data.linkedin && <Link src={data.linkedin} style={styles.link}>LinkedIn</Link>}
          {data.github && <Link src={data.github} style={styles.link}>GitHub</Link>}
          {data.leetcode && <Link src={data.leetcode} style={styles.link}>LeetCode</Link>}
        </View>
      </View>

      {/* Career Objective */}
      {data.career_objective && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Career Objective</Text>
          <Text style={styles.objective}>{data.career_objective}</Text>
        </View>
      )}

      {/* Experience */}
      {(data.experience?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          {data.experience?.map((exp, i) => (
            <View key={i} style={styles.itemContainer}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{exp.company}</Text>
                <Text style={styles.itemDate}>{exp.dates}</Text>
              </View>
              <View style={styles.itemHeader}>
                <Text style={styles.itemSubtitle}>{exp.title}</Text>
                {exp.location && <Text style={styles.itemLocation}>{exp.location}</Text>}
              </View>
              {exp.bullets?.map((b, j) => (
                <View key={j} style={styles.bullet}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Projects */}
      {(data.projects?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projects</Text>
          {data.projects?.map((proj, i) => (
            <View key={i} style={styles.itemContainer}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{proj.name}</Text>
              </View>
              {proj.tech_stack && <Text style={styles.itemSubtitle}>{proj.tech_stack}</Text>}
              {proj.bullets?.map((b, j) => (
                <View key={j} style={styles.bullet}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Technical Skills */}
      {data.skills && typeof data.skills === 'object' && !Array.isArray(data.skills) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technical Skills</Text>
          {(data.skills.languages?.length ?? 0) > 0 && (
            <View style={styles.skillRow}>
              <Text style={styles.skillLabel}>Languages:</Text>
              <Text style={styles.skillValue}>{data.skills.languages?.join(", ")}</Text>
            </View>
          )}
          {(data.skills.frameworks?.length ?? 0) > 0 && (
            <View style={styles.skillRow}>
              <Text style={styles.skillLabel}>Frameworks:</Text>
              <Text style={styles.skillValue}>{data.skills.frameworks?.join(", ")}</Text>
            </View>
          )}
          {(data.skills.databases?.length ?? 0) > 0 && (
            <View style={styles.skillRow}>
              <Text style={styles.skillLabel}>Databases:</Text>
              <Text style={styles.skillValue}>{data.skills.databases?.join(", ")}</Text>
            </View>
          )}
          {(data.skills.cloud?.length ?? 0) > 0 && (
            <View style={styles.skillRow}>
              <Text style={styles.skillLabel}>Cloud & DevOps:</Text>
              <Text style={styles.skillValue}>{data.skills.cloud?.join(", ")}</Text>
            </View>
          )}
          {(data.skills.tools?.length ?? 0) > 0 && (
            <View style={styles.skillRow}>
              <Text style={styles.skillLabel}>Tools:</Text>
              <Text style={styles.skillValue}>{data.skills.tools?.join(", ")}</Text>
            </View>
          )}
          {(data.skills.concepts?.length ?? 0) > 0 && (
            <View style={styles.skillRow}>
              <Text style={styles.skillLabel}>Concepts:</Text>
              <Text style={styles.skillValue}>{data.skills.concepts?.join(", ")}</Text>
            </View>
          )}
        </View>
      )}

      {/* Education */}
      {(data.education?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          {data.education?.map((edu, i) => (
            <View key={i} style={{ marginBottom: 4 }}>
              <View style={styles.eduHeader}>
                <Text style={styles.eduDegree}>{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</Text>
                <Text style={styles.eduMeta}>{edu.year}</Text>
              </View>
              <View style={styles.eduHeader}>
                <Text style={styles.eduInstitution}>{edu.institution}</Text>
                {edu.cgpa && <Text style={styles.eduMeta}>CGPA: {edu.cgpa}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Certifications */}
      {(data.certifications?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certifications and Achievements</Text>
          {data.certifications?.map((cert, i) => (
            <Text key={i} style={styles.certItem}>• {cert}</Text>
          ))}
        </View>
      )}
    </Page>
  </Document>
);

// ============ CLASSIC TEMPLATE ============
const classicStyles = StyleSheet.create({
  page: { padding: 45, fontFamily: "Inter", fontSize: 9, color: "#000" },
  header: { textAlign: "center", marginBottom: 15, borderBottom: "1pt solid #000", paddingBottom: 10 },
  name: { fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5 },
  contact: { fontSize: 9, color: "#333" },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: 700, borderBottom: "0.5pt solid #999", paddingBottom: 2, marginBottom: 6, textTransform: "uppercase" },
  objective: { fontSize: 9, lineHeight: 1.5, textAlign: "justify" },
  itemContainer: { marginBottom: 8 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
  itemTitle: { fontSize: 10, fontWeight: 600 },
  itemSubtitle: { fontSize: 9, fontStyle: "italic" },
  itemDate: { fontSize: 8, color: "#555" },
  bullet: { fontSize: 8, lineHeight: 1.4, marginBottom: 1, paddingLeft: 10 },
  skillRow: { flexDirection: "row", marginBottom: 2 },
  skillLabel: { width: 95, fontSize: 8, fontWeight: 600 },
  skillValue: { flex: 1, fontSize: 8 },
  eduRow: { flexDirection: "row", justifyContent: "space-between" },
  eduDegree: { fontSize: 9, fontWeight: 600 },
  eduInstitution: { fontSize: 8, fontStyle: "italic" },
  certItem: { fontSize: 8, lineHeight: 1.4, marginBottom: 1 },
});

const ClassicTemplate = ({ data }: { data: ResumeData }) => (
  <Document>
    <Page size="A4" style={classicStyles.page}>
      <View style={classicStyles.header}>
        <Text style={classicStyles.name}>{data.name || "Your Name"}</Text>
        <Text style={classicStyles.contact}>
          {[data.location, data.phone, data.email].filter(Boolean).join(" | ")}
        </Text>
      </View>

      {data.career_objective && (
        <View style={classicStyles.section}>
          <Text style={classicStyles.sectionTitle}>Career Objective</Text>
          <Text style={classicStyles.objective}>{data.career_objective}</Text>
        </View>
      )}

      {(data.experience?.length ?? 0) > 0 && (
        <View style={classicStyles.section}>
          <Text style={classicStyles.sectionTitle}>Experience</Text>
          {data.experience?.map((exp, i) => (
            <View key={i} style={classicStyles.itemContainer}>
              <View style={classicStyles.itemHeader}>
                <Text style={classicStyles.itemTitle}>{exp.company}</Text>
                <Text style={classicStyles.itemDate}>{exp.dates}</Text>
              </View>
              <Text style={classicStyles.itemSubtitle}>{exp.title}{exp.location ? `, ${exp.location}` : ""}</Text>
              {exp.bullets?.map((b, j) => <Text key={j} style={classicStyles.bullet}>• {b}</Text>)}
            </View>
          ))}
        </View>
      )}

      {(data.projects?.length ?? 0) > 0 && (
        <View style={classicStyles.section}>
          <Text style={classicStyles.sectionTitle}>Projects</Text>
          {data.projects?.map((proj, i) => (
            <View key={i} style={classicStyles.itemContainer}>
              <Text style={classicStyles.itemTitle}>{proj.name}{proj.tech_stack ? ` | ${proj.tech_stack}` : ""}</Text>
              {proj.bullets?.map((b, j) => <Text key={j} style={classicStyles.bullet}>• {b}</Text>)}
            </View>
          ))}
        </View>
      )}

      {data.skills && typeof data.skills === 'object' && !Array.isArray(data.skills) && (
        <View style={classicStyles.section}>
          <Text style={classicStyles.sectionTitle}>Technical Skills</Text>
          {Object.entries(data.skills).filter(([, v]) => v?.length).map(([k, v]) => (
            <View key={k} style={classicStyles.skillRow}>
              <Text style={classicStyles.skillLabel}>{k.charAt(0).toUpperCase() + k.slice(1)}:</Text>
              <Text style={classicStyles.skillValue}>{(v as string[]).join(", ")}</Text>
            </View>
          ))}
        </View>
      )}

      {(data.education?.length ?? 0) > 0 && (
        <View style={classicStyles.section}>
          <Text style={classicStyles.sectionTitle}>Education</Text>
          {data.education?.map((edu, i) => (
            <View key={i} style={{ marginBottom: 4 }}>
              <View style={classicStyles.eduRow}>
                <Text style={classicStyles.eduDegree}>{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</Text>
                <Text style={{ fontSize: 8 }}>{edu.year}{edu.cgpa ? ` | CGPA: ${edu.cgpa}` : ""}</Text>
              </View>
              <Text style={classicStyles.eduInstitution}>{edu.institution}</Text>
            </View>
          ))}
        </View>
      )}

      {(data.certifications?.length ?? 0) > 0 && (
        <View style={classicStyles.section}>
          <Text style={classicStyles.sectionTitle}>Certifications and Achievements</Text>
          {data.certifications?.map((c, i) => <Text key={i} style={classicStyles.certItem}>• {c}</Text>)}
        </View>
      )}
    </Page>
  </Document>
);

// ============ MINIMAL TEMPLATE ============
const minimalStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Inter", fontSize: 9, color: "#333" },
  header: { marginBottom: 20 },
  name: { fontSize: 24, fontWeight: 400, color: "#111", marginBottom: 4 },
  contact: { fontSize: 9, color: "#666" },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 8, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 },
  objective: { fontSize: 9, lineHeight: 1.5, color: "#444" },
  itemContainer: { marginBottom: 10 },
  itemTitle: { fontSize: 10, fontWeight: 600, color: "#111" },
  itemMeta: { fontSize: 8, color: "#666", marginBottom: 3 },
  bullet: { fontSize: 8, lineHeight: 1.4, color: "#444", marginBottom: 1, paddingLeft: 8 },
  skillsText: { fontSize: 8, color: "#444", lineHeight: 1.5 },
  eduDegree: { fontSize: 9, fontWeight: 600, color: "#111" },
  eduMeta: { fontSize: 8, color: "#666" },
  certItem: { fontSize: 8, color: "#444", marginBottom: 1 },
});

const MinimalTemplate = ({ data }: { data: ResumeData }) => (
  <Document>
    <Page size="A4" style={minimalStyles.page}>
      <View style={minimalStyles.header}>
        <Text style={minimalStyles.name}>{data.name || "Your Name"}</Text>
        <Text style={minimalStyles.contact}>{[data.email, data.phone, data.location].filter(Boolean).join(" · ")}</Text>
      </View>

      {data.career_objective && (
        <View style={minimalStyles.section}>
          <Text style={minimalStyles.sectionTitle}>About</Text>
          <Text style={minimalStyles.objective}>{data.career_objective}</Text>
        </View>
      )}

      {(data.experience?.length ?? 0) > 0 && (
        <View style={minimalStyles.section}>
          <Text style={minimalStyles.sectionTitle}>Experience</Text>
          {data.experience?.map((exp, i) => (
            <View key={i} style={minimalStyles.itemContainer}>
              <Text style={minimalStyles.itemTitle}>{exp.title}</Text>
              <Text style={minimalStyles.itemMeta}>{exp.company} · {exp.dates}</Text>
              {exp.bullets?.map((b, j) => <Text key={j} style={minimalStyles.bullet}>— {b}</Text>)}
            </View>
          ))}
        </View>
      )}

      {(data.projects?.length ?? 0) > 0 && (
        <View style={minimalStyles.section}>
          <Text style={minimalStyles.sectionTitle}>Projects</Text>
          {data.projects?.map((proj, i) => (
            <View key={i} style={minimalStyles.itemContainer}>
              <Text style={minimalStyles.itemTitle}>{proj.name}</Text>
              {proj.tech_stack && <Text style={minimalStyles.itemMeta}>{proj.tech_stack}</Text>}
              {proj.bullets?.map((b, j) => <Text key={j} style={minimalStyles.bullet}>— {b}</Text>)}
            </View>
          ))}
        </View>
      )}

      {data.skills && typeof data.skills === 'object' && !Array.isArray(data.skills) && (
        <View style={minimalStyles.section}>
          <Text style={minimalStyles.sectionTitle}>Skills</Text>
          <Text style={minimalStyles.skillsText}>
            {Object.values(data.skills).flat().filter(Boolean).join(", ")}
          </Text>
        </View>
      )}

      {(data.education?.length ?? 0) > 0 && (
        <View style={minimalStyles.section}>
          <Text style={minimalStyles.sectionTitle}>Education</Text>
          {data.education?.map((edu, i) => (
            <View key={i} style={{ marginBottom: 4 }}>
              <Text style={minimalStyles.eduDegree}>{edu.degree}{edu.field ? `, ${edu.field}` : ""}</Text>
              <Text style={minimalStyles.eduMeta}>{edu.institution} · {edu.year}</Text>
            </View>
          ))}
        </View>
      )}

      {(data.certifications?.length ?? 0) > 0 && (
        <View style={minimalStyles.section}>
          <Text style={minimalStyles.sectionTitle}>Achievements</Text>
          {data.certifications?.map((c, i) => <Text key={i} style={minimalStyles.certItem}>— {c}</Text>)}
        </View>
      )}
    </Page>
  </Document>
);

// ============ EXPORTS ============
export function ResumePDFDocument({ data, template = "modern" }: { data: Record<string, unknown>; template?: TemplateType }) {
  const normalized = normalizeData(data);
  switch (template) {
    case "classic": return <ClassicTemplate data={normalized} />;
    case "minimal": return <MinimalTemplate data={normalized} />;
    default: return <ModernTemplate data={normalized} />;
  }
}

export const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <span>Loading...</span> }
);

export const TEMPLATES: { value: TemplateType; label: string; description: string }[] = [
  { value: "modern", label: "Modern", description: "ATS-optimized with accent colors" },
  { value: "classic", label: "Classic", description: "Traditional professional format" },
  { value: "minimal", label: "Minimal", description: "Clean and elegant" },
];
