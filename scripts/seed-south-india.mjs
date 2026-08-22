import pg from "pg";
import { readFileSync } from "fs";
const pool = new pg.Pool({host:"localhost",port:5432,database:"decoding_jobs",user:"decoding_admin",password:"decoding_jobs_2024"});
const companies = JSON.parse(readFileSync("/tmp/south-india-companies.json","utf8"));
async function main() {
  const client = await pool.connect();
  try {
    const existing = await client.query("SELECT name FROM companies");
    const eNames = new Set(existing.rows.map(r=>r.name));
    let ins=0,skip=0;
    for(const c of companies){
      if(eNames.has(c.name)){skip++;continue;}
      await client.query(,[c.name,c.desc,c.addr,c.lo,c.lat,c.sector,c.area,c.city,c.founded,c.team,c.funding,c.status,c.web,c.type,c.stage]);
      ins++;
    }
    const counts = await client.query("SELECT city,COUNT(*) as cnt FROM companies GROUP BY city ORDER BY cnt DESC");
    console.log("Inserted:",ins,"Skipped:",skip);
    counts.rows.forEach(r=>console.log(" ",r.city+":",r.cnt));
    const total = await client.query("SELECT COUNT(*) as t FROM companies");
    console.log("Total:",total.rows[0].t);
  } finally {client.release();await pool.end();}
}
main().catch(e=>{console.error(e);process.exit(1)});