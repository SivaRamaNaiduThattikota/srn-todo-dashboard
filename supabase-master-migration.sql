-- ═══════════════════════════════════════════════════════════════════════
-- SRN Command Center — COMPLETE MASTER MIGRATION v10.7
-- Run this single file in Supabase SQL Editor.
-- Safe to run multiple times — fully idempotent.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- PART 0: todos — start_date + soft-delete recycle bin
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE todos ADD COLUMN IF NOT EXISTS start_date  date        DEFAULT NULL;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS deleted_at  timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_todos_deleted_at ON todos (deleted_at) WHERE deleted_at IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────
-- PART 0b: notes — soft-delete recycle bin
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes (deleted_at) WHERE deleted_at IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────
-- PART 0c: decisions — soft-delete recycle bin
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_decisions_deleted_at ON decisions (deleted_at) WHERE deleted_at IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────
-- PART 0d: projects — soft-delete recycle bin
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects (deleted_at) WHERE deleted_at IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────
-- PART 0e: learning_phases — soft-delete recycle bin
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE learning_phases ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_learning_phases_deleted_at ON learning_phases (deleted_at) WHERE deleted_at IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────
-- PART 1: learning_progress
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id     int  NOT NULL,
  track_index  int  NOT NULL,
  topic_index  int  NOT NULL,
  is_done      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phase_id, track_index, topic_index)
);
CREATE INDEX IF NOT EXISTS idx_learning_progress_phase ON learning_progress (phase_id);
CREATE OR REPLACE FUNCTION update_learning_progress_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_learning_progress_updated_at ON learning_progress;
CREATE TRIGGER trg_learning_progress_updated_at
  BEFORE UPDATE ON learning_progress FOR EACH ROW EXECUTE FUNCTION update_learning_progress_updated_at();
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_learning_progress" ON learning_progress;
CREATE POLICY "allow_all_learning_progress" ON learning_progress FOR ALL USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────────────
-- PART 2: learning_phases
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_phases (
  id            serial  PRIMARY KEY,
  sort_order    int     NOT NULL DEFAULT 0,
  title         text    NOT NULL,
  duration      text    NOT NULL DEFAULT '',
  accent_color  text    NOT NULL DEFAULT '#534AB7',
  bg_color      text    NOT NULL DEFAULT 'rgba(83,74,183,0.13)',
  text_color    text    NOT NULL DEFAULT '#a09aee',
  milestone     text    NOT NULL DEFAULT '',
  resources     jsonb   NOT NULL DEFAULT '[]',
  tracks        jsonb   NOT NULL DEFAULT '[]',
  weeks         jsonb   NOT NULL DEFAULT '[]',
  practice      jsonb   NOT NULL DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_phases_sort ON learning_phases (sort_order);
CREATE OR REPLACE FUNCTION update_learning_phases_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_learning_phases_updated_at ON learning_phases;
CREATE TRIGGER trg_learning_phases_updated_at
  BEFORE UPDATE ON learning_phases FOR EACH ROW EXECUTE FUNCTION update_learning_phases_updated_at();
ALTER TABLE learning_phases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_learning_phases" ON learning_phases;
CREATE POLICY "allow_all_learning_phases" ON learning_phases FOR ALL USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────────────
-- PART 3: learning_week_progress
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_week_progress (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id    int  NOT NULL REFERENCES learning_phases(id) ON DELETE CASCADE,
  week_index  int  NOT NULL,
  is_done     boolean NOT NULL DEFAULT false,
  done_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phase_id, week_index)
);
CREATE INDEX IF NOT EXISTS idx_learning_week_progress_phase ON learning_week_progress (phase_id);
CREATE OR REPLACE FUNCTION update_learning_week_progress_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_learning_week_progress_updated_at ON learning_week_progress;
CREATE TRIGGER trg_learning_week_progress_updated_at
  BEFORE UPDATE ON learning_week_progress FOR EACH ROW EXECUTE FUNCTION update_learning_week_progress_updated_at();
ALTER TABLE learning_week_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_learning_week_progress" ON learning_week_progress;
CREATE POLICY "allow_all_learning_week_progress" ON learning_week_progress FOR ALL USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────────────
-- PART 4: Seed 6 default learning phases (idempotent)
-- ───────────────────────────────────────────────────────────────────────
INSERT INTO learning_phases (id, sort_order, title, duration, accent_color, bg_color, text_color, milestone, resources, tracks, weeks, practice)
VALUES
(1, 0, 'Python for ML', 'Weeks 1–4', '#534AB7', 'rgba(83,74,183,0.13)', '#a09aee',
 'Solve 30 LeetCode Easy in Python',
 '[{"label":"Real Python","url":"https://realpython.com"},{"label":"Automate the Boring Stuff","url":"https://automatetheboringstuff.com"},{"label":"LeetCode","url":"https://leetcode.com"},{"label":"Kaggle Learn Python","url":"https://www.kaggle.com/learn/python"}]',
 '[{"label":"Python Foundations","topics":["OOP — classes, inheritance, dunder methods","List comprehensions, generators, decorators","File I/O, JSON, CSV handling","Error handling & logging","Virtual envs, pip, packaging"]},{"label":"Python for Data","topics":["NumPy — arrays, broadcasting, vectorization","Pandas — DataFrame, groupby, merge, pivot","Matplotlib & Seaborn — EDA plots","Jupyter notebooks — best practices","Regular expressions for text cleaning"]}]',
 '[{"label":"Week 1","goals":["Revise OOP: write 3 classes with inheritance","NumPy arrays: 20 exercises","10 LeetCode Easy (arrays & strings)"]},{"label":"Week 2","goals":["Pandas: load, clean, merge 2 real datasets","List comprehensions & generators deep dive","10 LeetCode Easy (hashmaps & sets)"]},{"label":"Week 3","goals":["Matplotlib EDA: visualize a Kaggle dataset","Decorators & context managers","10 LeetCode Easy (two pointers)"]},{"label":"Week 4","goals":["Full EDA project: end-to-end on a real dataset","Error handling, logging, virtual envs","Review & refactor all 30 LeetCode solutions"]}]',
 '[{"title":"Python OOP","problems":["Build a BankAccount class with deposit, withdraw, and overdraft protection","Implement a Stack and Queue using Python classes","Write a decorator that caches function results (memoization)","Create a context manager for safe file handling using __enter__/__exit__","Build a simple linked list with insert, delete, search methods"]},{"title":"NumPy & Pandas","problems":["Normalize a NumPy array to range [0, 1] without using sklearn","Find all rows in a DataFrame where salary > mean and department = Engineering","Pivot a sales dataset to show monthly totals per product","Merge two DataFrames on a fuzzy key (approximate string match)","Compute a 7-day rolling average of stock prices using pandas"]}]'),
(2, 1, 'DSA for Interviews', 'Weeks 3–18 (daily)', '#185FA5', 'rgba(24,95,165,0.13)', '#6aaee8',
 '100 LC problems · 1 mock interview session',
 '[{"label":"NeetCode 150","url":"https://neetcode.io"},{"label":"Striver SDE Sheet","url":"https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems"},{"label":"LeetCode","url":"https://leetcode.com"},{"label":"AlgoExpert","url":"https://www.algoexpert.io"}]',
 '[{"label":"Core Data Structures","topics":["Arrays, strings, sliding window","Hashmaps, sets — O(1) lookups","Linked lists — fast/slow pointer","Stacks, queues, monotonic stack","Trees, BST, traversals (BFS/DFS)","Heaps & priority queues","Tries & Union-Find"]},{"label":"Algorithms","topics":["Two pointers & binary search","Recursion & backtracking","Dynamic programming (1D → 2D)","Graphs — Dijkstra, BFS, DFS","Greedy algorithms","Sorting internals (merge, quick)","Time/space complexity analysis"]}]',
 '[{"label":"Weeks 3–4","goals":["Arrays & strings: 15 LC Easy/Medium","Sliding window pattern — 5 problems","Two pointers — 5 problems"]},{"label":"Weeks 5–6","goals":["Hashmaps & sets — 10 problems","Linked list + fast/slow pointer — 8 problems","Stack & queue — 8 problems"]},{"label":"Weeks 7–8","goals":["Trees & BST — 10 problems (BFS + DFS)","Binary search — 8 problems","Heaps — 5 problems"]},{"label":"Weeks 9–10","goals":["Recursion & backtracking — 8 problems","1D DP — 8 problems (Fibonacci, coin change)","Graphs BFS/DFS — 8 problems"]},{"label":"Weeks 11–12","goals":["2D DP — 6 problems (knapsack, LCS)","Greedy — 6 problems","Tries & Union-Find — 5 problems"]},{"label":"Weeks 13–18","goals":["Mixed mock sessions: 2 problems in 45 min","Dijkstra & advanced graph problems","Review & optimize weak areas","Full mock interview on Pramp every 2 weeks"]}]',
 '[{"title":"Must-Solve Problems (NeetCode 150)","problems":["Two Sum, Best Time to Buy/Sell Stock, Contains Duplicate","Valid Anagram, Group Anagrams, Top K Frequent Elements","Reverse Linked List, Merge Two Sorted Lists, LRU Cache","Invert Binary Tree, Maximum Depth, Lowest Common Ancestor","Climbing Stairs, House Robber, Coin Change, Longest Increasing Subsequence"]},{"title":"Graph & Advanced","problems":["Number of Islands (BFS/DFS), Clone Graph, Pacific Atlantic Water Flow","Course Schedule I & II (topological sort)","Word Search (backtracking), N-Queens (backtracking)","Merge K Sorted Lists (heap), Find Median from Data Stream","Alien Dictionary (topological sort + graph)"]}]'),
(3, 2, 'Core ML', 'Weeks 5–12', '#0F6E56', 'rgba(15,110,86,0.13)', '#4ecfa0',
 '3 Kaggle notebooks published',
 '[{"label":"Andrew Ng Coursera","url":"https://www.coursera.org/specializations/machine-learning-introduction"},{"label":"scikit-learn docs","url":"https://scikit-learn.org/stable/"},{"label":"Kaggle Learn ML","url":"https://www.kaggle.com/learn"},{"label":"Hands-On ML (Géron)","url":"https://www.oreilly.com/library/view/hands-on-machine-learning/9781492032632/"}]',
 '[{"label":"Supervised Learning","topics":["Linear & Logistic Regression from scratch","Decision Trees, Random Forest, XGBoost","SVM & KNN","Cross-validation & hyperparameter tuning","Imbalanced classes — SMOTE, class weights","Feature engineering & selection"]},{"label":"Unsupervised + Evaluation","topics":["K-Means, DBSCAN, hierarchical clustering","PCA & dimensionality reduction","Metrics — accuracy, F1, AUC-ROC, RMSE","Confusion matrix & classification report","Bias-variance tradeoff","Model interpretability — SHAP, LIME"]}]',
 '[{"label":"Week 5","goals":["Linear regression from scratch (numpy only)","Implement gradient descent manually","Andrew Ng Week 1–2"]},{"label":"Week 6","goals":["Logistic regression + sigmoid + cross-entropy","sklearn: fit, predict, score pipeline","Andrew Ng Week 3"]},{"label":"Week 7","goals":["Decision Trees + Random Forest on Titanic dataset","Cross-validation: k-fold, stratified","Feature importance analysis"]},{"label":"Week 8","goals":["XGBoost: hyperparameter tuning with GridSearchCV","SMOTE for imbalanced dataset (fraud detection)","Kaggle notebook #1 published"]},{"label":"Week 9","goals":["K-Means clustering: customer segmentation project","PCA: visualize high-dim data in 2D","Silhouette score, elbow method"]},{"label":"Week 10","goals":["SHAP values: explain a Random Forest model","AUC-ROC, precision-recall curves","Kaggle notebook #2 published"]},{"label":"Week 11","goals":["Full pipeline: EDA → feature eng → model → eval","SVM: kernel trick, support vectors concept","Bias-variance: overfit vs underfit examples"]},{"label":"Week 12","goals":["End-to-end ML project: house price prediction","Kaggle notebook #3 published","Core ML interview prep (top 50 questions)"]}]',
 '[{"title":"Implement from Scratch","problems":["Linear regression with gradient descent — no sklearn","Logistic regression with sigmoid, binary cross-entropy loss","Decision tree: implement Gini impurity split from scratch","K-Means: implement Lloyds algorithm with random initialization","PCA: compute using SVD on a real dataset"]},{"title":"Kaggle Competitions","problems":["Titanic — classification baseline with Random Forest","House Prices — regression with XGBoost + feature engineering","Chest X-Ray (Pneumonia) — image classification starter","SMS Spam — NLP text classification with TF-IDF + LogReg","Tabular Playground — feature engineering + ensemble methods"]}]'),
(4, 3, 'Deep Learning', 'Weeks 13–20', '#993C1D', 'rgba(153,60,29,0.13)', '#e8895a',
 'End-to-end DL project on GitHub',
 '[{"label":"fast.ai","url":"https://course.fast.ai"},{"label":"PyTorch docs","url":"https://pytorch.org/docs/stable/index.html"},{"label":"d2l.ai","url":"https://d2l.ai"},{"label":"Deep Learning Specialization","url":"https://www.coursera.org/specializations/deep-learning"}]',
 '[{"label":"Neural Networks","topics":["Forward & backpropagation from scratch","PyTorch tensors, autograd, nn.Module","CNNs — conv, pooling, BatchNorm","Transfer learning — ResNet, EfficientNet","RNNs, LSTMs, GRUs"]},{"label":"Modern Architectures","topics":["Transformers & self-attention (theory)","HuggingFace — fine-tune BERT/DistilBERT","GPT-style generation basics","Training tricks — LR scheduling, dropout","GPU usage — CUDA, mixed precision"]}]',
 '[{"label":"Week 13","goals":["Backpropagation from scratch (numpy)","PyTorch basics: tensors, autograd, .backward()","Build a 2-layer NN on MNIST"]},{"label":"Week 14","goals":["CNN from scratch on CIFAR-10","BatchNorm, Dropout, weight initialization","fast.ai Lesson 1 & 2"]},{"label":"Week 15","goals":["Transfer learning: fine-tune ResNet18 on custom dataset","Data augmentation pipeline","fast.ai Lesson 3 & 4"]},{"label":"Week 16","goals":["LSTM: sentiment analysis on IMDB dataset","Sequence-to-sequence basics","Vanishing gradient & solutions"]},{"label":"Week 17","goals":["Transformers: implement scaled dot-product attention","HuggingFace: load & fine-tune DistilBERT","Text classification with BERT"]},{"label":"Week 18","goals":["Mixed precision training with torch.cuda.amp","Learning rate scheduling (cosine, OneCycle)","Model checkpointing & early stopping"]},{"label":"Weeks 19–20","goals":["End-to-end DL project: choose domain (NLP/CV/tabular)","Write clean README with results & plots","Push to GitHub — this is a portfolio piece"]}]',
 '[{"title":"PyTorch Exercises","problems":["Implement a 3-layer MLP from scratch (no nn.Sequential) with manual weight updates","Build a custom Dataset and DataLoader for a CSV file","Implement a CNN that achieves >90% on MNIST using only conv + pool + linear layers","Fine-tune a pretrained ResNet18 on a 5-class image dataset of your choice","Build a character-level language model with LSTM (generate text after training)"]},{"title":"HuggingFace & Transformers","problems":["Fine-tune DistilBERT on SST-2 sentiment dataset using Trainer API","Use a pipeline() for zero-shot classification on 5 custom categories","Load a tokenizer, tokenize a batch, inspect token IDs and attention masks","Use a generation model (GPT-2) to complete 5 different prompts","Evaluate a fine-tuned model using F1, precision, recall with datasets library"]}]'),
(5, 4, 'MLOps + System Design', 'Weeks 17–22', '#854F0B', 'rgba(133,79,11,0.13)', '#d4924a',
 'Deploy 1 model as REST API',
 '[{"label":"Made With ML","url":"https://madewithml.com"},{"label":"Chip Huyen MLSys","url":"https://huyenchip.com/ml-interviews-book/"},{"label":"FastAPI docs","url":"https://fastapi.tiangolo.com"},{"label":"Docker docs","url":"https://docs.docker.com"}]',
 '[{"label":"MLOps Essentials","topics":["MLflow — experiment tracking","Docker basics — containerize model","FastAPI — build & deploy model API","CI/CD with GitHub Actions","Cloud basics — AWS SageMaker or GCP Vertex"]},{"label":"ML System Design","topics":["Recommendation systems design","Search ranking architecture","Feature stores & data pipelines","A/B testing & model monitoring","Scaling inference — batching, caching","Design interview framework (case study)"]}]',
 '[{"label":"Week 17","goals":["MLflow: log experiments, metrics, artifacts for a sklearn model","Understand run comparison and model registry"]},{"label":"Week 18","goals":["Docker: write Dockerfile, build image, run container","Containerize a trained model + inference script"]},{"label":"Week 19","goals":["FastAPI: build /predict endpoint for a model","Add input validation with Pydantic","Test with Postman or curl"]},{"label":"Week 20","goals":["GitHub Actions: CI pipeline that runs tests on push","Deploy Dockerized FastAPI to Render or Railway (free tier)"]},{"label":"Week 21","goals":["ML System Design: study recommendation system design","Read Chip Huyen Chapter 1–3","Practice: design a YouTube recommendation system (whiteboard)"]},{"label":"Week 22","goals":["A/B testing: how to compare model A vs B in production","Feature store concept: what, why, how (Feast intro)","Mock ML system design interview (45 min)"]}]',
 '[{"title":"MLOps Hands-On","problems":["Train a classifier, log all params/metrics to MLflow, compare 3 runs","Write a Dockerfile for a FastAPI app that loads a .pkl model and serves /predict","Build a GitHub Actions workflow: lint → test → build Docker image on PR","Create a FastAPI app with /health, /predict, and /metrics endpoints","Deploy a model API to a free cloud service and share the live URL"]},{"title":"System Design Scenarios","problems":["Design a real-time fraud detection system (latency < 50ms)","Design Netflix movie recommendations for 100M users","Design a document search engine with semantic similarity","Design a model monitoring system that detects data drift","Design the ML pipeline for Googles ad click-through rate prediction"]}]'),
(6, 5, 'Portfolio + Interviews', 'Weeks 20–26', '#993556', 'rgba(153,53,86,0.13)', '#e07fa0',
 '3 portfolio projects · Resume + LinkedIn optimized',
 '[{"label":"GitHub","url":"https://github.com"},{"label":"Interview Kickstart","url":"https://www.interviewkickstart.com"},{"label":"Pramp","url":"https://www.pramp.com"},{"label":"Glassdoor","url":"https://www.glassdoor.com"}]',
 '[{"label":"Portfolio Projects","topics":["Project 1: ML end-to-end (Kaggle dataset + deployed API)","Project 2: NLP — text classification or QA system","Project 3: ML system design + FastAPI deployment","GitHub README quality — metrics, demo GIFs, architecture diagram","Kaggle competition participation (top 30%)"]},{"label":"Interview Prep","topics":["ML breadth — top 50 theory Q&A mastered","ML system design case study (1hr mock)","Coding rounds — LC Medium in 30 min","Behavioral — STAR format, impact stories","Resume tailoring for Google/Microsoft/Amazon","Mock interviews on Pramp or peer pairing"]}]',
 '[{"label":"Week 20","goals":["Choose 3 portfolio project topics","Start Project 1: EDA + baseline model","Draft resume v1 — quantify all impact"]},{"label":"Week 21","goals":["Project 1: deploy API, write README","ML theory Q&A: revise 20 core questions","LinkedIn: optimize headline, about, skills"]},{"label":"Week 22","goals":["Start Project 2: NLP project","ML system design: 2 practice designs per week","Apply to 5 target companies"]},{"label":"Week 23","goals":["Project 2: complete + push to GitHub","50 ML Q&A done","Pramp mock: coding + behavioral"]},{"label":"Week 24","goals":["Start & finish Project 3: MLOps + deployment","ML system design mock interview (full 45 min)","Resume v2 with project links"]},{"label":"Week 25","goals":["Apply to 10+ companies","LC contest participation (weekly)","Full mock loop: coding + ML design + behavioral"]},{"label":"Week 26","goals":["Final review: all 3 projects polished","Top 50 ML Q&A: verbal recall test","Target: first interview scheduled"]}]',
 '[{"title":"ML Interview Q&A","problems":["Explain bias-variance tradeoff with a concrete example","How does XGBoost differ from Random Forest? When do you prefer each?","Walk through how you would handle a severely imbalanced dataset (1:100 ratio)","What is the vanishing gradient problem and how do ResNets solve it?","How would you detect and handle data drift in a production model?"]},{"title":"Behavioral (STAR format)","problems":["Tell me about a time you owned a project end-to-end with ambiguous requirements","Describe a situation where your analysis/model was wrong — what did you do?","How have you explained a complex technical concept to a non-technical stakeholder?","Give an example of a time you disagreed with a team decision — what happened?","What is the most impactful thing you have built? Walk me through the outcome."]}]')
ON CONFLICT (id) DO NOTHING;

SELECT setval('learning_phases_id_seq', 10);
