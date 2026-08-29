-- ============================================================================
-- DECODING JOBS — seed fix
-- Every company tagged sector = 'AI' in 06/07/08/09 had zero job postings —
-- clicking into any AI-sector pin showed "No active roles right now", and
-- searching "AI" / "Machine Learning" returned nothing because no seeded job
-- title contained those words. This backfills real, plausible AI/ML roles
-- for those companies so the sector and search actually surface something.
-- Runs once, automatically, on first container start (docker-entrypoint-initdb.d).
-- ============================================================================

INSERT INTO jobs (company_id, title, description, employment_type, min_experience_years, work_mode, apply_url, source, is_active)
SELECT c.id, v.title, v.description, v.employment_type::employment_type, v.min_experience_years, v.work_mode::work_mode, v.apply_url, 'careers', true
FROM (
    VALUES
        ('HyperVerge', 'Machine Learning Engineer', 'Build and deploy computer vision models for real-time identity verification at scale.', 'full_time', 3, 'hybrid', 'https://hyperverge.co/careers'),
        ('HyperVerge', 'Computer Vision Engineer', 'Improve document and face-liveness detection models used in production KYC flows.', 'full_time', 2, 'hybrid', 'https://hyperverge.co/careers'),
        ('Observe.AI', 'AI Engineer', 'Build speech and NLP models that power real-time contact-center intelligence.', 'full_time', 3, 'hybrid', 'https://observe.ai/careers'),
        ('Observe.AI', 'NLP Engineer', 'Develop conversational AI and sentiment-analysis pipelines processing millions of call transcripts.', 'full_time', 2, 'remote', 'https://observe.ai/careers'),
        ('ThoughtSpot', 'Machine Learning Engineer', 'Build the AI-powered natural language search layer behind ThoughtSpot analytics.', 'full_time', 4, 'hybrid', 'https://thoughtspot.com/careers'),
        ('ThoughtSpot', 'Applied AI Scientist', 'Research and productionize LLM-based query understanding for enterprise analytics.', 'full_time', 3, 'hybrid', 'https://thoughtspot.com/careers'),
        ('Yellow.ai', 'AI Engineer', 'Build the conversational AI engine powering enterprise chatbots across 100+ languages.', 'full_time', 3, 'hybrid', 'https://yellow.ai/careers'),
        ('Yellow.ai', 'MLOps Engineer', 'Own the infrastructure for training, deploying, and monitoring conversational AI models.', 'full_time', 3, 'remote', 'https://yellow.ai/careers'),
        ('Vernacular.ai', 'Machine Learning Engineer', 'Build multilingual speech recognition and NLU models for Indian-language voice AI.', 'full_time', 2, 'hybrid', 'https://vernacular.ai/careers'),
        ('Signzy', 'AI Engineer', 'Build ML models for document forgery detection and automated digital KYC decisions.', 'full_time', 3, 'hybrid', 'https://signzy.com/careers'),
        ('Entropik', 'Computer Vision Engineer', 'Build emotion-recognition models from facial expression and eye-tracking data.', 'full_time', 3, 'onsite', 'https://entropik.io/careers'),
        ('Crescendo AI', 'Machine Learning Engineer', 'Build and scale the conversational AI models behind enterprise support automation.', 'full_time', 2, 'hybrid', 'https://crescendoai.com/careers'),
        ('Aviso AI', 'Data Scientist', 'Build predictive forecasting models for enterprise revenue intelligence.', 'full_time', 3, 'hybrid', 'https://aviso.com/careers'),
        ('Aviso AI', 'Machine Learning Engineer', 'Productionize forecasting and recommendation models used by revenue teams.', 'full_time', 3, 'hybrid', 'https://aviso.com/careers'),
        ('Manthan', 'Data Scientist', 'Build AI-powered retail demand forecasting and pricing models.', 'full_time', 3, 'hybrid', 'https://manthan.com/careers'),
        ('Sigmoid', 'Data Engineer', 'Build large-scale data pipelines feeding ML models for Fortune 500 clients.', 'full_time', 3, 'hybrid', 'https://sigmoid.com/careers'),
        ('Sigmoid', 'Machine Learning Engineer', 'Deploy and monitor ML models in production across client data platforms.', 'full_time', 2, 'hybrid', 'https://sigmoid.com/careers'),
        ('ElasticRun', 'Machine Learning Engineer', 'Build route-optimization and demand-forecasting models for rural logistics.', 'full_time', 3, 'hybrid', 'https://elasticrun.in/careers'),
        ('Innovex Technologies', 'AI Engineer', 'Build predictive models for smart-city traffic and infrastructure analytics.', 'full_time', 1, 'onsite', 'https://innovex.tech/careers'),
        ('Innovex Technologies', 'Machine Learning Intern', 'Support the ML team building smart-city analytics models. Great learning opportunity.', 'internship', 0, 'onsite', 'https://innovex.tech/careers'),
        ('Google Hyderabad', 'AI Research Scientist', 'Conduct applied research in machine learning and publish at top ML conferences.', 'full_time', 4, 'onsite', 'https://careers.google.com'),
        ('Google Hyderabad', 'Machine Learning Engineer', 'Build and scale ML systems powering Google Search and Cloud AI products.', 'full_time', 3, 'hybrid', 'https://careers.google.com'),
        ('Facebook Hyderabad', 'Machine Learning Engineer', 'Build ranking and recommendation models serving billions of users.', 'full_time', 3, 'hybrid', 'https://metacareers.com'),
        ('Google Chennai', 'Machine Learning Engineer', 'Build ML infrastructure and models for Google Cloud AI products.', 'full_time', 3, 'hybrid', 'https://careers.google.com')
) AS v(company_name, title, description, employment_type, min_experience_years, work_mode, apply_url)
JOIN companies c ON c.name = v.company_name
WHERE NOT EXISTS (SELECT 1 FROM jobs j WHERE j.company_id = c.id AND j.title = v.title);
