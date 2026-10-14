const axios = require('axios');
const config = require('./config');

const api = axios.create({
  baseURL: config.plane.baseUrl,
  headers: { 'X-API-Key': config.plane.apiKey },
  timeout: 30000,
});

async function getAllProjects() {
  try {
    const res = await api.get(`/api/v1/workspaces/${config.plane.workspaceSlug}/projects/`);
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data.results) return data.results;
    return [];
  } catch (err) { console.error('Error projects:', err.message); return []; }
}

/**
 * Ambil issues dari satu project.
 * Plane self-hosted TIDAK support pagination ?page=N dengan benar
 * (selalu return page yang sama → duplikat).
 * Solusi: gunakan per_page besar + deduplikasi by issue.id.
 */
async function getIssuesByProject(projectId) {
  const seenIds = new Set();
  const issues  = [];

  try {
    // Ambil dengan limit besar sekaligus (Plane biasanya max 100 per request)
    const res = await api.get(
      `/api/v1/workspaces/${config.plane.workspaceSlug}/projects/${projectId}/issues/`,
      { params: { per_page: 100 } }   // TANPA page param — hindari pagination loop
    );
    const data    = res.data;
    const results = Array.isArray(data) ? data : (data.results || []);

    for (const issue of results) {
      if (!seenIds.has(issue.id)) {
        seenIds.add(issue.id);
        issues.push(issue);
      }
    }
  } catch { /* skip project jika error */ }

  return issues;
}

async function getStatesByProject(projectId) {
  try {
    const res = await api.get(
      `/api/v1/workspaces/${config.plane.workspaceSlug}/projects/${projectId}/states/`
    );
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data.results) return data.results;
    return [];
  } catch { return []; }
}

function isDone(issue) {
  // completed_at terisi = pasti selesai, apapun state-nya
  return !!issue.completed_at;
}

async function getAllIssuesForAssignee(assigneeId, bulan, tahun) {
  console.log(`\n📡 Mengambil data dari Plane API...`);
  console.log(`   Assignee : ${assigneeId}`);
  console.log(`   Periode  : ${bulan}/${tahun}\n`);

  const projects = await getAllProjects();
  console.log(`   Projects : ${projects.length} ditemukan\n`);

  const allIssues  = [];
  const globalSeen = new Set(); // dedup lintas project

  for (const project of projects) {
    const issues = await getIssuesByProject(project.id);
    const states = await getStatesByProject(project.id);

    const stateMap = {};
    for (const s of states) if (s?.id) stateMap[s.id] = s;

    // Filter 1: assignee exact match
    const mine = issues.filter(i =>
      (i.assignees || []).includes(assigneeId)
    );

    if (mine.length === 0) continue;

    // Filter 2: done (completed_at ada) + bulan/tahun completed_at + belum masuk global
    const filtered = mine.filter(issue => {
      if (globalSeen.has(issue.id)) return false;
      if (!isDone(issue)) return false;

      const d = new Date(issue.completed_at);
      return (
        d.getMonth() + 1 === parseInt(bulan) &&
        d.getFullYear() === parseInt(tahun)
      );
    });

    console.log(`   📁 [${project.name}]`);
    console.log(`      Issues     : ${issues.length}`);
    console.log(`      Assignee   : ${mine.length}`);
    console.log(`      Lolos      : ${filtered.length}`);

    for (const issue of filtered) {
      globalSeen.add(issue.id);
      const stateName = (stateMap[issue.state] || {}).name || 'Done';
      console.log(`      ✅ [${issue.completed_at?.substring(0,10)}] ${issue.name?.substring(0,65)}`);
      allIssues.push({
        ...issue,
        projectName: project.name,
        projectId:   project.id,
        stateName,
      });
    }
    console.log('');
  }

  console.log(`✅ Total issues untuk laporan: ${allIssues.length}\n`);
  return allIssues;
}

module.exports = { getAllIssuesForAssignee };