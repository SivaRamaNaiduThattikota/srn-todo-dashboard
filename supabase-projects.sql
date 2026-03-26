-- ============================================================
-- Projects table — ML portfolio tracking
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  category    TEXT DEFAULT 'general',
  tech        TEXT[] DEFAULT '{}',
  status      TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in-progress', 'completed', 'deployed')),
  progress    INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  github_url  TEXT DEFAULT '',
  live_url    TEXT DEFAULT '',
  highlights  TEXT[] DEFAULT '{}',
  start_date  DATE DEFAULT NULL,
  end_date    DATE DEFAULT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Allow all on projects') THEN
    CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Auto update timestamp
CREATE OR REPLACE FUNCTION update_projects_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_projects_timestamp();

-- Seed the 6 ML projects
INSERT INTO projects (title, description, category, tech, status, progress, highlights, sort_order) VALUES
  ('Healthcare Disease Prediction', 'ML pipeline for predicting diseases from patient symptoms. Classification models with explainability.', 'Healthcare ML', ARRAY['Python','Scikit-learn','XGBoost','SHAP','FastAPI','Docker'], 'planning', 0, ARRAY['Multi-class classification','Feature engineering','SHAP explainability','REST API deployment'], 0),
  ('Sentiment Analysis Engine', 'NLP model for analyzing product reviews and social media sentiment. Fine-tuned transformer.', 'NLP', ARRAY['Python','HuggingFace','PyTorch','NLTK','Streamlit'], 'planning', 0, ARRAY['Text preprocessing pipeline','Fine-tuned BERT','Multi-language support','Streamlit demo'], 1),
  ('Image Classification System', 'CNN-based image classifier with transfer learning. Custom dataset, augmentation, training, deployment.', 'Computer Vision', ARRAY['Python','PyTorch','torchvision','OpenCV','Gradio'], 'planning', 0, ARRAY['Transfer learning','Data augmentation','Grad-CAM visualizations','Gradio web demo'], 2),
  ('Movie Recommendation System', 'Collaborative + content-based hybrid recommender. Matrix factorization and neural collaborative filtering.', 'RecSys', ARRAY['Python','Surprise','TensorFlow','Pandas','FastAPI'], 'planning', 0, ARRAY['Collaborative filtering','Content-based TF-IDF','Hybrid ensemble','Cold start handling'], 3),
  ('Stock Price Forecasting', 'Time series prediction using LSTM, Prophet, and statistical models with backtesting framework.', 'Time Series', ARRAY['Python','TensorFlow','Prophet','statsmodels','Plotly'], 'planning', 0, ARRAY['ARIMA vs LSTM comparison','Technical indicators','Backtesting framework','Interactive dashboard'], 4),
  ('End-to-End MLOps Pipeline', 'Production ML pipeline with experiment tracking, model registry, CI/CD, monitoring, drift detection.', 'MLOps', ARRAY['Python','MLflow','DVC','Docker','GitHub Actions','AWS'], 'planning', 0, ARRAY['MLflow tracking','DVC versioning','CI/CD pipeline','Drift detection'], 5)
ON CONFLICT DO NOTHING;
