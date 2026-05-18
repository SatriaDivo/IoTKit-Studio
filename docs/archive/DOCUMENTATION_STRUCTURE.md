# Documentation Structure

Struktur dokumentasi IoTKit-Studio yang terorganisir dengan baik.

## 📁 Struktur Folder

```
docs/
├── README.md                      # Navigation utama
│
├── ai/                            # 🤖 AI Agent Documentation
│   ├── README.md                  # Overview AI Agent
│   ├── SETUP.md                   # Setup OpenRouter API key
│   ├── USAGE_GUIDE.md             # Panduan penggunaan lengkap
│   └── STATUS.md                  # Status implementasi
│
├── features/                      # 🎯 Features Documentation
│   └── README.md                  # Overview fitur-fitur
│
├── projects/                      # 📦 Projects Documentation
│   └── README.md                  # Overview project management
│
├── API.md                         # 📡 API Documentation
├── CONTRIBUTING.md                # 🤝 Contributing Guidelines
├── DEVELOPMENT.md                 # 🛠️ Development Guide
├── DEV_SUMMARY.md                 # 📊 Development Summary
├── GET_STARTED.md                 # 🚀 Getting Started
├── INDEX.md                       # 📑 Documentation Index
├── POSTGRES_SETUP.md              # 🗄️ Database Setup
├── QUICK_REFERENCE.md             # ⚡ Quick Reference
└── START_DEV.md                   # 🏃 Quick Start
```

## 📚 Kategori Dokumentasi

### 🤖 AI Agent (`ai/`)

Dokumentasi lengkap untuk fitur AI Agent:

- Setup dan konfigurasi
- Panduan penggunaan
- Status implementasi
- Troubleshooting

### 🎯 Features (`features/`)

Dokumentasi untuk semua fitur aplikasi:

- Projects Management
- Payload Builder
- Simulation
- Logs & Monitoring
- Dashboard
- Analytics

### 📦 Projects (`projects/`)

Dokumentasi khusus untuk project management:

- Project creation
- Configuration
- Protocol setup
- Best practices

### 📖 Core Documentation (Root)

Dokumentasi inti untuk development:

- Getting Started
- Development Guide
- API Reference
- Database Setup
- Quick Reference

## 🎯 Cara Menggunakan

### Untuk User Baru

1. Mulai dari [GET_STARTED.md](./GET_STARTED.md)
2. Baca [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
3. Explore [ai/](./ai/) untuk AI Agent

### Untuk Developer

1. Baca [DEVELOPMENT.md](./DEVELOPMENT.md)
2. Setup database: [POSTGRES_SETUP.md](./POSTGRES_SETUP.md)
3. Lihat [API.md](./API.md) untuk API reference

### Untuk Contributor

1. Baca [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Follow development guide
3. Submit PR dengan dokumentasi

## 📝 Naming Convention

### File Names

- `README.md` - Overview/navigation untuk folder
- `SETUP.md` - Setup dan konfigurasi
- `USAGE_GUIDE.md` - Panduan penggunaan
- `STATUS.md` - Status implementasi
- `UPPERCASE_WITH_UNDERSCORES.md` - Dokumentasi utama

### Folder Names

- `lowercase-with-dashes` - Folder untuk kategori
- Singular form (e.g., `ai/` bukan `ais/`)
- Descriptive names (e.g., `features/` bukan `feat/`)

## ✅ Documentation Checklist

Setiap dokumentasi harus memiliki:

- [ ] Clear title dan description
- [ ] Table of contents (untuk doc panjang)
- [ ] Code examples (jika applicable)
- [ ] Links ke related documentation
- [ ] Last updated date
- [ ] Version information

## 🔄 Maintenance

### Update Documentation

1. Update file yang relevan
2. Update `Last Updated` date
3. Update links jika ada perubahan struktur
4. Test semua links

### Add New Documentation

1. Tentukan kategori (ai, features, projects, atau root)
2. Buat file dengan naming convention yang benar
3. Update README.md di folder tersebut
4. Update main [README.md](./README.md)
5. Update [INDEX.md](./INDEX.md)

## 🎉 Benefits

### Organized Structure

✅ Mudah menemukan dokumentasi
✅ Kategori yang jelas
✅ Tidak ada file scattered di root

### Easy Navigation

✅ README.md di setiap folder
✅ Clear links antar dokumentasi
✅ Breadcrumb navigation

### Scalable

✅ Mudah menambah kategori baru
✅ Mudah menambah dokumentasi baru
✅ Tidak perlu refactor besar

### Professional

✅ Struktur yang rapi
✅ Konsisten naming
✅ Easy to maintain

---

**Version**: 1.0.0  
**Last Updated**: 2026-05-12  
**© 2026 IoTKit-Studio**
