#!/usr/bin/env node
// ============================================================
// generate.js - Main script untuk generate laporan PDF
//
// Usage:
//   node generate.js                    -> bulan & tahun saat ini
//   node generate.js 1 2026            -> Januari 2026
//   node generate.js --bulan=2 --tahun=2026
// ============================================================

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { getAllIssuesForAssignee } = require('./plane-api');
const { generateHTML } = require('./html-template');
const config = require('./config');

// Path Chrome di Mac - akan dicek satu per satu
const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

// ---- Parse arguments ----
function parseArgs() {
  const args = process.argv.slice(2);
  const now = new Date();
  let bulan = now.getMonth() + 1;
  let tahun = now.getFullYear();

  for (const arg of args) {
    if (arg.startsWith('--bulan=')) bulan = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--tahun=')) tahun = parseInt(arg.split('=')[1]);
  }

  // Format: node generate.js <bulan> <tahun>
  if (args.length >= 1 && !args[0].startsWith('--')) bulan = parseInt(args[0]);
  if (args.length >= 2 && !args[1].startsWith('--')) tahun = parseInt(args[1]);

  return { bulan, tahun };
}

async function main() {
  const { bulan, tahun } = parseArgs();

  const namaBulanList = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const namaBulan = namaBulanList[bulan] || bulan;

  console.log('='.repeat(60));
  console.log('  PLANE LAPORAN PDF GENERATOR');
  console.log('='.repeat(60));
  console.log(`  Periode  : ${namaBulan} ${tahun}`);
  console.log(`  Penyusun : ${config.laporan.namaPenyusun}`);
  console.log('='.repeat(60));

  // 1. Fetch data dari Plane
  const issues = await getAllIssuesForAssignee(
    config.plane.assigneeId,
    bulan,
    tahun
  );

  if (issues.length === 0) {
    console.log('\n⚠️  Tidak ada issue yang ditemukan untuk periode ini.');
    console.log('   PDF tetap akan dibuat dengan halaman kosong.\n');
  }

  // 2. Generate HTML
  console.log('\n📝 Membuat HTML template...');
  const html = generateHTML(issues, bulan, tahun);

  // Simpan HTML sementara
  const outputDir = path.resolve('./output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const htmlPath = path.resolve(`./output/laporan_${namaBulan}_${tahun}.html`);
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`   HTML disimpan di: ${htmlPath}`);

  // 3. Cari Chrome/Chromium di sistem
  let executablePath = null;
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) { executablePath = p; break; }
  }
  if (!executablePath) {
    console.error('\n❌ Chrome/Chromium tidak ditemukan!');
    console.error('   Install Google Chrome dari https://www.google.com/chrome/');
    process.exit(1);
  }

  // 4. Convert ke PDF via Puppeteer
  console.log('\n🖨️  Mengkonversi ke PDF...');
  console.log(`   Browser : ${executablePath}`);

  const pdfPath = path.resolve(
    `./output/${namaBulan}_${tahun}_${config.laporan.namaPenyusun.split(',')[0].replace(/\s+/g, '')}.pdf`
  );

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });

    console.log('\n✅ PDF berhasil dibuat!');
    console.log(`   📄 File : ${pdfPath}`);
    console.log(`   📊 Total kegiatan : ${issues.length} task`);

  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Selesai!');
  console.log('='.repeat(60) + '\n');
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
