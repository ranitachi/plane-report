#!/usr/bin/env node
// ============================================================
// generate-docx.js - Generate Laporan dalam format DOCX
//
// Usage:
//   node generate-docx.js
//   node generate-docx.js 1 2026
// ============================================================

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, BorderStyle, WidthType, VerticalAlign,
  PageBreak, ShadingType, HeadingLevel, UnderlineType
} = require('docx');
const fs = require('fs');
const path = require('path');
const { getAllIssuesForAssignee } = require('./plane-api');
const config = require('./config');

// ---- Helpers ----
const namaBulanList = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function getNamaBulan(b) { return namaBulanList[parseInt(b)] || ''; }

function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${d.getDate()} ${namaBulanList[d.getMonth() + 1]} ${d.getFullYear()}`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const now = new Date();
  let bulan = now.getMonth() + 1;
  let tahun = now.getFullYear();
  if (args.length >= 1 && !args[0].startsWith('--')) bulan = parseInt(args[0]);
  if (args.length >= 2 && !args[1].startsWith('--')) tahun = parseInt(args[1]);
  for (const a of args) {
    if (a.startsWith('--bulan=')) bulan = parseInt(a.split('=')[1]);
    if (a.startsWith('--tahun=')) tahun = parseInt(a.split('=')[1]);
  }
  return { bulan, tahun };
}

// ---- Constants ----
// A4 dengan margin: top=1800, bottom=1440, left=1800, right=1440 (DXA)
const PAGE_WIDTH = 11906;
const MARGIN_LEFT = 1800;
const MARGIN_RIGHT = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 8666

const BORDER_NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const BORDER_BLACK = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
const borders = { top: BORDER_BLACK, bottom: BORDER_BLACK, left: BORDER_BLACK, right: BORDER_BLACK };
const bordersNone = { top: BORDER_NONE, bottom: BORDER_NONE, left: BORDER_NONE, right: BORDER_NONE };

function txt(text, opts = {}) {
  return new TextRun({ text: String(text || ''), font: 'Times New Roman', size: 24, ...opts });
}

function para(children, opts = {}) {
  return new Paragraph({ children: Array.isArray(children) ? children : [children], ...opts });
}

function emptyPara() { return para([txt('')]); }

function cell(children, opts = {}) {
  return new TableCell({
    borders,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: Array.isArray(children) ? children : [para(children)],
    ...opts,
  });
}

function cellNoBorder(children, opts = {}) {
  return new TableCell({
    borders: bordersNone,
    margins: { top: 40, bottom: 40, left: 0, right: 0 },
    children: Array.isArray(children) ? children : [para(children)],
    ...opts,
  });
}

// ============================================================
// HALAMAN 1: COVER
// ============================================================
function buildCover(logoImg, namaBulan, tahun) {
  const { laporan } = config;
  const children = [];

  // Spacing atas
  for (let i = 0; i < 4; i++) children.push(emptyPara());

  children.push(para([txt('LAPORAN TENAGA AHLI', { bold: true, size: 44 })], { alignment: AlignmentType.CENTER }));
  children.push(emptyPara());
  children.push(para([txt(`${namaBulan.toUpperCase()} ${tahun}`, { bold: true, size: 40 })], { alignment: AlignmentType.CENTER }));

  for (let i = 0; i < 2; i++) children.push(emptyPara());

  children.push(para([txt(laporan.instansi, { bold: true, size: 24 })], { alignment: AlignmentType.CENTER }));
  children.push(para([txt(laporan.dinas, { bold: true, size: 32 })], { alignment: AlignmentType.CENTER }));

  children.push(emptyPara());

  // Logo
  if (logoImg) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        type: 'png',
        data: logoImg,
        transformation: { width: 120, height: 120 },
        altText: { title: 'Logo', description: 'Logo Diskominfo', name: 'logo' },
      })],
    }));
  }

  children.push(emptyPara());
  children.push(para([txt(laporan.bidang, { bold: true, size: 32 })], { alignment: AlignmentType.CENTER }));

  for (let i = 0; i < 3; i++) children.push(emptyPara());

  children.push(para([txt('DI SUSUN OLEH:', { size: 20 })], { alignment: AlignmentType.CENTER }));
  children.push(para([txt(laporan.namaPenyusun, { bold: true, size: 24 })], { alignment: AlignmentType.CENTER }));

  // Page break
  children.push(para([new PageBreak()]));

  return children;
}

// ============================================================
// HALAMAN 2: INFO + LATAR BELAKANG
// ============================================================
function buildHal2(namaBulan, tahun) {
  const { laporan } = config;
  const children = [];

  children.push(para([txt('LAPORAN KEGIATAN KERJA TENAGA AHLI', { bold: true })], { alignment: AlignmentType.CENTER }));
  children.push(para([txt(laporan.dinas, { bold: true })], { alignment: AlignmentType.CENTER }));
  children.push(para([txt('BIDANG TELEMATIKA - KABUPATEN TANGERANG', { bold: true })], { alignment: AlignmentType.CENTER }));

  children.push(emptyPara());

  // Info table
  const infoRows = [
    ['Nama', laporan.namaPenyusun],
    ['Jabatan', laporan.jabatanPenyusun],
    ['Lokasi Kegiatan', laporan.lokasiKegiatan],
    ['Waktu Kegiatan', `${namaBulan} ${tahun}`],
  ];

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2000, 300, CONTENT_WIDTH - 2300],
    borders: { insideH: BORDER_NONE, insideV: BORDER_NONE, top: BORDER_NONE, bottom: BORDER_NONE, left: BORDER_NONE, right: BORDER_NONE },
    rows: infoRows.map(([label, value]) => new TableRow({
      children: [
        cellNoBorder([txt(label)], { width: { size: 2000, type: WidthType.DXA } }),
        cellNoBorder([txt(':')], { width: { size: 300, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP }),
        cellNoBorder([txt(value)], { width: { size: CONTENT_WIDTH - 2300, type: WidthType.DXA } }),
      ]
    }))
  }));

  children.push(emptyPara());
  children.push(para([txt('LATAR BELAKANG', { bold: true })]));
  children.push(emptyPara());

  const latarBelakang = [
    'Perkembangan zaman yang semakin meningkat dan diikuti oleh perkembangan TI yang semakin modern berpengaruh terhadap kehidupan individu maupun kelompok. Perkembangan TI dapat membantu dalam mengembangkan tugas-tugas baru pada perusahaan berskala pasar global atau pada instansi pemerintah, TI dimanfaatkan untuk mengatasi meningkatkan kemampuan seseorang dalam meraih keunggulan dan kesuksesan yang handal serta canggih.',
    'Keberadaan sistem informasi semakin mengarah untuk memenuhi kebutuhan pemakai. Keterlibatan pemakai sangat diperlukan dalam keseluruhan tahap system development life cycle (mulai tahap perencanaan, analisis, perancangan, implementasi, dan penggunaan sistem), karena pemakai merupakan bagian integral dari kesuksesan suatu sistem informasi.',
    'Pemanfaatan teknologi informasi ini juga digunakan dalam instansi pemerintahan. Pelayanan publik yang diberikan instansi Pemerintah kepada masyarakat merupakan perwujudan fungsi aparatur negara sebagai abdi masyarakat. Pada era otonomi daerah, fungsi pelayanan publik menjadi salah satu fokus perhatian dalam peningkatan kinerja instansi pemerintah daerah.',
    'Berdasarkan hal di atas, maka Tenaga Ahli berkewajiban untuk mengawal terselenggaranya kegiatan yang berkenaan dengan TI dengan baik dan lancar. Laporan ini berisi tentang kegiatan TA Programmer yang telah dilakukan sebagai bentuk tanggung jawab terhadap pekerjaan.',
  ];

  for (const p of latarBelakang) {
    children.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 720 },
      spacing: { after: 120 },
      children: [txt(p)],
    }));
  }

  children.push(para([new PageBreak()]));
  return children;
}

// ============================================================
// HALAMAN 3: TABEL ISTILAH
// ============================================================
function buildHal3() {
  const children = [];
  children.push(para([txt('TABEL ISTILAH', { bold: true })]));
  children.push(emptyPara());

  const COL1 = 600, COL2 = 2000, COL3 = CONTENT_WIDTH - COL1 - COL2;
  const istilah = [
    ['1.', 'Server', 'Server web atau peladen web dapat merujuk baik pada perangkat keras ataupun perangkat lunak yang menyediakan layanan akses kepada pengguna melalui protokol komunikasi HTTP atau HTTPS atas berkas-berkas yang terdapat pada suatu situs web dalam layanan ke pengguna dengan menggunakan aplikasi tertentu seperti peramban web.'],
    ['2.', 'Sistem Operasi (OS)', 'Sistem operasi adalah perangkat lunak sistem yang mengatur sumber daya dari perangkat keras dan perangkat lunak, serta sebagai jurik (daemon) untuk program komputer.'],
    ['3.', 'GIT', 'Git adalah perangkat lunak pengontrol versi atau proyek manajemen kode perangkat lunak yang diciptakan oleh Linus Torvalds, yang pada awalnya ditujukan untuk pengembangan kernel Linux.'],
    ['4.', 'API (Antarmuka Pemrograman Aplikasi)', 'API (application programming interface) adalah sekumpulan perintah, fungsi, serta protokol yang dapat digunakan oleh programmer saat membangun perangkat lunak untuk sistem operasi tertentu.'],
    ['5.', 'Endpoint API', 'URL API yang digunakan untuk melayani Request.'],
  ];

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [COL1, COL2, COL3],
    rows: [
      // Header
      new TableRow({
        tableHeader: true,
        children: [
          cell([para([txt('No.', { bold: true })], { alignment: AlignmentType.CENTER })], { width: { size: COL1, type: WidthType.DXA }, shading: { fill: 'FFFFFF', type: ShadingType.CLEAR } }),
          cell([para([txt('Istilah', { bold: true })], { alignment: AlignmentType.CENTER })], { width: { size: COL2, type: WidthType.DXA }, shading: { fill: 'FFFFFF', type: ShadingType.CLEAR } }),
          cell([para([txt('Pengertian', { bold: true })], { alignment: AlignmentType.CENTER })], { width: { size: COL3, type: WidthType.DXA }, shading: { fill: 'FFFFFF', type: ShadingType.CLEAR } }),
        ]
      }),
      ...istilah.map(([no, nama, def]) => new TableRow({
        children: [
          cell([para([txt(no)], { alignment: AlignmentType.CENTER })], { width: { size: COL1, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP }),
          cell([para([txt(nama)])], { width: { size: COL2, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP }),
          cell([new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [txt(def)] })], { width: { size: COL3, type: WidthType.DXA } }),
        ]
      })),
    ]
  }));

  children.push(para([new PageBreak()]));
  return children;
}

// ============================================================
// HALAMAN 4 dst: TABEL KEGIATAN
// ============================================================
function htmlToPlainText(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildIssueCard(issue) {
  const COL_LABEL = 1600;
  const COL_VALUE = CONTENT_WIDTH - COL_LABEL;
  const rows = [];
  const { laporan } = config;

  const picName = laporan.namaPenyusun.split(',')[0];

  // Row data
  const dataRows = [
    ['Aplikasi', issue.projectName || '-', true], // true = colored
    ['Task', issue.name || '-', false, true],      // bold
    ['PIC', picName, false],
    ['Status', issue.stateName || 'Done', false],
    ['Start date', formatTanggal(issue.start_date || issue.created_at), false],
  ];

  for (const [label, value, isColored, isBold] of dataRows) {
    rows.push(new TableRow({
      children: [
        cell([para([txt(label)])], { width: { size: COL_LABEL, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP }),
        cell([para([txt(value, { color: isColored ? '1a56db' : '000000', bold: !!isBold })])], { width: { size: COL_VALUE, type: WidthType.DXA } }),
      ]
    }));
  }

  // Description row
  const descText = htmlToPlainText(issue.description_html || issue.description || '');
  const descLines = descText ? descText.split('\n').filter(l => l.trim()) : [];

  rows.push(new TableRow({
    children: [
      new TableCell({
        borders,
        columnSpan: 2,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        children: [
          para([txt('Description:', { bold: false })]),
          ...(descLines.length > 0
            ? descLines.map(line => new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [txt(line)] }))
            : [para([txt('(tidak ada deskripsi)', { color: '888888' })])]),
        ],
      })
    ]
  }));

  // Result row
  const resultText = htmlToPlainText(issue.description_result || issue.result_html || '');
  const resultLines = resultText ? resultText.split('\n').filter(l => l.trim()) : [];

  rows.push(new TableRow({
    children: [
      new TableCell({
        borders,
        columnSpan: 2,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        children: [
          para([txt('Result:')]),
          ...(resultLines.length > 0
            ? resultLines.map(line => new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [txt(line)] }))
            : [para([txt('(isi hasil pekerjaan di sini)', { color: '888888' })])]),
        ],
      })
    ]
  }));

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [COL_LABEL, COL_VALUE],
    rows,
  });
}

function buildHalKegiatan(issues) {
  const children = [];

  children.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 240 },
    children: [txt('Telah dilakukan berupa kegiatan/pekerjaan yang dilaksanakan, dengan laporan kegiatan/pekerjaan sebagai berikut :')],
  }));

  children.push(para([txt('TABEL KEGIATAN', { bold: true })]));
  children.push(emptyPara());

  if (issues.length === 0) {
    children.push(para([txt('Tidak ada kegiatan ditemukan untuk periode ini.', { color: '888888' })]));
  } else {
    for (let i = 0; i < issues.length; i++) {
      children.push(buildIssueCard(issues[i]));
      if (i < issues.length - 1) {
        children.push(emptyPara());
      }
    }
  }

  children.push(para([new PageBreak()]));
  return children;
}

// ============================================================
// HALAMAN TERAKHIR: TANDA TANGAN
// ============================================================
function buildTTD(ttdImg) {
  const { laporan } = config;
  const children = [];

  // Spacer
  for (let i = 0; i < 20; i++) children.push(emptyPara());

  const COL = Math.floor(CONTENT_WIDTH / 2);

  // Baris 1: Tim Penilai | Yang Membuat Laporan
  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [COL, COL],
    rows: [
      new TableRow({
        children: [
          cellNoBorder([para([txt('Tim Penilai')], { alignment: AlignmentType.CENTER })], { width: { size: COL, type: WidthType.DXA } }),
          cellNoBorder([para([txt('Yang Membuat Laporan')], { alignment: AlignmentType.CENTER })], { width: { size: COL, type: WidthType.DXA } }),
        ]
      }),
      new TableRow({
        children: [
          // Kolom Tim Penilai - kosong untuk TTD
          cellNoBorder([
            emptyPara(), emptyPara(), emptyPara(), emptyPara(), emptyPara(),
          ], { width: { size: COL, type: WidthType.DXA } }),
          // Kolom Yang Membuat - ada gambar TTD
          cellNoBorder([
            ttdImg
              ? new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new ImageRun({
                    type: 'png',
                    data: ttdImg,
                    transformation: { width: 120, height: 55 },
                    altText: { title: 'TTD', description: 'Tanda Tangan', name: 'ttd' },
                  })]
                })
              : emptyPara(),
            emptyPara(),
          ], { width: { size: COL, type: WidthType.DXA } }),
        ]
      }),
      new TableRow({
        children: [
          cellNoBorder([
            para([txt(laporan.namaPenilai, { bold: true, underline: { type: UnderlineType.SINGLE } })], { alignment: AlignmentType.CENTER }),
            para([txt(`NIP. ${laporan.nipPenilai}`)], { alignment: AlignmentType.CENTER }),
          ], { width: { size: COL, type: WidthType.DXA } }),
          cellNoBorder([
            para([txt(laporan.namaPenyusun, { bold: true, underline: { type: UnderlineType.SINGLE } })], { alignment: AlignmentType.CENTER }),
          ], { width: { size: COL, type: WidthType.DXA } }),
        ]
      }),
    ]
  }));

  children.push(emptyPara());
  children.push(emptyPara());

  // Mengetahui
  children.push(para([txt('Mengetahui')], { alignment: AlignmentType.CENTER }));
  children.push(para([txt(laporan.jabatanKepala)], { alignment: AlignmentType.CENTER }));

  for (let i = 0; i < 5; i++) children.push(emptyPara());

  children.push(para([txt(laporan.namaKepala, { bold: true, underline: { type: UnderlineType.SINGLE } })], { alignment: AlignmentType.CENTER }));
  children.push(para([txt(`NIP. ${laporan.nipKepala}`)], { alignment: AlignmentType.CENTER }));

  return children;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const { bulan, tahun } = parseArgs();
  const namaBulan = getNamaBulan(bulan);

  console.log('='.repeat(60));
  console.log('  PLANE LAPORAN DOCX GENERATOR');
  console.log('='.repeat(60));
  console.log(`  Periode  : ${namaBulan} ${tahun}`);
  console.log(`  Penyusun : ${config.laporan.namaPenyusun}`);
  console.log('='.repeat(60));

  // Fetch issues
  const issues = await getAllIssuesForAssignee(config.plane.assigneeId, bulan, tahun);
  if (issues.length === 0) {
    console.log('\n⚠️  Tidak ada issue ditemukan, DOCX tetap dibuat.\n');
  }

  // Load assets
  let logoImg = null, ttdImg = null;
  try { logoImg = fs.readFileSync(path.resolve(config.assets.logo)); } catch { console.warn('Logo tidak ditemukan'); }
  try { ttdImg = fs.readFileSync(path.resolve(config.assets.ttd)); } catch { console.warn('TTD tidak ditemukan'); }

  // Build document
  console.log('\n📝 Membuat DOCX...');
  const allChildren = [
    ...buildCover(logoImg, namaBulan, tahun),
    ...buildHal2(namaBulan, tahun),
    ...buildHal3(),
    ...buildHalKegiatan(issues),
    ...buildTTD(ttdImg),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Times New Roman', size: 24 } }
      }
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: 16838 },
          margin: { top: 1800, bottom: 1440, left: MARGIN_LEFT, right: MARGIN_RIGHT },
        }
      },
      children: allChildren,
    }]
  });

  const outputDir = path.resolve('./output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outName = `${namaBulan}_${tahun}_${config.laporan.namaPenyusun.split(',')[0].replace(/\s+/g, '')}.docx`;
  const outPath = path.resolve(`./output/${outName}`);

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);

  console.log('\n✅ DOCX berhasil dibuat!');
  console.log(`   📄 File : ${outPath}`);
  console.log(`   📊 Total kegiatan : ${issues.length} task`);
  console.log('\n' + '='.repeat(60) + '\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
