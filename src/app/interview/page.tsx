"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// DATA — extracted from ds_interview_prep_2026.pdf
// ─────────────────────────────────────────────────────────────────────────────

const DOMAINS = [
  {
    id: "stats",
    icon: "📊",
    label: "Statistics & Probability",
    priority: "CRITICAL",
    priorityColor: "#f87171",
    note: "Microsoft especially tests A/B experimentation depth.",
    topics: [
      "Descriptive Statistics (mean, median, variance, IQR, skewness)",
      "Probability Distributions (Normal, Binomial, Poisson, Exponential)",
      "Bayes' Theorem & Conditional Probability",
      "Hypothesis Testing (p-values, Type I/II errors, power)",
      "A/B Testing & Experimentation Design ⭐ Microsoft critical",
      "Causal Inference & Quasi-Experiments (DiD, RDD, IV)",
    ],
  },
  {
    id: "ml",
    icon: "🧠",
    label: "Machine Learning",
    priority: "HIGH",
    priorityColor: "#fb923c",
    note: "Expect conceptual depth AND hands-on. Be ready to code logistic regression from scratch.",
    topics: [
      "Supervised vs Unsupervised Learning framework",
      "Bias-Variance Tradeoff (underfitting, overfitting)",
      "Model Evaluation Metrics (precision, recall, F1, AUC-ROC)",
      "Key Algorithms (LR, Decision Trees, RF, XGBoost, SVM)",
      "Feature Engineering & Hyperparameter Tuning",
      "Handling Imbalanced Data (SMOTE, class weights)",
      "PCA — Dimensionality Reduction",
      "Deep Learning Basics (backprop, CNNs, RNNs)",
    ],
  },
  {
    id: "sql",
    icon: "🧾",
    label: "SQL",
    priority: "HARD GATE",
    priorityColor: "#f87171",
    note: "SQL is a hard gate at most top companies. You WILL be tested. Practice daily.",
    topics: [
      "Joins (INNER, LEFT, RIGHT, FULL, CROSS, self-join)",
      "Aggregations & Filtering (GROUP BY, HAVING, CASE WHEN)",
      "Window Functions — HIGH PRIORITY (ROW_NUMBER, RANK, LAG, LEAD)",
      "CTEs & Subqueries",
      "Data Cleaning & Transformation",
      "Classic Interview Patterns (retention, cohort, DAU/WAU/MAU)",
    ],
  },
  {
    id: "python",
    icon: "🐍",
    label: "Python & Coding",
    priority: "HIGH",
    priorityColor: "#fb923c",
    note: "Coding rounds test problem-solving + code quality. Talk through your thinking.",
    topics: [
      "Data Structures & Algorithms — Medium Level (arrays, hashmaps, sorting)",
      "Pandas Core Operations (groupby, merge, pivot, apply)",
      "NumPy Essentials (vectorization, broadcasting, linear algebra)",
      "Common Interview Data Tasks (dedup, missing values, feature creation)",
    ],
  },
  {
    id: "product",
    icon: "🧩",
    label: "Product Sense",
    priority: "DIFFERENTIATOR",
    priorityColor: "#a78bfa",
    note: "Key differentiator for DS. Connects analysis to business impact. Less tested for MLE.",
    topics: [
      "Framework for Ambiguous Problems (clarify → success metrics → hypotheses)",
      "Designing Metrics for Products (primary + guardrail metrics)",
      "Growth & Engagement Analysis",
      "Experiment Design for Features",
      "Data-Driven Decision Making",
    ],
  },
  {
    id: "sysdesign",
    icon: "🏗️",
    label: "System Design",
    priority: "MLE CRITICAL",
    priorityColor: "#4da6ff",
    note: "Core for MLE roles. Senior DS too. Show breadth: data → model → serving → monitoring.",
    topics: [
      "Data Pipeline Design (batch vs streaming, Lambda vs Kappa)",
      "ML System Design Framework (problem → data → model → serving → monitoring)",
      "Data Architecture Patterns (data warehouse, data lake, lakehouse)",
      "Real-Time vs Batch ML (feature stores, online vs offline serving)",
    ],
  },
];

const COMPANIES = [
  { name: "Microsoft", emoji: "🪟", focus: "A/B testing, experimentation, product metrics",    unique: "Teams/Azure product sense, quasi-experiments",        priority: "PRIMARY TARGET", color: "#4da6ff", highlight: true  },
  { name: "Google",    emoji: "🔍", focus: "Statistics depth, ML theory, SQL",                  unique: "Causal inference, large-scale ML systems",            priority: "HIGH",           color: "#5ecf95", highlight: false },
  { name: "Meta",      emoji: "👤", focus: "SQL (advanced), product sense, metrics",            unique: "Social network effects, ads measurement",             priority: "HIGH",           color: "#4da6ff", highlight: false },
  { name: "Amazon",    emoji: "📦", focus: "SQL, Python, business impact",                      unique: "Customer obsession framing, marketplace metrics",     priority: "HIGH",           color: "#f5a623", highlight: false },
];

const ROUND_TYPES = [
  { round: "Phone Screen",     duration: "30-45 min", expect: "1-2 SQL queries, basic stats, background",             passRate: "30-40%" },
  { round: "Technical Screen", duration: "45-60 min", expect: "SQL + Python data manipulation + 1 stats concept",    passRate: "40-50%" },
  { round: "ML/Stats Deep",    duration: "60 min",    expect: "Conceptual questions, tradeoffs, hands-on coding",    passRate: "50-60%" },
  { round: "Coding Round",     duration: "45-60 min", expect: "LeetCode Medium Python. Correct solution + complexity", passRate: "50-60%" },
  { round: "Case/Product",     duration: "45-60 min", expect: "Open-ended problem. Structure your answer.",           passRate: "50-65%" },
  { round: "System Design",    duration: "60 min",    expect: "Design ML pipeline end-to-end. Senior roles only.",   passRate: "40-55%" },
  { round: "Behavioral",       duration: "30-45 min", expect: "STAR format. Impact-driven stories.",                 passRate: "70-80%" },
];

const WEEKLY_PLAN = [
  { weeks: "1–2",   focus: "Statistics foundation",  detail: "Hypothesis testing, Bayes, distributions. Practice 3 SQL problems/day." },
  { weeks: "3–4",   focus: "ML algorithms",           detail: "Implement logistic regression, decision tree from scratch. Kaggle competition." },
  { weeks: "5–6",   focus: "SQL mastery",             detail: "Window functions, CTEs, complex joins. LeetCode Database section." },
  { weeks: "7–8",   focus: "Python & coding",         detail: "LeetCode Medium (arrays, hashmaps, sorting). Pandas drills." },
  { weeks: "9–10",  focus: "Product sense",           detail: "Analyze 3 products' metrics. Mock cases. HEART framework practice." },
  { weeks: "11–12", focus: "System design + review",  detail: "Design 2-3 ML systems from scratch. Mock interviews. Review weak areas." },
];

const FINAL_CHECKLIST = [
  { domain: "SQL",           item: "Solved 50+ problems including window functions and CTEs" },
  { domain: "Statistics",    item: "Can explain p-values, Type I/II errors, A/B testing to a non-statistician" },
  { domain: "ML Theory",     item: "Can code logistic regression from scratch in 15 minutes" },
  { domain: "Python",        item: "Comfortable with Pandas groupby, merge, window functions, sklearn pipelines" },
  { domain: "Product Sense", item: "Have 3-4 product case frameworks memorized and practiced" },
  { domain: "System Design", item: "Can sketch ML pipeline for recommendation/fraud/search from memory" },
  { domain: "Projects",      item: "3-5 projects on GitHub, can discuss every decision for 20 min each" },
  { domain: "Behavioral",    item: "5 STAR-format stories ready, each with quantified impact" },
];

const BEHAVIORAL_QUESTIONS = [
  "Tell me about a time you influenced a product decision with data",
  "Describe a time your analysis was wrong — how did you catch it?",
  "How did you handle conflicting stakeholder priorities?",
  "Walk me through a complex analysis you're proud of",
  "How do you communicate statistical uncertainty to non-technical stakeholders?",
];

// DB key used for upsert
const DB_KEY = "srn_interview_prep_v1";

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function PriorityBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.08em",
      textTransform: "uppercase", padding: "3px 8px", borderRadius: "100px",
      background: `${color}18`, color, border: `0.5px solid ${color}45` }}>
      {label}
    </span>
  );
}

function SectionHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span style={{ fontSize: "18px" }}>{emoji}</span>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{title}</h2>
      </div>
      {subtitle && <p className="text-xs font-mono mt-0.5 ml-7" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
    </div>
  );
}

// ── ⓘ INFO MODAL ──────────────────────────────────────────────────────────────
function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,0.50)", backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)", animation: "fadeIn 0.18s ease both" }} />

      {/* Modal */}
      <div style={{ position: "fixed", zIndex: 61,
        bottom: 0, left: 0, right: 0,
        maxHeight: "92dvh", overflowY: "auto",
        borderRadius: "24px 24px 0 0",
        background: "var(--cc-glass-base)",
        backdropFilter: "blur(48px) saturate(2.2)",
        WebkitBackdropFilter: "blur(48px) saturate(2.2)",
        border: "0.5px solid var(--cc-tile-border)",
        boxShadow: "0 -16px 56px rgba(0,0,0,0.40), 0 -1px 0 var(--specular-top)",
        animation: "slideUp 0.28s cubic-bezier(0.34,1.4,0.64,1) both",
        paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))" }}
        className="sm:fixed sm:inset-0 sm:m-auto sm:rounded-[24px] sm:max-w-lg sm:max-h-[80vh]">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div style={{ width: "36px", height: "4px", borderRadius: "100px",
            background: "var(--cc-text-muted)", opacity: 0.4 }} />
        </div>

        <div className="p-6 pt-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "20px" }}>🎯</span>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                How to use this page
              </h2>
            </div>
            <button onClick={onClose} style={{ background: "var(--glass-fill)",
              border: "0.5px solid var(--glass-border)", color: "var(--text-muted)",
              borderRadius: "100px", padding: "5px 12px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
              ✕ Close
            </button>
          </div>

          {/* DS vs MLE explanation */}
          <div className="rounded-[16px] p-4 mb-4"
            style={{ background: "rgba(77,166,255,0.08)", border: "0.5px solid rgba(77,166,255,0.25)" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#4da6ff" }}>
              📌 Is this for Data Scientist or ML Engineer?
            </p>
            <p className="text-xs font-mono leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Both — but with different emphasis. This PDF is primarily DS-focused, covering ~80% of what MLE interviews need too.
            </p>
            <div className="mt-3 space-y-1.5">
              {[
                { area: "Stats & Probability", ds: "✅ Core",      mle: "✅ Core"           },
                { area: "ML Theory",           ds: "✅ Core",      mle: "✅ Core"           },
                { area: "SQL",                 ds: "✅ Core",      mle: "⚠️ Less emphasis"  },
                { area: "Python & Coding",     ds: "✅ Needed",    mle: "✅ Heavier"        },
                { area: "Product Sense",       ds: "✅ Core",      mle: "❌ Rarely tested"  },
                { area: "System Design",       ds: "⚠️ Senior DS", mle: "✅ Core for MLE"   },
              ].map((r) => (
                <div key={r.area} className="flex items-center gap-2 text-[10px] font-mono">
                  <span style={{ color: "var(--text-muted)", minWidth: "130px" }}>{r.area}</span>
                  <span style={{ color: "#5ecf95", minWidth: "80px" }}>{r.ds}</span>
                  <span style={{ color: "#4da6ff" }}>{r.mle}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-[9px] font-mono mt-1" style={{ color: "var(--text-muted)", borderTop: "0.5px solid var(--glass-border)", paddingTop: "6px" }}>
                <span style={{ minWidth: "130px" }}></span>
                <span style={{ color: "#5ecf95", minWidth: "80px" }}>↑ DS role</span>
                <span style={{ color: "#4da6ff" }}>↑ MLE role</span>
              </div>
            </div>
          </div>

          {/* Learning vs Interview */}
          <div className="rounded-[16px] p-4 mb-4"
            style={{ background: "rgba(94,207,149,0.08)", border: "0.5px solid rgba(94,207,149,0.25)" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#5ecf95" }}>
              📚 Learning page vs Interview page — what&apos;s the difference?
            </p>
            <div className="space-y-2">
              {[
                { icon: "📚", label: "Learning page",   desc: "12-18 month skill building. Daily use. Study concepts deeply, track progress.", color: "#5ecf95" },
                { icon: "🎯", label: "Interview page",  desc: "Short-term readiness check. Monthly use. Confirm you have the skill, not build it.", color: "#4da6ff" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-[12px]"
                  style={{ background: `${item.color}10`, border: `0.5px solid ${item.color}30` }}>
                  <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: item.color }}>{item.label}</p>
                    <p className="text-[11px] font-mono mt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What to do daily */}
          <div className="rounded-[16px] p-4 mb-4"
            style={{ background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)" }}>
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              📅 Recommended daily routine
            </p>
            <div className="space-y-2">
              {[
                { time: "Morning",  action: "Open Learning page — what's today's topic? (DSA, Stats, SQL)", color: "#5ecf95" },
                { time: "Evening",  action: "Focus timer — 25-45 min deep session on that topic",            color: "#4da6ff" },
                { time: "Monthly",  action: "Open Interview page — honest readiness check. Where am I weak?", color: "#f5a623" },
              ].map((r) => (
                <div key={r.time} className="flex items-start gap-3">
                  <span className="text-[9px] font-mono font-bold px-2 py-1 rounded-full flex-shrink-0"
                    style={{ background: `${r.color}18`, color: r.color, border: `0.5px solid ${r.color}40` }}>
                    {r.time}
                  </span>
                  <p className="text-[11px] font-mono leading-relaxed" style={{ color: "var(--text-secondary)" }}>{r.action}</p>
                </div>
              ))}
            </div>
          </div>

          {/* When to flip */}
          <div className="rounded-[16px] p-4"
            style={{ background: "rgba(248,65,65,0.06)", border: "0.5px solid rgba(248,65,65,0.25)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#f87171" }}>
              ⏰ When does this page become daily?
            </p>
            <p className="text-xs font-mono leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              When you are <strong style={{ color: "#f87171" }}>8-10 weeks from actively applying</strong> to jobs.
              That&apos;s when you flip — Interview page becomes your daily driver, Learning page becomes secondary.
              Right now (6-12 months away) focus on Learning. This page is just a monthly mirror.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function InterviewPrepPage() {
  const [checkedTopics, setCheckedTopics]   = useState<Set<string>>(new Set());
  const [checkedFinal,  setCheckedFinal]    = useState<Set<number>>(new Set());
  const [readiness,     setReadiness]       = useState<Record<string, number>>({
    stats: 0, ml: 0, sql: 0, python: 0, product: 0, sysdesign: 0,
  });
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [activeTab, setActiveTab]           = useState<"domains"|"company"|"plan"|"checklist">("domains");
  const [showInfo, setShowInfo]             = useState(false);
  const [hydrated, setHydrated]             = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // ── Load from Supabase on mount ──
  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("interview_prep")
          .select("data")
          .eq("key", DB_KEY)
          .maybeSingle();

        if (data?.data) {
          const d = data.data as any;
          if (d.topics)    setCheckedTopics(new Set(d.topics));
          if (d.final)     setCheckedFinal(new Set(d.final));
          if (d.readiness) setReadiness(d.readiness);
        }
      } catch {
        // Table may not exist yet — silently fall back to empty state
      }
      setHydrated(true);
    }
    load();
  }, []);

  // ── Debounced save to Supabase ──
  const save = (topics: Set<string>, final: Set<number>, ready: Record<string, number>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await supabase.from("interview_prep").upsert({
          key: DB_KEY,
          data: { topics: [...topics], final: [...final], readiness: ready },
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });
      } catch {}
    }, 800);
  };

  const toggleTopic = (key: string) => {
    setCheckedTopics(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      save(n, checkedFinal, readiness);
      return n;
    });
  };

  const toggleFinal = (i: number) => {
    setCheckedFinal(prev => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      save(checkedTopics, n, readiness);
      return n;
    });
  };

  const updateReadiness = (domainId: string, val: number) => {
    setReadiness(prev => {
      const n = { ...prev, [domainId]: val };
      save(checkedTopics, checkedFinal, n);
      return n;
    });
  };

  const overallReadiness = Math.round(Object.values(readiness).reduce((a, b) => a + b, 0) / DOMAINS.length);
  const totalTopics      = DOMAINS.reduce((s, d) => s + d.topics.length, 0);
  const doneTopics       = checkedTopics.size;
  const finalDone        = checkedFinal.size;

  const TABS = [
    { id: "domains",   label: "Domains",   emoji: "📚" },
    { id: "company",   label: "Company",   emoji: "🎯" },
    { id: "plan",      label: "12-Week",   emoji: "📅" },
    { id: "checklist", label: "Checklist", emoji: "✅" },
  ] as const;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32 md:pb-10">

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

      {/* ── HEADER ── */}
      <header className="mb-6 animate-fade-in-up">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="font-bold tracking-tight"
                style={{ fontSize: "clamp(20px,4vw,26px)", color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
                Interview Prep
              </h1>
              <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700,
                padding: "3px 8px", borderRadius: "100px", letterSpacing: "0.08em",
                background: "rgba(248,65,65,0.12)", color: "#f87171", border: "0.5px solid rgba(248,65,65,0.30)" }}>
                FAANG · MICROSOFT
              </span>
              <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700,
                padding: "3px 8px", borderRadius: "100px", letterSpacing: "0.08em",
                background: "rgba(77,166,255,0.12)", color: "#4da6ff", border: "0.5px solid rgba(77,166,255,0.30)" }}>
                DS + MLE
              </span>
            </div>
            <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              6 domains · {totalTopics} topics · Microsoft-focused · 2026
            </p>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: "rgba(77,166,255,0.65)" }}>
              💡 Covers ~80% of DS + MLE overlap. MLE needs deeper System Design &amp; Coding.
            </p>
          </div>

          {/* Right side: ⓘ + readiness */}
          <div className="flex items-start gap-2 flex-shrink-0">
            {/* ⓘ button */}
            <button onClick={() => setShowInfo(true)}
              title="How to use this page"
              style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)",
                color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: "13px", fontWeight: 600, fontFamily: "serif",
                boxShadow: "var(--shadow-sm)", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent-dim)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--glass-border)"; }}>
              ⓘ
            </button>

            {/* Readiness % */}
            <div className="liquid-glass rounded-[16px] px-4 py-3 text-center"
              style={{ minWidth: "80px", boxShadow: "var(--shadow-sm), inset 0 1px 0 var(--specular-top)" }}>
              <div className="text-xl font-bold font-mono" style={{ color: "var(--accent)", letterSpacing: "-0.04em" }}>
                {hydrated ? `${overallReadiness}%` : "—"}
              </div>
              <div className="text-[9px] font-mono uppercase tracking-wider mt-0.5" style={{ color: "var(--text-muted)" }}>
                Ready
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {[
            { label: "Topics studied", value: `${doneTopics}/${totalTopics}`,         color: "var(--accent)" },
            { label: "Checklist",       value: `${finalDone}/${FINAL_CHECKLIST.length}`, color: "#f5a623" },
            { label: "Target",          value: "Microsoft DS/MLE",                    color: "#4da6ff" },
            { label: "Timeline",        value: "6-12 months",                         color: "#b48eff" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{s.label}:</span>
              <span className="text-[10px] font-mono font-semibold" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{ background: "var(--glass-fill)" }}>
          <div className="h-1 rounded-full transition-all duration-700"
            style={{ width: `${Math.round((doneTopics / totalTopics) * 100)}%`,
              background: "linear-gradient(90deg, var(--accent), #4da6ff)" }} />
        </div>

        {/* Supabase save indicator */}
        {hydrated && (
          <p className="text-[9px] font-mono mt-1.5" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
            ✓ Progress saved to cloud — works on any browser, any device
          </p>
        )}
      </header>

      {/* ── TABS ── */}
      <div className="flex gap-2 mb-5" style={{ overflowX: "auto", scrollbarWidth: "none", paddingBottom: "2px" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-xs font-medium flex-shrink-0 transition-all"
            style={{
              background: activeTab === t.id ? "var(--accent-muted)" : "var(--glass-fill)",
              color: activeTab === t.id ? "var(--accent)" : "var(--text-secondary)",
              border: `0.5px solid ${activeTab === t.id ? "var(--accent-dim)" : "var(--glass-border)"}`,
            }}>
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══ DOMAINS TAB ══ */}
      {activeTab === "domains" && (
        <div className="space-y-3 animate-fade-in">
          {DOMAINS.map((domain) => {
            const isExpanded = expandedDomain === domain.id;
            const doneCnt    = domain.topics.filter((_, ti) => checkedTopics.has(`${domain.id}-${ti}`)).length;
            const pct        = Math.round((doneCnt / domain.topics.length) * 100);
            const selfReady  = readiness[domain.id] ?? 0;

            return (
              <div key={domain.id} className="liquid-glass rounded-[20px] overflow-hidden animate-fade-in-up"
                style={{ boxShadow: "var(--shadow-md), inset 0 1px 0 var(--specular-top)" }}>

                <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  onClick={() => setExpandedDomain(isExpanded ? null : domain.id)}>
                  <span style={{ fontSize: "18px", flexShrink: 0 }}>{domain.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{domain.label}</span>
                      <PriorityBadge label={domain.priority} color={domain.priorityColor} />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                        {doneCnt}/{domain.topics.length} topics
                      </span>
                      <div className="flex-1 h-1 rounded-full" style={{ background: "var(--glass-fill)", maxWidth: "80px" }}>
                        <div className="h-1 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: domain.priorityColor }} />
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: domain.priorityColor }}>{pct}%</span>
                    </div>
                  </div>

                  {/* Desktop readiness slider */}
                  <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0" style={{ minWidth: "110px" }}>
                    <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      Self-rating
                    </span>
                    <div className="flex items-center gap-2">
                      <input type="range" min="0" max="100" step="5" value={selfReady}
                        onChange={(e) => { e.stopPropagation(); updateReadiness(domain.id, +e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-16" style={{ accentColor: domain.priorityColor }} />
                      <span className="text-[10px] font-mono font-bold"
                        style={{ color: domain.priorityColor, minWidth: "30px" }}>{selfReady}%</span>
                    </div>
                  </div>

                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    style={{ color: "var(--text-muted)", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.25s ease", flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2 animate-fade-in"
                    style={{ borderTop: "0.5px solid var(--glass-border-subtle)", paddingTop: "12px" }}>
                    <p className="text-[11px] font-mono mb-3 italic"
                      style={{ color: "var(--text-muted)", background: `${domain.priorityColor}10`,
                        padding: "8px 12px", borderRadius: "10px", border: `0.5px solid ${domain.priorityColor}25` }}>
                      💡 {domain.note}
                    </p>

                    {/* Mobile readiness slider */}
                    <div className="flex items-center gap-3 mb-3 sm:hidden">
                      <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>Self-rating:</span>
                      <input type="range" min="0" max="100" step="5" value={selfReady}
                        onChange={(e) => updateReadiness(domain.id, +e.target.value)}
                        className="flex-1" style={{ accentColor: domain.priorityColor }} />
                      <span className="text-[10px] font-mono font-bold"
                        style={{ color: domain.priorityColor }}>{selfReady}%</span>
                    </div>

                    {domain.topics.map((topic, ti) => {
                      const key     = `${domain.id}-${ti}`;
                      const checked = checkedTopics.has(key);
                      return (
                        <button key={ti} onClick={() => toggleTopic(key)}
                          className="w-full flex items-start gap-3 px-3 py-2.5 rounded-[12px] text-left transition-all"
                          style={{
                            background: checked ? `${domain.priorityColor}12` : "var(--glass-fill-deep)",
                            border: `0.5px solid ${checked ? domain.priorityColor + "40" : "var(--glass-border-subtle)"}`,
                          }}>
                          <div style={{ flexShrink: 0, width: "16px", height: "16px", borderRadius: "5px",
                            border: `1.5px solid ${checked ? domain.priorityColor : "var(--glass-border)"}`,
                            background: checked ? domain.priorityColor : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            marginTop: "1px", transition: "all 0.15s ease" }}>
                            {checked && (
                              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                                <path d="M2 6l3 3 5-5"/>
                              </svg>
                            )}
                          </div>
                          <span className="text-xs font-mono flex-1"
                            style={{ color: checked ? "var(--text-muted)" : "var(--text-secondary)",
                              textDecoration: checked ? "line-through" : "none" }}>
                            {topic}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ COMPANY TAB ══ */}
      {activeTab === "company" && (
        <div className="space-y-4 animate-fade-in">
          <SectionHeader emoji="🎯" title="Company-Specific Focus"
            subtitle="Know what each company values — tailor your prep accordingly" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMPANIES.map((co) => (
              <div key={co.name} className="liquid-glass rounded-[20px] p-4 animate-fade-in-up"
                style={{
                  border: co.highlight ? `1.5px solid ${co.color}60` : "0.5px solid var(--glass-border)",
                  boxShadow: co.highlight
                    ? `var(--shadow-md), 0 0 24px ${co.color}20, inset 0 1px 0 var(--specular-top)`
                    : "var(--shadow-sm), inset 0 1px 0 var(--specular-top)",
                }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "20px" }}>{co.emoji}</span>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{co.name}</span>
                  </div>
                  <PriorityBadge label={co.priority} color={co.color} />
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider block mb-1"
                      style={{ color: "var(--text-muted)" }}>Key Focus</span>
                    <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{co.focus}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider block mb-1"
                      style={{ color: "var(--text-muted)" }}>Unique Topics</span>
                    <p className="text-xs font-mono" style={{ color: co.color }}>{co.unique}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Round types */}
          <div className="mt-6">
            <SectionHeader emoji="🔄" title="Interview Round Types"
              subtitle="Know exactly what to expect in each round" />
            <div className="space-y-2">
              {ROUND_TYPES.map((r, i) => (
                <div key={i} className="liquid-glass rounded-[16px] px-4 py-3 flex items-center gap-3 animate-fade-in-up"
                  style={{ animationDelay: `${i * 30}ms`, boxShadow: "var(--shadow-sm), inset 0 1px 0 var(--specular-top)" }}>
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "0.5px solid var(--accent-dim)" }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{r.round}</span>
                      <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{r.duration}</span>
                    </div>
                    <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>{r.expect}</p>
                  </div>
                  <span className="text-[10px] font-mono flex-shrink-0 px-2 py-1 rounded-full"
                    style={{ background: "var(--glass-fill)", color: "var(--accent)", border: "0.5px solid var(--glass-border)" }}>
                    {r.passRate}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Behavioral */}
          <div className="mt-6">
            <SectionHeader emoji="💬" title="Behavioral Questions"
              subtitle="5 STAR-format stories with quantified impact — prepare all of these" />
            <div className="space-y-2">
              {BEHAVIORAL_QUESTIONS.map((q, i) => (
                <div key={i} className="liquid-glass rounded-[14px] px-4 py-3 flex items-start gap-3 animate-fade-in-up"
                  style={{ animationDelay: `${i * 25}ms` }}>
                  <span className="text-[10px] font-mono font-bold flex-shrink-0 mt-0.5"
                    style={{ color: "var(--accent)", background: "var(--accent-muted)",
                      padding: "2px 7px", borderRadius: "100px", border: "0.5px solid var(--accent-dim)" }}>
                    Q{i + 1}
                  </span>
                  <p className="text-xs font-mono" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{q}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ PLAN TAB ══ */}
      {activeTab === "plan" && (
        <div className="space-y-4 animate-fade-in">
          <SectionHeader emoji="📅" title="12-Week Study Plan"
            subtitle="Structured weekly focus — adjust to your pace" />
          <div className="space-y-3">
            {WEEKLY_PLAN.map((w, i) => {
              const colors = ["#f87171","#f87171","#fb923c","#fbbf24","#a78bfa","#5ecf95"];
              // Determine if this is the current active week (assume plan started 12 weeks from now, check which week we'd be on)
              // Simple heuristic: mark week based on how many study checklist items are done
              const topicsCheckedCount = checkedTopics.size;
              const totalTopicsCount   = DOMAINS.reduce((s,d) => s + d.topics.length, 0);
              const progressPct        = totalTopicsCount > 0 ? topicsCheckedCount / totalTopicsCount : 0;
              const currentWeekIndex   = Math.min(Math.floor(progressPct * WEEKLY_PLAN.length), WEEKLY_PLAN.length - 1);
              const isCurrentWeek      = i === currentWeekIndex;
              return (
                <div key={i} className="liquid-glass rounded-[20px] p-4 animate-fade-in-up"
                  style={{ animationDelay: `${i * 40}ms`, boxShadow: isCurrentWeek ? `var(--shadow-md), 0 0 0 1.5px ${colors[i]}60, inset 0 1px 0 var(--specular-top)` : "var(--shadow-md), inset 0 1px 0 var(--specular-top)" }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 rounded-[10px] px-3 py-2 text-center"
                      style={{ background: `${colors[i]}15`, border: `0.5px solid ${colors[i]}35`, minWidth: "56px" }}>
                      <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Week</div>
                      <div className="text-sm font-bold font-mono" style={{ color: colors[i] }}>{w.weeks}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{w.focus}</p>
                        {isCurrentWeek && (
                          <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", letterSpacing: "0.08em", background: `${colors[i]}20`, color: colors[i], border: `0.5px solid ${colors[i]}45` }}>
                            CURRENT
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{w.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <SectionHeader emoji="📚" title="Must-Know Resources" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { type: "Practice", items: ["LeetCode — Arrays, HashMap, SQL sections", "StrataScratch — Real DS interview questions", "DataLemur — SQL & stats interview questions", "Kaggle — Datasets, notebooks, competitions"] },
                { type: "Books",    items: ["Ace the Data Science Interview — Nick Singh", "Designing ML Systems — Chip Huyen", "Elements of Statistical Learning — Hastie et al.", "Causal Inference: The Mixtape — Cunningham"] },
              ].map((section) => (
                <div key={section.type} className="liquid-glass rounded-[18px] p-4"
                  style={{ boxShadow: "var(--shadow-sm), inset 0 1px 0 var(--specular-top)" }}>
                  <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>{section.type}</p>
                  <div className="space-y-1.5">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: "var(--accent)" }} />
                        <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ CHECKLIST TAB ══ */}
      {activeTab === "checklist" && (
        <div className="space-y-4 animate-fade-in">
          <SectionHeader emoji="✅" title="Final Interview Checklist"
            subtitle={`${finalDone}/${FINAL_CHECKLIST.length} ready — check off when confident`} />

          <div className="liquid-glass rounded-[22px] p-6 flex items-center gap-6 animate-fade-in-up"
            style={{ boxShadow: "var(--shadow-md), inset 0 1px 0 var(--specular-top)" }}>
            <div className="relative flex-shrink-0" style={{ width: "80px", height: "80px" }}>
              <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--glass-fill)" strokeWidth="6"/>
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--accent)" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * (1 - finalDone / FINAL_CHECKLIST.length)}
                  style={{ transition: "stroke-dashoffset 0.6s ease" }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold font-mono" style={{ color: "var(--accent)", lineHeight: 1 }}>
                  {Math.round((finalDone / FINAL_CHECKLIST.length) * 100)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Interview readiness</p>
              <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                {finalDone} of {FINAL_CHECKLIST.length} areas ready
              </p>
              <p className="text-[11px] font-mono mt-2 italic" style={{ color: "var(--accent)" }}>
                🚀 Clear thinking under ambiguity &gt; perfect answers.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {FINAL_CHECKLIST.map((item, i) => {
              const checked = checkedFinal.has(i);
              return (
                <button key={i} onClick={() => toggleFinal(i)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 rounded-[16px] text-left transition-all animate-fade-in-up"
                  style={{
                    animationDelay: `${i * 30}ms`,
                    background: checked ? "rgba(94,207,149,0.08)" : "var(--glass-fill)",
                    border: `0.5px solid ${checked ? "rgba(94,207,149,0.35)" : "var(--glass-border)"}`,
                    boxShadow: checked ? "inset 0 1px 0 rgba(94,207,149,0.15)" : "inset 0 1px 0 var(--specular-top)",
                    backdropFilter: "blur(12px)",
                  }}>
                  <div style={{ flexShrink: 0, width: "20px", height: "20px", borderRadius: "6px",
                    border: `1.5px solid ${checked ? "#5ecf95" : "var(--glass-border)"}`,
                    background: checked ? "#5ecf95" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginTop: "1px", transition: "all 0.18s ease" }}>
                    {checked && (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M2 6l3 3 5-5"/>
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: "var(--glass-fill)", color: "var(--text-muted)",
                          border: "0.5px solid var(--glass-border-subtle)" }}>
                        {item.domain}
                      </span>
                    </div>
                    <p className="text-xs font-mono"
                      style={{ color: checked ? "var(--text-muted)" : "var(--text-secondary)",
                        textDecoration: checked ? "line-through" : "none", lineHeight: 1.5 }}>
                      {item.item}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
