# FAZA.AI — Panduan Setup

## File yang Dibutuhkan
- `index.html` — Halaman utama website
- `style.css` — Stylesheet futuristik biru muda
- `script.js` — Logika frontend + koneksi API
- `server.py` — Backend Python Flask

---

## Cara Menjalankan

### 1. Install Python Dependencies
```bash
pip install flask flask-cors anthropic python-dotenv
```

### 2. Konfigurasi API Key
Buat file `.env` di folder yang sama:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxx
PORT=5000
DEBUG=false
```

### 3. Jalankan Server
```bash
python server.py
```

### 4. Buka Website
Buka `index.html` di browser, atau gunakan Live Server VS Code.

---

## Fitur Lengkap
- ✅ Chat AI dengan streaming real-time
- ✅ Riwayat percakapan (tersimpan lokal)
- ✅ Multi-model (v2.5, v3, Nano)
- ✅ Upload file & drag-drop
- ✅ Voice input (Web Speech API)
- ✅ Dark/Light mode
- ✅ Export percakapan
- ✅ Markdown rendering + syntax highlight
- ✅ Copy kode, regenerate, hapus pesan
- ✅ Keyboard shortcuts (Ctrl+K = chat baru)
- ✅ Rate limiting & error handling
- ✅ Responsive mobile

## API Endpoints
| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/` | Info server |
| GET | `/health` | Health check |
| GET | `/models` | Daftar model |
| POST | `/chat` | Chat non-streaming |
| POST | `/chat/stream` | Chat streaming (SSE) |
| POST | `/summarize` | Ringkas teks |
| POST | `/translate` | Terjemahkan teks |
| POST | `/generate-title` | Generate judul chat |
