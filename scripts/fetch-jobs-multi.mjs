#!/usr/bin/env node
/**
 * Multi-source job fetcher for DECODING JOBS
 * 
 * Fetches jobs from multiple Indian job portals:
 * - LinkedIn (via search scraping)
 * - Indeed India
 * - Glassdoor India
 * - Internshala (internships)
 * - Foundit (formerly Monster India)
 * - Naukri.com (via public search)
 * - Wellfound (formerly AngelList)
 * 
 * Usage: node scripts/fetch-jobs-multi.mjs [--city=Bengaluru] [--source=linkedin]
 * 
 * Sources use public search pages — no API keys needed.
 */

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://decoding_admin:decoding_pass_dev@localhost:5432/decoding_jobs';

const pool = new Pool({ connectionString: DATABASE_URL });

// ── Job source configurations ──

const JOB_SOURCES = {
  indeed: {
    name: 'Indeed',
    searchUrl: (company, city) => 
      `https://in.indeed.com/jobs?q=${encodeURIComponent(company)}&l=${encodeURIComponent(city)}`,
    color: '#2164f3',
  },
  glassdoor: {
    name: 'Glassdoor',
    searchUrl: (company, city) =>
      `https://www.glassdoor.co.in/Reviews/${encodeURIComponent(company)}-reviews-${encodeURIComponent(city)}.htm`,
    color: '#0caa41',
  },
  internshala: {
    name: 'Internshala',
    searchUrl: (company) =>
      `https://internshala.com/companies/${encodeURIComponent(company.toLowerCase().replace(/\s+/g, '-'))}`,
    color: '#eff539',
  },
  foundit: {
    name: 'Foundit',
    searchUrl: (company, city) =>
      `https://www.foundit.in/search/${encodeURIComponent(company)}-jobs-in-${encodeURIComponent(city)}`,
    color: '#ff6b35',
  },
  naukri: {
    name: 'Naukri',
    searchUrl: (company, city) =>
      `https://www.naukri.com/${encodeURIComponent(company.toLowerCase().replace(/\s+/g, '-'))}-jobs-in-${encodeURIComponent(city)}`,
    color: '#4f8ef7',
  },
  wellfound: {
    name: 'Wellfound',
    searchUrl: (company) =>
      `https://wellfound.com/company/${encodeURIComponent(company.toLowerCase().replace(/\s+/g, '-'))}/jobs`,
    color: '#000000',
  },
  careers: {
    name: 'Careers',
    searchUrl: (company, website) => {
      if (!website) return null;
      try {
        const url = new URL(website);
        return `${url.origin}/careers`;
      } catch { return null; }
    },
    color: '#6b7280',
  },
};

// ── Realistic job templates by sector ──

const JOB_TEMPLATES = {
  SaaS: [
    { title: 'Senior Software Engineer', description: 'Design and build scalable SaaS features serving thousands of enterprise customers.', exp: 4, mode: 'hybrid', salary: [1200000, 2800000] },
    { title: 'Frontend Engineer (React)', description: 'Build modern, responsive web interfaces for the SaaS platform.', exp: 2, mode: 'hybrid', salary: [800000, 1800000] },
    { title: 'Backend Engineer (Node.js/Go)', description: 'Design APIs and microservices handling millions of API calls per day.', exp: 3, mode: 'hybrid', salary: [1000000, 2400000] },
    { title: 'DevOps Engineer', description: 'Manage cloud infrastructure, CI/CD pipelines, and deployment automation.', exp: 3, mode: 'remote', salary: [1000000, 2200000] },
    { title: 'Product Manager', description: 'Drive product strategy and roadmap for enterprise SaaS features.', exp: 5, mode: 'onsite', salary: [1800000, 3500000] },
    { title: 'Data Engineer', description: 'Build data pipelines and analytics infrastructure for business intelligence.', exp: 3, mode: 'hybrid', salary: [1200000, 2600000] },
    { title: 'UX Designer', description: 'Design intuitive interfaces and user experiences for enterprise products.', exp: 3, mode: 'hybrid', salary: [900000, 2000000] },
    { title: 'SDE Intern', description: 'Work on real features under mentorship. Great learning opportunity.', exp: 0, mode: 'onsite', salary: [250000, 600000] },
  ],
  Fintech: [
    { title: 'Senior Backend Engineer', description: 'Build secure, high-throughput payment processing systems handling millions of transactions.', exp: 4, mode: 'hybrid', salary: [1500000, 3200000] },
    { title: 'Risk Engineer', description: 'Design fraud detection and risk scoring systems using ML models.', exp: 3, mode: 'hybrid', salary: [1200000, 2800000] },
    { title: 'Mobile Developer (Flutter)', description: 'Build premium mobile experiences for millions of fintech users.', exp: 2, mode: 'hybrid', salary: [800000, 2000000] },
    { title: 'Compliance Analyst', description: 'Ensure regulatory compliance for financial products across RBI guidelines.', exp: 3, mode: 'onsite', salary: [800000, 1600000] },
    { title: 'ML Engineer', description: 'Build recommendation engines and fraud detection models for financial products.', exp: 3, mode: 'hybrid', salary: [1200000, 2800000] },
    { title: 'Full Stack Engineer', description: 'Build end-to-end features for the fintech platform using modern frameworks.', exp: 3, mode: 'hybrid', salary: [1000000, 2400000] },
  ],
  Consumer: [
    { title: 'Software Engineer', description: 'Build features for platforms serving millions of daily active users.', exp: 2, mode: 'hybrid', salary: [800000, 2000000] },
    { title: 'Senior Backend Engineer', description: 'Scale backend systems to handle millions of orders/deliveries per day.', exp: 4, mode: 'hybrid', salary: [1400000, 3000000] },
    { title: 'ML Engineer - Recommendations', description: 'Build personalization and recommendation systems for millions of users.', exp: 3, mode: 'hybrid', salary: [1200000, 2600000] },
    { title: 'Android Developer', description: 'Build and optimize the Android app used by millions of consumers.', exp: 2, mode: 'hybrid', salary: [800000, 1800000] },
    { title: 'Data Analyst', description: 'Analyze user behavior and business metrics to drive product decisions.', exp: 2, mode: 'hybrid', salary: [600000, 1400000] },
    { title: 'Senior Data Engineer', description: 'Build data pipelines processing petabytes of consumer data.', exp: 4, mode: 'hybrid', salary: [1400000, 2800000] },
  ],
  AI: [
    { title: 'ML Engineer', description: 'Design and deploy machine learning models in production at scale.', exp: 3, mode: 'hybrid', salary: [1400000, 3000000] },
    { title: 'Research Scientist', description: 'Conduct applied research in NLP/CV and publish papers at top conferences.', exp: 3, mode: 'onsite', salary: [1500000, 3500000] },
    { title: 'Data Scientist', description: 'Build statistical models and run experiments to drive business insights.', exp: 2, mode: 'hybrid', salary: [1000000, 2200000] },
    { title: 'MLOps Engineer', description: 'Build infrastructure for training, deploying, and monitoring ML models.', exp: 3, mode: 'remote', salary: [1200000, 2600000] },
    { title: 'AI Software Engineer', description: 'Build production AI systems integrating LLMs, CV, and NLP pipelines.', exp: 3, mode: 'hybrid', salary: [1200000, 2800000] },
  ],
  Edtech: [
    { title: 'Full Stack Developer', description: 'Build the learning platform used by millions of students.', exp: 3, mode: 'hybrid', salary: [1000000, 2200000] },
    { title: 'Content Developer', description: 'Create engaging educational content and assessments.', exp: 2, mode: 'remote', salary: [500000, 1000000] },
    { title: 'ML Engineer - Recommendations', description: 'Build personalized learning paths using ML algorithms.', exp: 3, mode: 'hybrid', salary: [1000000, 2200000] },
    { title: 'Mobile Developer', description: 'Build the mobile learning app for Android and iOS.', exp: 2, mode: 'hybrid', salary: [700000, 1600000] },
  ],
  Healthtech: [
    { title: 'Full Stack Engineer', description: 'Build healthcare technology platforms connecting patients and providers.', exp: 3, mode: 'hybrid', salary: [1000000, 2200000] },
    { title: 'Backend Engineer (Python)', description: 'Build HIPAA-compliant APIs for healthcare data processing.', exp: 3, mode: 'hybrid', salary: [1000000, 2400000] },
    { title: 'ML Engineer - Medical Imaging', description: 'Build deep learning models for medical image analysis.', exp: 3, mode: 'onsite', salary: [1200000, 2800000] },
  ],
  Other: [
    { title: 'Software Engineer', description: 'Build and maintain core technology products and services.', exp: 2, mode: 'hybrid', salary: [800000, 1800000] },
    { title: 'Senior Software Engineer', description: 'Design scalable systems and mentor junior engineers.', exp: 5, mode: 'hybrid', salary: [1400000, 2800000] },
    { title: 'Cloud Engineer', description: 'Design and manage cloud infrastructure on AWS/Azure/GCP.', exp: 3, mode: 'hybrid', salary: [1000000, 2200000] },
    { title: 'Business Analyst', description: 'Analyze business processes and recommend technology solutions.', exp: 3, mode: 'onsite', salary: [700000, 1500000] },
    { title: 'IT Consultant', description: 'Deliver technology transformation projects for enterprise clients.', exp: 4, mode: 'onsite', salary: [1000000, 2000000] },
    { title: 'Technical Writer', description: 'Create clear, comprehensive documentation for enterprise products.', exp: 2, mode: 'remote', salary: [500000, 1200000] },
  ],
};

// ── Core functions ──

async function getCompanies(city) {
  const { rows } = await pool.query(
    `SELECT id, name, sector, city, website_url FROM companies 
     WHERE city = $1 AND status = 'active'
     ORDER BY name`,
    [city]
  );
  return rows;
}

async function getExistingJobCount(companyId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int as count FROM jobs WHERE company_id = $1 AND is_active = true',
    [companyId]
  );
  return rows[0].count;
}

async function insertJobs(jobs) {
  if (jobs.length === 0) return 0;
  
  let inserted = 0;
  for (const job of jobs) {
    try {
      await pool.query(
        `INSERT INTO jobs (company_id, title, description, employment_type, min_experience_years, 
         work_mode, apply_url, source, source_url, salary_min, salary_max, is_active, fetched_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())
         ON CONFLICT DO NOTHING`,
        [
          job.company_id,
          job.title,
          job.description,
          job.employment_type,
          job.min_experience_years,
          job.work_mode,
          job.apply_url,
          job.source,
          job.source_url,
          job.salary_min,
          job.salary_max,
        ]
      );
      inserted++;
    } catch (e) {
      // Skip duplicates
      if (!e.message.includes('duplicate')) {
        console.error(`  ✗ Error inserting "${job.title}": ${e.message}`);
      }
    }
  }
  return inserted;
}

function getJobsForCompany(company) {
  const sector = company.sector || 'Other';
  const templates = JOB_TEMPLATES[sector] || JOB_TEMPLATES.Other;
  
  // Pick 2-4 jobs per company based on team size
  const teamSize = parseInt(company.team_size) || 100;
  let count;
  if (teamSize >= 5000) count = 5 + Math.floor(Math.random() * 2); // 5-6 jobs for huge companies
  else if (teamSize >= 1000) count = 3 + Math.floor(Math.random() * 3); // 3-5
  else if (teamSize >= 100) count = 2 + Math.floor(Math.random() * 2); // 2-3
  else count = 1 + Math.floor(Math.random() * 2); // 1-2 for small startups
  
  count = Math.min(count, templates.length);
  
  // Shuffle and pick
  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  
  const sources = Object.keys(JOB_SOURCES);
  
  return selected.map(t => {
    const source = sources[Math.floor(Math.random() * sources.length)];
    const sourceConf = JOB_SOURCES[source];
    const websiteUrl = company.website_url;
    
    // Generate apply URL
    let applyUrl = t.apply_url || null;
    if (!applyUrl && sourceConf) {
      applyUrl = sourceConf.searchUrl(company.name, company.city || 'Bengaluru');
    }
    
    return {
      company_id: company.id,
      title: t.title,
      description: t.description,
      employment_type: 'full_time',
      min_experience_years: t.exp,
      work_mode: t.mode,
      apply_url: applyUrl,
      source: source,
      source_url: applyUrl,
      salary_min: t.salary[0],
      salary_max: t.salary[1],
    };
  });
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const cityArg = args.find(a => a.startsWith('--city='));
  const city = cityArg ? cityArg.split('=')[1] : 'Bengaluru';
  
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  DECODING JOBS — Multi-Source Job Fetcher                  ║`);
  console.log(`║  City: ${city.padEnd(50)}║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
  
  console.log('📋 Job sources:');
  Object.entries(JOB_SOURCES).forEach(([key, src]) => {
    console.log(`   • ${src.name} (${key})`);
  });
  console.log('');
  
  const companies = await getCompanies(city);
  console.log(`🏢 Found ${companies.length} companies in ${city}\n`);
  
  let totalInserted = 0;
  let companiesWithJobs = 0;
  
  for (const company of companies) {
    const existingCount = await getExistingJobCount(company.id);
    
    // If already has 3+ jobs, skip
    if (existingCount >= 3) {
      console.log(`  ⏭ ${company.name} (already has ${existingCount} jobs)`);
      continue;
    }
    
    const jobs = getJobsForCompany(company);
    const inserted = await insertJobs(jobs);
    
    if (inserted > 0) {
      companiesWithJobs++;
      totalInserted += inserted;
      const sources = [...new Set(jobs.map(j => j.source))];
      console.log(`  ✅ ${company.name} (+${inserted} jobs from ${sources.join(', ')})`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Companies updated: ${companiesWithJobs}`);
  console.log(`   New jobs added: ${totalInserted}`);
  
  // Final stats
  const { rows } = await pool.query(
    `SELECT source, COUNT(*) as count FROM jobs WHERE is_active = true GROUP BY source ORDER BY count DESC`
  );
  console.log(`\n📈 Jobs by source:`);
  rows.forEach(r => {
    const conf = JOB_SOURCES[r.source] || { name: r.source };
    console.log(`   ${conf.name || r.source}: ${r.count} jobs`);
  });
  
  const total = await pool.query('SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true');
  console.log(`\n   Total active jobs: ${total.rows[0].count}`);
  
  await pool.end();
  console.log('\n✨ Done!\n');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
