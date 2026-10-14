# 📄 Plane Laporan PDF Generator

Tool untuk generate **Laporan Tenaga Ahli** otomatis dari data Plane API dalam format PDF.

---

## 📁 Struktur Project

```
plane-report/
├── generate.js        # Script utama
├── plane-api.js       # Fetch data dari Plane API
├── html-template.js   # Template HTML laporan
├── config.js          # Konfigurasi (URL, API Key, nama, dll)
├── package.json
├── assets/
│   ├── logo_diskominfo.png   # Logo Diskominfo
│   └── ttd_fachran.png       # Gambar tanda tangan
└── output/            # Hasil PDF & HTML (dibuat otomatis)
```

---

## 🚀 Cara Install

### 1. Pastikan Node.js sudah terinstall
```bash
node --version   # minimal v16
```

### 2. Install dependencies
```bash
cd plane-report
npm install
```

> **Note:** Puppeteer akan mendownload Chromium (~170MB) secara otomatis saat `npm install`.

---

## ⚙️ Konfigurasi

Edit file `config.js` sesuai kebutuhan:

```js
module.exports = {
  plane: {
    baseUrl: 'https://project.tangerangkab.my.id',  // URL self-hosted Plane
    apiKey: 'plane_api_xxx...',                       // API Key
    workspaceSlug: 'diskominfo',
    assigneeId: 'e4962226-...',                       // ID user yang dibuat laporannya
  },
  laporan: {
    namaPenyusun: 'Fachran Nazarullah, S.Komp, MT',
    // ... dst
  }
}
```

---

## ▶️ Cara Penggunaan

### Generate laporan bulan berjalan (default)
```bash
node generate.js
```

### Generate laporan bulan tertentu
```bash
node generate.js 1 2026          # Januari 2026
node generate.js 2 2026          # Februari 2026
node generate.js --bulan=3 --tahun=2026   # Maret 2026
```

### Output
PDF akan tersimpan di folder `output/`:
```
output/Januari_2026_FachranNazarullah.pdf
output/Januari_2026_FachranNazarullah.html   (untuk preview/debug)
```

---

## 📋 Struktur Laporan

| Halaman | Konten |
|---------|--------|
| 1 | Cover (Logo, Judul, Nama Penyusun) |
| 2 | Info Tenaga Ahli + Latar Belakang |
| 3 | Tabel Istilah |
| 4 dst | Tabel Kegiatan per Task (dari Plane API) |
| Terakhir | Halaman Tanda Tangan |

---

## 🔍 Filter Data dari Plane

Data yang diambil dari Plane:
- **Assignee**: sesuai `assigneeId` di config
- **Status**: hanya issue dengan state group = `done`
- **Periode**: issue dengan `start_date` pada bulan & tahun yang dipilih
- **Source**: loop dari **semua project** di workspace

---

## 🛠️ Troubleshooting

**Error: Cannot connect to Plane API**
- Pastikan VPN/network bisa akses `project.tangerangkab.my.id`
- Cek API Key di `config.js`

**Error: Puppeteer / Chrome not found**
```bash
npm install puppeteer   # Re-install untuk download Chromium
```

**Tidak ada issue muncul di PDF**
- Cek apakah `assigneeId` sudah benar
- Pastikan issue memiliki `start_date` yang terisi
- Pastikan state issue termasuk group `done`

---

## 📝 Catatan

- File HTML juga disimpan di `output/` — bisa dibuka di browser untuk preview sebelum cetak
- Untuk mengubah teks Latar Belakang atau Tabel Istilah, edit file `html-template.js`
- Untuk menambah user/assignee lain, ubah `assigneeId` di `config.js`
