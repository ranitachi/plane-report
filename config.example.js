// ============================================================
// KONFIGURASI - Copy file ini menjadi config.js lalu sesuaikan
//   cp config.example.js config.js
// ============================================================

module.exports = {
  // === PLANE API ===
  plane: {
    baseUrl: 'https://project.tangerangkab.my.id',
    apiKey: 'plane_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    workspaceSlug: 'diskominfo',
    assigneeId: '00000000-0000-0000-0000-000000000000',
  },

  // === DATA LAPORAN ===
  laporan: {
    // Nama penyusun laporan
    namaPenyusun: 'Nama Penyusun, S.Kom',
    jabatanPenyusun: 'Tenaga Ahli Programmer',
    lokasiKegiatan: 'Diskominfo Bidang Aplikasi Kab. Tangerang',

    // Tim Penilai
    namaPenilai: 'Nama Penilai, S.Kom, MM',
    nipPenilai: '000000000000000000',

    // Kepala Bidang
    namaKepala: 'Nama Kepala, S.ST',
    nipKepala: '000000000000000000',
    jabatanKepala: 'Kepala Bidang Aplikasi Informatika',

    // Instansi
    instansi: 'PEMERINTAH KABUPATEN TANGERANG',
    dinas: 'DINAS KOMUNIKASI DAN INFORMATIKA',
    bidang: 'BIDANG APLIKASI INFORMATIKA',
  },

  // === FILE PATH ===
  assets: {
    logo: './assets/logo_diskominfo.png',
    ttd: './assets/ttd_fachran.png',
  },
};
