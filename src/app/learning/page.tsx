"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchLearningProgress, toggleLearningTopic, type LearningProgress } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// ROADMAP DATA
// ─────────────────────────────────────────────────────────────────────────────
interface Week { label: string; goals: string[]; }
interface PracticeSet { title: string; problems: string[]; }
interface Track { label: string; topics: string[]; }
interface Phase {
  id: number;
  title: string;
  duration: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  milestone: string;
  resources: string[];
  tracks: Track[];
  weeks: Week[];
  practice: PracticeSet[];
}

const PHASES: Phase[] = [
  {
    id: 0,
    title: "Python for ML",
    duration: "Weeks 1–4",
    accentColor: "#534AB7",
    bgColor: "rgba(83,74,183,0.13)",
    textColor: "#a09aee",
    milestone: "Solve 30 LeetCode Easy in Python",
    resources: ["Real Python", "Automate the Boring Stuff", "LeetCode", "Kaggle Learn Python"],
    tracks: [
      {
        label: "Python Foundations",
        topics: [
          "OOP — classes, inheritance, dunder methods",
          "List comprehensions, generators, decorators",
          "File I/O, JSON, CSV handling",
          "Error handling & logging",
          "Virtual envs, pip, packaging",
        ],
      },
      {
        label: "Python for Data",
        topics: [
          "NumPy — arrays, broadcasting, vectorization",
          "Pandas — DataFrame, groupby, merge, pivot",
          "Matplotlib & Seaborn — EDA plots",
          "Jupyter notebooks — best practices",
          "Regular expressions for text cleaning",
        ],
      },
    ],
    weeks: [
      { label: "Week 1", goals: ["Revise OOP: write 3 classes with inheritance", "NumPy arrays: 20 exercises", "10 LeetCode Easy (arrays & strings)"] },
      { label: "Week 2", goals: ["Pandas: load, clean, merge 2 real datasets", "List comprehensions & generators deep dive", "10 LeetCode Easy (hashmaps & sets)"] },
      { label: "Week 3", goals: ["Matplotlib EDA: visualize a Kaggle dataset", "Decorators & context managers", "10 LeetCode Easy (two pointers)"] },
      { label: "Week 4", goals: ["Full EDA project: end-to-end on a real dataset", "Error handling, logging, virtual envs", "Review & refactor all 30 LeetCode solutions"] },
    ],
    practice: [
      {
        title: "Python OOP",
        problems: [
          "Build a BankAccount class with deposit, withdraw, and overdraft protection",
          "Implement a Stack and Queue using Python classes",
          "Write a decorator that caches function results (memoization)",
          "Create a context manager for safe file handling using __enter__/__exit__",
          "Build a simple linked list with insert, delete, search methods",
        ],
      },
      {
        title: "NumPy & Pandas",
        problems: [
          "Normalize a NumPy array to range [0, 1] without using sklearn",
          "Find all rows in a DataFrame where salary > mean and department = 'Engineering'",
          "Pivot a sales dataset to show monthly totals per product",
          "Merge two DataFrames on a fuzzy key (approximate string match)",
          "Compute a 7-day rolling average of stock prices using pandas",
        ],
      },
    ],
  },
  {
    id: 1,
    title: "DSA for Interviews",
    duration: "Weeks 3–18 (daily)",
    accentColor: "#185FA5",
    bgColor: "rgba(24,95,165,0.13)",
    textColor: "#6aaee8",
    milestone: "100 LC problems · 1 mock interview session",
    resources: ["NeetCode 150", "Striver SDE Sheet", "LeetCode Premium", "AlgoExpert"],
    tracks: [
      {
        label: "Core Data Structures",
        topics: [
          "Arrays, strings, sliding window",
          "Hashmaps, sets — O(1) lookups",
          "Linked lists — fast/slow pointer",
          "Stacks, queues, monotonic stack",
          "Trees, BST, traversals (BFS/DFS)",
          "Heaps & priority queues",
          "Tries & Union-Find",
        ],
      },
      {
        label: "Algorithms",
        topics: [
          "Two pointers & binary search",
          "Recursion & backtracking",
          "Dynamic programming (1D → 2D)",
          "Graphs — Dijkstra, BFS, DFS",
          "Greedy algorithms",
          "Sorting internals (merge, quick)",
          "Time/space complexity analysis",
        ],
      },
    ],
    weeks: [
      { label: "Weeks 3–4", goals: ["Arrays & strings: 15 LC Easy/Medium", "Sliding window pattern — 5 problems", "Two pointers — 5 problems"] },
      { label: "Weeks 5–6", goals: ["Hashmaps & sets — 10 problems", "Linked list + fast/slow pointer — 8 problems", "Stack & queue — 8 problems"] },
      { label: "Weeks 7–8", goals: ["Trees & BST — 10 problems (BFS + DFS)", "Binary search — 8 problems", "Heaps — 5 problems"] },
      { label: "Weeks 9–10", goals: ["Recursion & backtracking — 8 problems", "1D DP — 8 problems (Fibonacci, coin change)", "Graphs BFS/DFS — 8 problems"] },
      { label: "Weeks 11–12", goals: ["2D DP — 6 problems (knapsack, LCS)", "Greedy — 6 problems", "Tries & Union-Find — 5 problems"] },
      { label: "Weeks 13–18", goals: ["Mixed mock sessions: 2 problems in 45 min", "Dijkstra & advanced graph problems", "Review & optimize weak areas", "Full mock interview on Pramp every 2 weeks"] },
    ],
    practice: [
      {
        title: "Must-Solve Problems (NeetCode 150)",
        problems: [
          "Two Sum, Best Time to Buy/Sell Stock, Contains Duplicate",
          "Valid Anagram, Group Anagrams, Top K Frequent Elements",
          "Reverse Linked List, Merge Two Sorted Lists, LRU Cache",
          "Invert Binary Tree, Maximum Depth, Lowest Common Ancestor",
          "Climbing Stairs, House Robber, Coin Change, Longest Increasing Subsequence",
        ],
      },
      {
        title: "Graph & Advanced",
        problems: [
          "Number of Islands (BFS/DFS), Clone Graph, Pacific Atlantic Water Flow",
          "Course Schedule I & II (topological sort)",
          "Word Search (backtracking), N-Queens (backtracking)",
          "Merge K Sorted Lists (heap), Find Median from Data Stream",
          "Alien Dictionary (topological sort + graph)",
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Core ML",
    duration: "Weeks 5–12",
    accentColor: "#0F6E56",
    bgColor: "rgba(15,110,86,0.13)",
    textColor: "#4ecfa0",
    milestone: "3 Kaggle notebooks published",
    resources: ["Andrew Ng Coursera", "scikit-learn docs", "Kaggle Learn ML", "Hands-On ML (Géron)"],
    tracks: [
      {
        label: "Supervised Learning",
        topics: [
          "Linear & Logistic Regression from scratch",
          "Decision Trees, Random Forest, XGBoost",
          "SVM & KNN",
          "Cross-validation & hyperparameter tuning",
          "Imbalanced classes — SMOTE, class weights",
          "Feature engineering & selection",
        ],
      },
      {
        label: "Unsupervised + Evaluation",
        topics: [
          "K-Means, DBSCAN, hierarchical clustering",
          "PCA & dimensionality reduction",
          "Metrics — accuracy, F1, AUC-ROC, RMSE",
          "Confusion matrix & classification report",
          "Bias-variance tradeoff",
          "Model interpretability — SHAP, LIME",
        ],
      },
    ],
    weeks: [
      { label: "Week 5", goals: ["Linear regression from scratch (numpy only)", "Implement gradient descent manually", "Andrew Ng Week 1–2"] },
      { label: "Week 6", goals: ["Logistic regression + sigmoid + cross-entropy", "sklearn: fit, predict, score pipeline", "Andrew Ng Week 3"] },
      { label: "Week 7", goals: ["Decision Trees + Random Forest on Titanic dataset", "Cross-validation: k-fold, stratified", "Feature importance analysis"] },
      { label: "Week 8", goals: ["XGBoost: hyperparameter tuning with GridSearchCV", "SMOTE for imbalanced dataset (fraud detection)", "Kaggle notebook #1 published"] },
      { label: "Week 9", goals: ["K-Means clustering: customer segmentation project", "PCA: visualize high-dim data in 2D", "Silhouette score, elbow method"] },
      { label: "Week 10", goals: ["SHAP values: explain a Random Forest model", "AUC-ROC, precision-recall curves", "Kaggle notebook #2 published"] },
      { label: "Week 11", goals: ["Full pipeline: EDA → feature engineering → model → eval", "SVM: kernel trick, support vectors concept", "Bias-variance: overfit vs underfit examples"] },
      { label: "Week 12", goals: ["End-to-end ML project: house price prediction", "Kaggle notebook #3 published", "Core ML interview prep (top 50 questions)"] },
    ],
    practice: [
      {
        title: "Implement from Scratch",
        problems: [
          "Linear regression with gradient descent — no sklearn",
          "Logistic regression with sigmoid, binary cross-entropy loss",
          "Decision tree: implement Gini impurity split from scratch",
          "K-Means: implement Lloyd's algorithm with random initialization",
          "PCA: compute using SVD on a real dataset",
        ],
      },
      {
        title: "Kaggle Competitions",
        problems: [
          "Titanic — classification baseline with Random Forest",
          "House Prices — regression with XGBoost + feature engineering",
          "Chest X-Ray (Pneumonia) — image classification starter",
          "SMS Spam — NLP text classification with TF-IDF + LogReg",
          "Tabular Playground — feature engineering + ensemble methods",
        ],
      },
    ],
  },
  {
    id: 3,
    title: "Deep Learning",
    duration: "Weeks 13–20",
    accentColor: "#993C1D",
    bgColor: "rgba(153,60,29,0.13)",
    textColor: "#e8895a",
    milestone: "End-to-end DL project on GitHub",
    resources: ["fast.ai Practical DL", "PyTorch docs", "d2l.ai", "Deep Learning Specialization (Coursera)"],
    tracks: [
      {
        label: "Neural Networks",
        topics: [
          "Forward & backpropagation from scratch",
          "PyTorch tensors, autograd, nn.Module",
          "CNNs — conv, pooling, BatchNorm",
          "Transfer learning — ResNet, EfficientNet",
          "RNNs, LSTMs, GRUs",
        ],
      },
      {
        label: "Modern Architectures",
        topics: [
          "Transformers & self-attention (theory)",
          "HuggingFace — fine-tune BERT/DistilBERT",
          "GPT-style generation basics",
          "Training tricks — LR scheduling, dropout",
          "GPU usage — CUDA, mixed precision",
        ],
      },
    ],
    weeks: [
      { label: "Week 13", goals: ["Backpropagation from scratch (numpy)", "PyTorch basics: tensors, autograd, .backward()", "Build a 2-layer NN on MNIST"] },
      { label: "Week 14", goals: ["CNN from scratch on CIFAR-10", "BatchNorm, Dropout, weight initialization", "fast.ai Lesson 1 & 2"] },
      { label: "Week 15", goals: ["Transfer learning: fine-tune ResNet18 on custom dataset", "Data augmentation pipeline", "fast.ai Lesson 3 & 4"] },
      { label: "Week 16", goals: ["LSTM: sentiment analysis on IMDB dataset", "Sequence-to-sequence basics", "Vanishing gradient & solutions"] },
      { label: "Week 17", goals: ["Transformers: implement scaled dot-product attention", "HuggingFace: load & fine-tune DistilBERT", "Text classification with BERT"] },
      { label: "Week 18", goals: ["Mixed precision training with torch.cuda.amp", "Learning rate scheduling (cosine, OneCycle)", "Model checkpointing & early stopping"] },
      { label: "Weeks 19–20", goals: ["End-to-end DL project: choose domain (NLP/CV/tabular)", "Write clean README with results & plots", "Push to GitHub — this is a portfolio piece"] },
    ],
    practice: [
      {
        title: "PyTorch Exercises",
        problems: [
          "Implement a 3-layer MLP from scratch (no nn.Sequential) with manual weight updates",
          "Build a custom Dataset and DataLoader for a CSV file",
          "Implement a CNN that achieves >90% on MNIST using only conv + pool + linear layers",
          "Fine-tune a pretrained ResNet18 on a 5-class image dataset of your choice",
          "Build a character-level language model with LSTM (generate text after training)",
        ],
      },
      {
        title: "HuggingFace & Transformers",
        problems: [
          "Fine-tune DistilBERT on SST-2 sentiment dataset using Trainer API",
          "Use a pipeline() for zero-shot classification on 5 custom categories",
          "Load a tokenizer, tokenize a batch, inspect token IDs and attention masks",
          "Use a generation model (GPT-2) to complete 5 different prompts",
          "Evaluate a fine-tuned model using F1, precision, recall with datasets library",
        ],
      },
    ],
  },
  {
    id: 4,
    title: "MLOps + System Design",
    duration: "Weeks 17–22",
    accentColor: "#854F0B",
    bgColor: "rgba(133,79,11,0.13)",
    textColor: "#d4924a",
    milestone: "Deploy 1 model as REST API",
    resources: ["Made With ML", "Chip Huyen's MLSys Design", "FastAPI docs", "Docker docs"],
    tracks: [
      {
        label: "MLOps Essentials",
        topics: [
          "MLflow — experiment tracking",
          "Docker basics — containerize model",
          "FastAPI — build & deploy model API",
          "CI/CD with GitHub Actions",
          "Cloud basics — AWS SageMaker or GCP Vertex",
        ],
      },
      {
        label: "ML System Design",
        topics: [
          "Recommendation systems design",
          "Search ranking architecture",
          "Feature stores & data pipelines",
          "A/B testing & model monitoring",
          "Scaling inference — batching, caching",
          "Design interview framework (case study)",
        ],
      },
    ],
    weeks: [
      { label: "Week 17", goals: ["MLflow: log experiments, metrics, artifacts for a sklearn model", "Understand run comparison and model registry"] },
      { label: "Week 18", goals: ["Docker: write Dockerfile, build image, run container", "Containerize a trained model + inference script"] },
      { label: "Week 19", goals: ["FastAPI: build /predict endpoint for a model", "Add input validation with Pydantic", "Test with Postman or curl"] },
      { label: "Week 20", goals: ["GitHub Actions: CI pipeline that runs tests on push", "Deploy Dockerized FastAPI to Render or Railway (free tier)"] },
      { label: "Week 21", goals: ["ML System Design: study recommendation system design", "Read Chip Huyen Chapter 1–3", "Practice: design a YouTube recommendation system (whiteboard)"] },
      { label: "Week 22", goals: ["A/B testing: how to compare model A vs B in production", "Feature store concept: what, why, how (Feast intro)", "Mock ML system design interview (45 min)"] },
    ],
    practice: [
      {
        title: "MLOps Hands-On",
        problems: [
          "Train a classifier, log all params/metrics to MLflow, compare 3 runs",
          "Write a Dockerfile for a FastAPI app that loads a .pkl model and serves /predict",
          "Build a GitHub Actions workflow: lint → test → build Docker image on PR",
          "Create a FastAPI app with /health, /predict, and /metrics endpoints",
          "Deploy a model API to a free cloud service and share the live URL",
        ],
      },
      {
        title: "System Design Scenarios",
        problems: [
          "Design a real-time fraud detection system (latency < 50ms)",
          "Design Netflix movie recommendations for 100M users",
          "Design a document search engine with semantic similarity",
          "Design a model monitoring system that detects data drift",
          "Design the ML pipeline for Google's ad click-through rate prediction",
        ],
      },
    ],
  },
  {
    id: 5,
    title: "Portfolio + Interviews",
    duration: "Weeks 20–26",
    accentColor: "#993556",
    bgColor: "rgba(153,53,86,0.13)",
    textColor: "#e07fa0",
    milestone: "3 portfolio projects · Resume + LinkedIn optimized",
    resources: ["GitHub + Vercel", "Interview Kickstart", "Pramp", "Glassdoor MNC questions"],
    tracks: [
      {
        label: "Portfolio Projects",
        topics: [
          "Project 1: ML end-to-end (Kaggle dataset + deployed API)",
          "Project 2: NLP — text classification or QA system",
          "Project 3: ML system design + FastAPI deployment",
          "GitHub README quality — metrics, demo GIFs, architecture diagram",
          "Kaggle competition participation (top 30%)",
        ],
      },
      {
        label: "Interview Prep",
        topics: [
          "ML breadth — top 50 theory Q&A mastered",
          "ML system design case study (1hr mock)",
          "Coding rounds — LC Medium in 30 min",
          "Behavioral — STAR format, impact stories",
          "Resume tailoring for Google/Microsoft/Amazon",
          "Mock interviews on Pramp or peer pairing",
        ],
      },
    ],
    weeks: [
      { label: "Week 20", goals: ["Choose 3 portfolio project topics", "Start Project 1: EDA + baseline model", "Draft resume v1 — quantify all impact"] },
      { label: "Week 21", goals: ["Project 1: deploy API, write README", "ML theory Q&A: revise 20 core questions", "LinkedIn: optimize headline, about, skills"] },
      { label: "Week 22", goals: ["Start Project 2: NLP project", "ML system design: 2 practice designs per week", "Apply to 5 target companies"] },
      { label: "Week 23", goals: ["Project 2: complete + push to GitHub", "50 ML Q&A done", "Pramp mock: coding + behavioral"] },
      { label: "Week 24", goals: ["Start & finish Project 3: MLOps + deployment", "ML system design mock interview (full 45 min)", "Resume v2 with project links"] },
      { label: "Week 25", goals: ["Apply to 10+ companies", "LC contest participation (weekly)", "Full mock loop: coding + ML design + behavioral"] },
      { label: "Week 26", goals: ["Final review: all 3 projects polished", "Top 50 ML Q&A: verbal recall test", "Target: first interview scheduled"] },
    ],
    practice: [
      {
        title: "ML Interview Q&A",
        problems: [
          "Explain bias-variance tradeoff with a concrete example",
          "How does XGBoost differ from Random Forest? When do you prefer each?",
          "Walk through how you'd handle a severely imbalanced dataset (1:100 ratio)",
          "What is the vanishing gradient problem and how do ResNets solve it?",
          "How would you detect and handle data drift in a production model?",
        ],
      },
      {
        title: "Behavioral (STAR format)",
        problems: [
          "Tell me about a time you owned a project end-to-end with ambiguous requirements",
          "Describe a situation where your analysis/model was wrong — what did you do?",
          "How have you explained a complex technical concept to a non-technical stakeholder?",
          "Give an example of a time you disagreed with a team decision — what happened?",
          "What is the most impactful thing you have built? Walk me through the outcome.",
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
type DoneMap = Record<string, boolean>;
function makeKey(phaseId: number, ti: number, i: number) { return `${phaseId}-${ti}-${i}`; }

function phaseProgress(phase: Phase, done: DoneMap) {
  let total = 0, doneCount = 0;
  phase.tracks.forEach((t, ti) => {
    t.topics.forEach((_, i) => { total++; if (done[makeKey(phase.id, ti, i)]) doneCount++; });
  });
  return total === 0 ? 0 : Math.round((doneCount / total) * 100);
}

function overallProgress(done: DoneMap) {
  let total = 0, doneCount = 0;
  PHASES.forEach((p) =>
    p.tracks.forEach((t, ti) =>
      t.topics.forEach((_, i) => { total++; if (done[makeKey(p.id, ti, i)]) doneCount++; })
    )
  );
  return total === 0 ? 0 : Math.round((doneCount / total) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function LearningPage() {
  const [done, setDone] = useState<DoneMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [openPhase, setOpenPhase] = useState<number | null>(0);
  const [tab, setTab] = useState<Record<number, "topics" | "weeks" | "practice">>({});

  useEffect(() => {
    fetchLearningProgress()
      .then((rows: LearningProgress[]) => {
        const map: DoneMap = {};
        rows.forEach((r) => { if (r.is_done) map[makeKey(r.phase_id, r.track_index, r.topic_index)] = true; });
        setDone(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = useCallback(
    async (phaseId: number, trackIndex: number, topicIndex: number) => {
      const key = makeKey(phaseId, trackIndex, topicIndex);
      const current = !!done[key];
      setDone((prev) => ({ ...prev, [key]: !current }));
      setSaving(key);
      try {
        await toggleLearningTopic(phaseId, trackIndex, topicIndex, current);
      } catch {
        setDone((prev) => ({ ...prev, [key]: current }));
        window.dispatchEvent(new CustomEvent("srn:toast", { detail: { message: "Save failed — try again", type: "error" } }));
      } finally {
        setSaving(null);
      }
    },
    [done]
  );

  const getTab = (phaseId: number) => tab[phaseId] ?? "topics";
  const setPhaseTab = (phaseId: number, t: "topics" | "weeks" | "practice") =>
    setTab((prev) => ({ ...prev, [phaseId]: t }));

  const totalTopics = PHASES.reduce((s, p) => s + p.tracks.reduce((ss, t) => ss + t.topics.length, 0), 0);
  const doneCnt = Object.values(done).filter(Boolean).length;
  const overall = overallProgress(done);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32 md:pb-10">

      {/* ── HEADER ── */}
      <header className="mb-6 animate-fade-in-up">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              ML/DS Learning Roadmap
            </h1>
            <p className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>
              6-phase · 26 weeks · Python + ML + DSA + MLOps → Top MNC
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-2xl font-semibold font-mono" style={{ color: "var(--accent)" }}>{overall}%</div>
            <div className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{doneCnt}/{totalTopics} topics</div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${overall}%`, background: `linear-gradient(90deg, var(--accent), hsl(var(--accent-h),var(--accent-s),calc(var(--accent-l)+16%)))` }}
          />
        </div>

        {/* Phase summary pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          {PHASES.map((p) => {
            const pct = phaseProgress(p, done);
            return (
              <button
                key={p.id}
                onClick={() => setOpenPhase(openPhase === p.id ? null : p.id)}
                className="flex items-center gap-1.5 rounded-full text-[10px] font-mono transition-all"
                style={{ padding: "5px 11px", background: openPhase === p.id ? p.bgColor : "var(--glass-fill)", border: `0.5px solid ${openPhase === p.id ? p.accentColor + "55" : "var(--glass-border)"}`, color: openPhase === p.id ? p.textColor : "var(--text-muted)" }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: pct === 100 ? p.accentColor : pct > 0 ? p.accentColor + "88" : "var(--glass-border)", display: "inline-block", flexShrink: 0 }} />
                {p.title.split(" ")[0]}
                <span style={{ opacity: 0.65 }}>{pct}%</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ── LOADING STATE ── */}
      {loading && (
        <div className="flex items-center justify-center py-20 animate-fade-in">
          <div className="glass rounded-2xl px-8 py-6 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-transparent mx-auto mb-3 animate-spin"
              style={{ borderTopColor: "var(--accent)", borderRightColor: "var(--accent-dim)" }} />
            <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading your progress…</p>
          </div>
        </div>
      )}

      {/* ── PHASES ── */}
      {!loading && (
        <div className="space-y-3">
          {PHASES.map((phase, pi) => {
            const pct = phaseProgress(phase, done);
            const isOpen = openPhase === phase.id;
            const activeTab = getTab(phase.id);

            return (
              <div
                key={phase.id}
                className="liquid-glass rounded-[22px] overflow-hidden animate-fade-in-up hover-lift"
                style={{ animationDelay: `${pi * 40}ms`, border: isOpen ? `0.5px solid ${phase.accentColor}40` : undefined }}
              >
                {/* Accent top bar */}
                <div style={{ height: "2px", background: `linear-gradient(90deg,${phase.accentColor},transparent)` }} />

                {/* Phase header — click to open/close */}
                <button
                  className="w-full flex items-center gap-3 text-left"
                  style={{ padding: "16px 18px" }}
                  onClick={() => setOpenPhase(isOpen ? null : phase.id)}
                >
                  {/* Phase number badge */}
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold font-mono"
                    style={{ background: phase.bgColor, color: phase.textColor, border: `0.5px solid ${phase.accentColor}40` }}
                  >
                    {phase.id + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{phase.title}</span>
                      <span
                        className="text-[9px] font-mono px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: phase.bgColor, color: phase.textColor, border: `0.5px solid ${phase.accentColor}30` }}
                      >
                        {phase.duration}
                      </span>
                      {pct === 100 && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: "rgba(94,207,149,0.14)", color: "#5ecf95", border: "0.5px solid rgba(94,207,149,0.30)" }}>
                          Complete
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: phase.accentColor }} />
                      </div>
                      <span className="text-[10px] font-mono flex-shrink-0" style={{ color: phase.textColor }}>{pct}%</span>
                    </div>
                  </div>

                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    style={{ flexShrink: 0, color: "var(--text-muted)", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {/* Phase body — only when open */}
                {isOpen && (
                  <div className="animate-fade-in" style={{ borderTop: `0.5px solid ${phase.accentColor}20` }}>

                    {/* Milestone banner */}
                    <div className="flex items-center gap-2 px-5 py-3" style={{ background: phase.bgColor }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                        style={{ color: phase.textColor, flexShrink: 0 }}>
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                      </svg>
                      <span className="text-[11px] font-medium" style={{ color: phase.textColor }}>
                        Milestone: {phase.milestone}
                      </span>
                    </div>

                    {/* Tab bar + resources */}
                    <div className="flex items-center gap-1 px-5 pt-4 pb-0 flex-wrap">
                      {(["topics", "weeks", "practice"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setPhaseTab(phase.id, t)}
                          className="px-3 py-2 text-[11px] font-medium rounded-xl capitalize transition-all"
                          style={{
                            background: activeTab === t ? phase.bgColor : "transparent",
                            color: activeTab === t ? phase.textColor : "var(--text-muted)",
                            border: `0.5px solid ${activeTab === t ? phase.accentColor + "40" : "transparent"}`,
                          }}
                        >
                          {t}
                        </button>
                      ))}
                      <div className="ml-auto flex flex-wrap gap-1 items-center">
                        {phase.resources.map((r) => (
                          <span key={r} className="text-[9px] font-mono px-2 py-1 rounded-full"
                            style={{ background: "var(--glass-fill-deep)", color: "var(--text-muted)", border: "0.5px solid var(--glass-border-subtle)" }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* ── TOPICS TAB ── */}
                    {activeTab === "topics" && (
                      <div className="px-5 pt-3 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {phase.tracks.map((track, ti) => (
                          <div key={ti} className="rounded-[16px] overflow-hidden"
                            style={{ background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border-subtle)" }}>
                            <div className="px-4 py-3" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
                              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: phase.textColor }}>
                                {track.label}
                              </span>
                            </div>
                            <div className="px-4 py-2">
                              {track.topics.map((topic, i) => {
                                const key = makeKey(phase.id, ti, i);
                                const isDone = !!done[key];
                                const isSaving = saving === key;
                                return (
                                  <button
                                    key={i}
                                    onClick={() => handleToggle(phase.id, ti, i)}
                                    disabled={isSaving}
                                    className="w-full flex items-start gap-3 py-2.5 text-left transition-all rounded-xl px-2 -mx-2"
                                    style={{ opacity: isSaving ? 0.6 : 1 }}
                                  >
                                    <div
                                      className="flex-shrink-0 flex items-center justify-center transition-all duration-200"
                                      style={{
                                        width: "18px", height: "18px", borderRadius: "5px", marginTop: "1px",
                                        background: isDone ? phase.accentColor : "var(--bg-input)",
                                        border: `1.5px solid ${isDone ? phase.accentColor : "var(--glass-border)"}`,
                                        boxShadow: isDone ? `0 0 8px ${phase.accentColor}44` : "none",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {isDone && (
                                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M2 6l3 3 5-5" />
                                        </svg>
                                      )}
                                    </div>
                                    <span
                                      className="text-xs leading-relaxed"
                                      style={{
                                        color: isDone ? "var(--text-muted)" : "var(--text-secondary)",
                                        textDecoration: isDone ? "line-through" : "none",
                                      }}
                                    >
                                      {topic}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── WEEKS TAB ── */}
                    {activeTab === "weeks" && (
                      <div className="px-5 pt-3 pb-5 space-y-2">
                        {phase.weeks.map((week, wi) => (
                          <div key={wi} className="rounded-[16px] overflow-hidden animate-fade-in-up"
                            style={{ animationDelay: `${wi * 30}ms`, background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border-subtle)" }}>
                            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: phase.accentColor }} />
                              <span className="text-[11px] font-semibold" style={{ color: phase.textColor }}>{week.label}</span>
                            </div>
                            <div className="px-4 py-3 space-y-1.5">
                              {week.goals.map((goal, gi) => (
                                <div key={gi} className="flex items-start gap-2.5">
                                  <div className="w-[3px] h-[3px] rounded-full flex-shrink-0 mt-[6px]"
                                    style={{ background: phase.accentColor + "80" }} />
                                  <span className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{goal}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── PRACTICE TAB ── */}
                    {activeTab === "practice" && (
                      <div className="px-5 pt-3 pb-5 space-y-4">
                        {phase.practice.map((set, si) => (
                          <div key={si} className="rounded-[16px] overflow-hidden animate-fade-in-up"
                            style={{ animationDelay: `${si * 40}ms`, background: "var(--glass-fill-deep)", border: "0.5px solid var(--glass-border-subtle)" }}>
                            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: phase.accentColor }} />
                              <span className="text-[11px] font-semibold" style={{ color: phase.textColor }}>{set.title}</span>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              {set.problems.map((prob, pi2) => (
                                <div key={pi2} className="flex items-start gap-3">
                                  <span className="text-[10px] font-mono flex-shrink-0 w-5 text-right mt-0.5"
                                    style={{ color: phase.accentColor + "80" }}>
                                    {pi2 + 1}.
                                  </span>
                                  <span className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{prob}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
