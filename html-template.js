// ============================================================
// html-template.js - Generate HTML untuk dikonversi ke PDF
// ============================================================

const fs = require('fs');
const path = require('path');
const config = require('./config');

function imageToBase64(filePath) {
  try {
    const abs = path.resolve(filePath);
    const ext = path.extname(filePath).replace('.', '').toLowerCase();
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    const data = fs.readFileSync(abs).toString('base64');
    return `data:image/${mime};base64,${data}`;
  } catch { return ''; }
}

function getNamaBulan(bulan) {
  const names = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return names[parseInt(bulan)] || '';
}

function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Konversi HTML description ke teks readable tapi tetap pertahankan gambar
function cleanDescription(html) {
  if (!html || html.trim() === '<p></p>' || html.trim() === '') return '';
  // Bersihkan tapi pertahankan tag img, p, br, strong, em
  return html
    .replace(/<p>/gi, '<p style="margin:2pt 0; font-size:10.5pt;">')
    .replace(/<img/gi, '<img style="max-width:100%;height:auto;margin:4pt 0;"');
}

function generateIssueCard(issue, index) {
  const aplikasi = escapeHtml(issue.projectName || '-');
  const task = escapeHtml(issue.name || '-');
  const pic = escapeHtml(config.laporan.namaPenyusun.split(',')[0]);
  const status = escapeHtml(issue.stateName || 'Done');
  const startDate = formatTanggal(issue.start_date || issue.created_at);

  // Description
  const descHtml = cleanDescription(issue.description_html || '');

  // Cari Result dari description (beberapa Plane instance menyimpan result di field terpisah)
  // Jika tidak ada field result, biarkan kosong (user bisa isi manual di docx)
  const resultHtml = cleanDescription(issue.description_result || issue.result_html || '');

  return `
  <div class="issue-card" style="margin-bottom:20pt; page-break-inside:avoid;">
    <table style="width:100%;border-collapse:collapse;font-size:11pt;">
      <tr>
        <td style="border:1px solid #000;padding:5pt 8pt;width:110px;">Aplikasi</td>
        <td style="border:1px solid #000;padding:5pt 8pt;color:#1a56db;font-weight:bold;">${aplikasi}</td>
      </tr>
      <tr>
        <td style="border:1px solid #000;padding:5pt 8pt;">Task</td>
        <td style="border:1px solid #000;padding:5pt 8pt;"><strong>${task}</strong></td>
      </tr>
      <tr>
        <td style="border:1px solid #000;padding:5pt 8pt;">PIC</td>
        <td style="border:1px solid #000;padding:5pt 8pt;">${pic}</td>
      </tr>
      <tr>
        <td style="border:1px solid #000;padding:5pt 8pt;">Status</td>
        <td style="border:1px solid #000;padding:5pt 8pt;">${status}</td>
      </tr>
      <tr>
        <td style="border:1px solid #000;padding:5pt 8pt;">Start date</td>
        <td style="border:1px solid #000;padding:5pt 8pt;">${startDate}</td>
      </tr>
    </table>

    ${descHtml ? `
    <div style="border:1px solid #000;border-top:none;padding:6pt 8pt;">
      <div style="font-size:11pt;margin-bottom:4pt;">Description:</div>
      <div style="font-size:10.5pt;line-height:1.5;">${descHtml}</div>
    </div>` : `
    <div style="border:1px solid #000;border-top:none;padding:6pt 8pt;">
      <div style="font-size:11pt;margin-bottom:4pt;">Description:</div>
      <div style="font-size:10.5pt;color:#888;font-style:italic;">(tidak ada deskripsi)</div>
    </div>`}

    <div style="border:1px solid #000;border-top:none;padding:6pt 8pt;">
      <div style="font-size:11pt;margin-bottom:4pt;">Result:</div>
      ${resultHtml
        ? `<div style="font-size:10.5pt;line-height:1.5;">${resultHtml}</div>`
        : `<div style="font-size:10.5pt;color:#888;font-style:italic;">(hasil pekerjaan)</div>`}
    </div>
  </div>`;
}

function generateHTML(issues, bulan, tahun) {
  const logoBase64 = imageToBase64(config.assets.logo);
  const ttdBase64 = imageToBase64(config.assets.ttd);
  const namaBulan = getNamaBulan(bulan);
  const { laporan } = config;
  const issueCards = issues.map(generateIssueCard).join('\n');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Times New Roman',Times,serif; font-size:12pt; color:#000; background:#fff; }
  .page { width:210mm; min-height:297mm; padding:25mm 25mm 20mm 30mm; page-break-after:always; position:relative; }
  .page:last-child { page-break-after:avoid; }
  .page-footer { position:absolute; bottom:10mm; left:0; right:0; text-align:center; font-size:10pt; border-top:1px solid #000; padding-top:3pt; margin:0 25mm; }
  .paragraph { text-align:justify; text-indent:40pt; line-height:1.6; margin-bottom:10pt; font-size:12pt; }
  @page { size:A4; margin:0; }
</style>
</head>
<body>

<!-- HALAMAN 1: COVER -->
<div class="page">
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:247mm;">
    <h1 style="font-size:22pt;font-weight:bold;margin-bottom:8pt;">LAPORAN TENAGA AHLI</h1>
    <h2 style="font-size:20pt;font-weight:bold;margin-bottom:30pt;">${namaBulan.toUpperCase()} ${tahun}</h2>
    <div style="font-size:12pt;font-weight:bold;margin-bottom:4pt;">${escapeHtml(laporan.instansi)}</div>
    <div style="font-size:18pt;font-weight:bold;margin-bottom:20pt;">${escapeHtml(laporan.dinas)}</div>
    ${logoBase64 ? `<img src="${logoBase64}" style="width:130px;height:130px;object-fit:contain;margin-bottom:20pt;" alt="Logo">` : ''}
    <div style="font-size:16pt;font-weight:bold;margin-bottom:40pt;">${escapeHtml(laporan.bidang)}</div>
    <div style="font-size:10pt;margin-bottom:4pt;">DI SUSUN OLEH:</div>
    <div style="font-size:12pt;font-weight:bold;">${escapeHtml(laporan.namaPenyusun)}</div>
  </div>
  <div class="page-footer">1 | P a g e</div>
</div>

<!-- HALAMAN 2: INFO + LATAR BELAKANG -->
<div class="page">
  <div style="text-align:center;margin-bottom:20pt;">
    <div style="font-size:13pt;font-weight:bold;">LAPORAN KEGIATAN KERJA TENAGA AHLI</div>
    <div style="font-size:13pt;font-weight:bold;">${escapeHtml(laporan.dinas)}</div>
    <div style="font-size:13pt;font-weight:bold;">BIDANG TELEMATIKA - KABUPATEN TANGERANG</div>
    <hr style="border:1.5px solid #000;margin:8pt 0 15pt 0;">
  </div>
  <table style="width:100%;margin-bottom:20pt;border-collapse:collapse;">
    <tr><td style="width:130px;padding:3pt 0;">Nama</td><td style="width:20px;text-align:center;">:</td><td>${escapeHtml(laporan.namaPenyusun)}</td></tr>
    <tr><td style="padding:3pt 0;">Jabatan</td><td style="text-align:center;">:</td><td>${escapeHtml(laporan.jabatanPenyusun)}</td></tr>
    <tr><td style="padding:3pt 0;">Lokasi Kegiatan</td><td style="text-align:center;">:</td><td>${escapeHtml(laporan.lokasiKegiatan)}</td></tr>
    <tr><td style="padding:3pt 0;">Waktu Kegiatan</td><td style="text-align:center;">:</td><td>${namaBulan} ${tahun}</td></tr>
  </table>
  <div style="font-size:12pt;font-weight:bold;margin-bottom:10pt;">LATAR BELAKANG</div>
  <p class="paragraph">Perkembangan zaman yang semakin meningkat dan diikuti oleh perkembangan TI yang semakin modern berpengaruh terhadap kehidupan individu maupun kelompok. Perkembangan TI dapat membantu dalam mengembangkan tugas-tugas baru pada perusahaan berskala pasar global atau pada instansi pemerintah, TI dimanfaatkan untuk mengatasi meningkatkan kemampuan seseorang dalam meraih keunggulan dan kesuksesan yang handal serta canggih.</p>
  <p class="paragraph">Keberadaan sistem informasi semakin mengarah untuk memenuhi kebutuhan pemakai. Keterlibatan pemakai sangat diperlukan dalam keseluruhan tahap <em>system development life cycle</em> (mulai tahap perencanaan, analisis, perancangan, implementasi, dan penggunaan sistem), karena pemakai merupakan bagian integral dari kesuksesan suatu sistem informasi.</p>
  <p class="paragraph">Pemanfaatan teknologi informasi ini juga digunakan dalam instansi pemerintahan. Pelayanan publik yang diberikan instansi Pemerintah kepada masyarakat merupakan perwujudan fungsi aparatur negara sebagai abdi masyarakat. Pada era otonomi daerah, fungsi pelayanan publik menjadi salah satu fokus perhatian dalam peningkatan kinerja instansi pemerintah daerah.</p>
  <p class="paragraph">Berdasarkan hal di atas, maka Tenaga Ahli berkewajiban untuk mengawal terselenggaranya kegiatan yang berkenaan dengan TI dengan baik dan lancar. Laporan ini berisi tentang kegiatan TA Programmer yang telah dilakukan sebagai bentuk tanggung jawab terhadap pekerjaan.</p>
  <div class="page-footer">2 | P a g e</div>
</div>

<!-- HALAMAN 3: TABEL ISTILAH -->
<div class="page">
  <div style="font-size:12pt;font-weight:bold;margin-bottom:10pt;">TABEL ISTILAH</div>
  <table style="width:100%;border-collapse:collapse;font-size:11pt;">
    <thead>
      <tr>
        <th style="border:1px solid #000;padding:6pt 8pt;text-align:center;width:40px;">No.</th>
        <th style="border:1px solid #000;padding:6pt 8pt;text-align:center;width:130px;">Istilah</th>
        <th style="border:1px solid #000;padding:6pt 8pt;text-align:center;">Pengertian</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="border:1px solid #000;padding:6pt 8pt;text-align:center;">1.</td><td style="border:1px solid #000;padding:6pt 8pt;">Server</td><td style="border:1px solid #000;padding:6pt 8pt;line-height:1.5;">Server web atau peladen web dapat merujuk baik pada perangkat keras ataupun perangkat lunak yang menyediakan layanan akses kepada pengguna melalui protokol komunikasi HTTP atau HTTPS atas berkas-berkas yang terdapat pada suatu situs web.</td></tr>
      <tr><td style="border:1px solid #000;padding:6pt 8pt;text-align:center;">2.</td><td style="border:1px solid #000;padding:6pt 8pt;">Sistem Operasi (OS)</td><td style="border:1px solid #000;padding:6pt 8pt;line-height:1.5;">Sistem operasi adalah perangkat lunak sistem yang mengatur sumber daya dari perangkat keras dan perangkat lunak, serta sebagai jurik (<em>daemon</em>) untuk program komputer.</td></tr>
      <tr><td style="border:1px solid #000;padding:6pt 8pt;text-align:center;">3.</td><td style="border:1px solid #000;padding:6pt 8pt;">GIT</td><td style="border:1px solid #000;padding:6pt 8pt;line-height:1.5;">Git adalah perangkat lunak pengontrol versi atau proyek manajemen kode perangkat lunak yang diciptakan oleh Linus Torvalds, yang pada awalnya ditujukan untuk pengembangan kernel Linux.</td></tr>
      <tr><td style="border:1px solid #000;padding:6pt 8pt;text-align:center;">4.</td><td style="border:1px solid #000;padding:6pt 8pt;">API</td><td style="border:1px solid #000;padding:6pt 8pt;line-height:1.5;">API (<em>application programming interface</em>) adalah sekumpulan perintah, fungsi, serta protokol yang dapat digunakan oleh programmer saat membangun perangkat lunak untuk sistem operasi tertentu.</td></tr>
      <tr><td style="border:1px solid #000;padding:6pt 8pt;text-align:center;">5.</td><td style="border:1px solid #000;padding:6pt 8pt;">Endpoint API</td><td style="border:1px solid #000;padding:6pt 8pt;line-height:1.5;">URL API yang digunakan untuk melayani Request.</td></tr>
    </tbody>
  </table>
  <div class="page-footer">3 | P a g e</div>
</div>

<!-- HALAMAN 4 dst: TABEL KEGIATAN -->
<div class="page">
  <p style="text-align:justify;line-height:1.6;margin-bottom:20pt;font-size:12pt;">Telah dilakukan berupa kegiatan/pekerjaan yang dilaksanakan, dengan laporan kegiatan/pekerjaan sebagai berikut :</p>
  <div style="font-size:12pt;font-weight:bold;margin-bottom:10pt;">TABEL KEGIATAN</div>
  ${issueCards || '<p><em>Tidak ada kegiatan ditemukan untuk periode ini.</em></p>'}
  <div class="page-footer">4 | P a g e</div>
</div>

<!-- HALAMAN TERAKHIR: TANDA TANGAN -->
<div class="page">
  <div style="display:flex;flex-direction:column;justify-content:flex-end;min-height:247mm;padding-bottom:20pt;">
    <div style="display:flex;justify-content:space-between;margin-bottom:30pt;">
      <div style="width:45%;text-align:center;">
        <div style="font-size:12pt;margin-bottom:70pt;">Tim Penilai</div>
        <div style="font-size:12pt;font-weight:bold;text-decoration:underline;">${escapeHtml(laporan.namaPenilai)}</div>
        <div style="font-size:12pt;">NIP. ${escapeHtml(laporan.nipPenilai)}</div>
      </div>
      <div style="width:45%;text-align:center;">
        <div style="font-size:12pt;margin-bottom:10pt;">Yang Membuat Laporan</div>
        ${ttdBase64 ? `<img src="${ttdBase64}" style="height:60px;object-fit:contain;margin-bottom:5pt;" alt="TTD">` : '<div style="height:70pt;"></div>'}
        <div style="font-size:12pt;font-weight:bold;text-decoration:underline;">${escapeHtml(laporan.namaPenyusun)}</div>
      </div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:12pt;">Mengetahui</div>
      <div style="font-size:12pt;margin-bottom:70pt;">${escapeHtml(laporan.jabatanKepala)}</div>
      <div style="font-size:12pt;font-weight:bold;text-decoration:underline;">${escapeHtml(laporan.namaKepala)}</div>
      <div style="font-size:12pt;">NIP. ${escapeHtml(laporan.nipKepala)}</div>
    </div>
  </div>
</div>

</body>
</html>`;
}

module.exports = { generateHTML, getNamaBulan, formatTanggal, escapeHtml };
