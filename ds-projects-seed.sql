-- ============================================================
--  SRN Command Center — DS/ML Portfolio Projects Seed v2
--  11 projects mapped to correct categories
--  Sections: Foundation ML | NLP & Deep Learning | MLOps & Systems
--  Run once in Supabase SQL editor
-- ============================================================

INSERT INTO projects (title, description, category, tech, status, progress, highlights, sort_order)
VALUES

-- ── FOUNDATION ML ─────────────────────────────────────────
(
  'End-to-End Churn Prediction',
  'Full ML pipeline on Telco Customer Churn dataset. EDA → feature engineering → XGBoost → SHAP explanations. Handles class imbalance with SMOTE + threshold tuning. Deployed as FastAPI endpoint with Docker.',
  'Classical ML',
  ARRAY['Python','XGBoost','SHAP','SMOTE','FastAPI','Docker','scikit-learn','Pandas'],
  'planning', 0,
  ARRAY[
    'EDA with feature analysis and correlation heatmaps',
    'Baseline Logistic Regression vs XGBoost comparison',
    'SMOTE + class weight experiments documented',
    'SHAP waterfall plots for 3 sample predictions',
    'FastAPI /predict endpoint + Dockerfile',
    'ROC-AUC > 0.88 on test set'
  ],
  1
),
(
  'From-Scratch ML Implementations',
  'Implement Linear Regression, Logistic Regression, k-NN, k-Means, and Decision Tree from scratch using only NumPy. Validate against sklearn. Mathematical derivations in README.',
  'Classical ML',
  ARRAY['Python','NumPy','scikit-learn','Matplotlib','Jupyter'],
  'planning', 0,
  ARRAY[
    'Linear Regression: gradient descent + OLS derivation',
    'Logistic Regression: sigmoid + log-loss + L2 regularisation',
    'k-NN: Euclidean + cosine distance, k selection',
    'k-Means: elbow method, silhouette score comparison',
    'Decision Tree: Gini impurity + information gain splits',
    'Side-by-side benchmark vs sklearn on 3 datasets'
  ],
  2
),
(
  'A/B Test Simulator & Analyser',
  'Python tool that simulates A/B tests with configurable parameters. Sample size calculator, sequential testing, Bonferroni/FDR correction. Includes Bayesian A/B with Beta-Binomial model.',
  'Statistics',
  ARRAY['Python','SciPy','Plotly','Streamlit','NumPy','statsmodels'],
  'planning', 0,
  ARRAY[
    'Sample size calculator (MDE, alpha, power inputs)',
    'Simulate p-value distribution under H₀ and H₁',
    'Bonferroni / FDR correction for multiple variants',
    'Bayesian Beta-Binomial posterior update visualisation',
    'Power curve interactive chart',
    'Streamlit UI deployable on Streamlit Cloud'
  ],
  3
),
(
  'Product Analytics Dashboard — SQL',
  'Full analytics stack on Airbnb or NYC Taxi public dataset. DuckDB schema with cohort retention, funnel analysis, DAU/WAU/MAU trends. Streamlit dashboard with business recommendations.',
  'Data Engineering',
  ARRAY['SQL','DuckDB','Python','Streamlit','Pandas','Plotly','dbt'],
  'planning', 0,
  ARRAY[
    'Star schema design with fact + dimension tables',
    'Cohort retention matrix (D1/D7/D30)',
    'Funnel analysis: signup → activation → retention',
    'Window function: MoM growth, 7-day rolling average',
    'Streamlit dashboard with filters by date/region',
    '2-page business recommendations write-up'
  ],
  4
),
(
  'Causal Inference on Real Data',
  'Apply causal inference methods on LaLonde job training dataset. Compare OLS, Propensity Score Matching, Difference-in-Differences. Sensitivity analysis and overlap plots.',
  'Statistics',
  ARRAY['Python','statsmodels','DoWhy','Pandas','Matplotlib','scikit-learn'],
  'planning', 0,
  ARRAY[
    'OLS baseline with confounder analysis',
    'Propensity Score Matching with common support check',
    'DiD estimation with parallel trends test',
    'Sensitivity analysis (Rosenbaum bounds)',
    'Overlap/balance plots before and after matching',
    'Compare ATE estimates across methods'
  ],
  5
),

-- ── NLP & DEEP LEARNING ───────────────────────────────────
(
  'NLP Sentiment Classifier',
  'Compare classical vs deep learning on IMDB/Twitter sentiment. TF-IDF + Logistic Regression baseline → fine-tuned DistilBERT. Speed vs accuracy tradeoff analysis.',
  'NLP',
  ARRAY['Python','HuggingFace','PyTorch','scikit-learn','Transformers','Pandas','NLTK'],
  'planning', 0,
  ARRAY[
    'Text cleaning pipeline (tokenisation, stopwords, lemmatisation)',
    'TF-IDF + Logistic Regression baseline (F1 > 0.88)',
    'Fine-tune DistilBERT on same dataset',
    'Confusion matrix + error analysis on misclassified samples',
    'Inference latency comparison: classical vs transformer',
    'Gradio demo UI'
  ],
  6
),
(
  'RAG-Based AI Knowledge Assistant',
  'Full RAG pipeline using LangChain + ChromaDB. Ingest custom documents, chunk, embed, store, query with semantic search + reranking. Streamlit frontend.',
  'LLMs & GenAI',
  ARRAY['Python','LangChain','ChromaDB','OpenAI API','Streamlit','FastAPI','HuggingFace'],
  'planning', 0,
  ARRAY[
    'Document ingestion pipeline (PDF/TXT → chunks → embeddings)',
    'ChromaDB vector store with cosine similarity search',
    'Reranking with cross-encoder for top-k results',
    'Conversational memory with LangChain ConversationChain',
    'RAGAS evaluation (faithfulness, answer relevancy)',
    'Streamlit chat UI with source citation'
  ],
  7
),
(
  'Image Classifier — CNN from Scratch',
  'Build a CNN image classifier on CIFAR-10. Implement forward pass + backprop manually in NumPy first, then reproduce in PyTorch. Transfer learning with ResNet-18.',
  'Computer Vision',
  ARRAY['Python','PyTorch','NumPy','torchvision','Matplotlib','scikit-learn'],
  'planning', 0,
  ARRAY[
    'Manual CNN forward + backward pass in NumPy (educational)',
    'PyTorch CNN: 3 conv layers + BatchNorm + Dropout',
    'Data augmentation: flip, crop, colour jitter',
    'Transfer learning: freeze ResNet-18 backbone, fine-tune head',
    'Grad-CAM visualisation of what the model looks at',
    'Accuracy > 85% on CIFAR-10 test set'
  ],
  8
),

-- ── MLOPS & SYSTEMS ───────────────────────────────────────
(
  'Mini Recommendation Engine',
  'Hybrid recommender on MovieLens 100K. Collaborative filtering (SVD) + content-based (item embeddings). Served as FastAPI endpoint with item-to-item and user-to-item recommendations.',
  'RecSys',
  ARRAY['Python','scikit-surprise','FastAPI','Redis','NumPy','Pandas','Docker'],
  'planning', 0,
  ARRAY[
    'User-item matrix factorisation with SVD (scikit-surprise)',
    'Item embeddings via Word2Vec on watch sequences',
    'Hybrid: weighted combination of CF + content scores',
    'FastAPI endpoints: /recommend/user and /recommend/similar',
    'Redis cache for pre-computed top-N recommendations',
    'Offline evaluation: NDCG@10, MAP@10'
  ],
  9
),
(
  'Real-Time ML Data Pipeline',
  'Simulated clickstream → Kafka consumer → feature computation → Redis cache → model serving. Drift detection comparing feature distributions over time.',
  'MLOps',
  ARRAY['Python','Kafka','FastAPI','Redis','Docker','Evidently AI','scikit-learn','Pandas'],
  'planning', 0,
  ARRAY[
    'Kafka producer simulating clickstream/transaction events',
    'Python consumer: compute rolling features in real time',
    'Store features in Redis with TTL',
    'FastAPI model serving endpoint (<200ms p95 latency)',
    'Evidently AI drift report: daily feature distribution check',
    'Docker Compose: all services wired together'
  ],
  10
),
(
  'ML Pipeline with Full MLOps Stack',
  'End-to-end ML pipeline with MLflow experiment tracking, model registry, CI/CD via GitHub Actions, cloud deployment. Monitoring with Evidently.',
  'MLOps',
  ARRAY['Python','MLflow','FastAPI','Docker','GitHub Actions','AWS S3','scikit-learn','Evidently AI'],
  'planning', 0,
  ARRAY[
    'MLflow experiment tracking: params, metrics, artefacts',
    'Model registry: staging → production promotion workflow',
    'FastAPI serving with health check and /metrics endpoint',
    'Dockerfile + docker-compose for local reproducibility',
    'GitHub Actions CI: lint → test → build → push to ECR',
    'Evidently dashboard: weekly data + model drift report'
  ],
  11
);
