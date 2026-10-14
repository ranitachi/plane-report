// ============================================================
// debug.js - Cek raw data dari API, tanpa filter apapun
// Jalankan: node debug.js
// ============================================================

const axios = require('axios');
const config = require('./config');

const api = axios.create({
  baseURL: config.plane.baseUrl,
  headers: { 'X-API-Key': config.plane.apiKey },
  timeout: 30000,
});

const ASSIGNEE_ID = config.plane.assigneeId;
const BULAN = 1;
const TAHUN = 2026;

async function main() {
  console.log('=== DEBUG MODE ===');
  console.log(`Assignee: ${ASSIGNEE_ID}`);
  console.log(`Target  : Bulan ${BULAN}/${TAHUN}\n`);

  // 1. Ambil semua project
  const projRes = await api.get(`/api/v1/workspaces/${config.plane.workspaceSlug}/projects/`);
  const projects = Array.isArray(projRes.data) ? projRes.data : (projRes.data.results || []);
  console.log(`Total projects: ${projects.length}`);

  // 2. Per project, ambil issues dengan query param assignees langsung dari API
  for (const project of projects) {
    // Ambil page 1 saja dulu, lihat struktur response
    const res = await api.get(
      `/api/v1/workspaces/${config.plane.workspaceSlug}/projects/${project.id}/issues/`,
      { params: { per_page: 100, page: 1 } }
    );
    const data = res.data;
    const results = Array.isArray(data) ? data : (data.results || []);

    // Filter yang punya assignee kita
    const mine = results.filter(i => (i.assignees || []).includes(ASSIGNEE_ID));
    if (mine.length === 0) continue;

    console.log(`\n📁 [${project.name}] — ${results.length} issues di page 1, ${mine.length} milik assignee`);
    console.log(`   next_page_results: ${data.next_page_results}`);
    console.log(`   next_cursor      : ${data.next_cursor}`);
    console.log(`   total_count      : ${data.total_count}`);

    for (const issue of mine) {
      const compDate = issue.completed_at ? issue.completed_at.substring(0, 10) : 'null';
      console.log(`   - completed:${compDate} | ${issue.name?.substring(0, 60)}`);
    }
  }
}

main().catch(err => {
  console.error('Error:', err.response?.data || err.message);
});