# PRD — Buletin Warga (Pengaduan & Aspirasi RW/RT)

## Problem Statement (original, ringkas)
Aplikasi web responsif agar warga RW/RT dapat mengirim pengaduan dan aspirasi. Terdiri dari halaman
publik (login, form pengaduan/aspirasi, daftar laporan) dan Admin Panel (dashboard, master data RW,
RT, Role & Permission dinamis, Warga, Pengurus, Kategori Laporan, serta moderasi laporan dengan form
tindaklanjut). Role: Superadmin, Admin RW, Admin RT, Warga. Tag Anonim & Rahasia. Logout hapus sesi.

## Arsitektur
- Backend: FastAPI (`/app/backend/server.py`), MongoDB (motor), JWT (PyJWT) + bcrypt, semua route `/api`.
- Frontend: React 19 + CRA, Tailwind + shadcn/ui, react-router, recharts, sonner.
- Lampiran disimpan sebagai base64 (data URL) di dokumen laporan.
- Auth: login dengan email ATAU nomor telepon; token Bearer (localStorage) + httpOnly cookie.
- Permission dinamis: collection `roles` -> `permissions {feature: [create, read, update, delete, toggle, moderate]}`
  + `scope` (global / rw / rt / self) yang menentukan cakupan data.

## User Personas
- Superadmin: mengelola seluruh proses bisnis & seluruh wilayah.
- Admin RW: mengelola RT di bawahnya, warga, pengurus RT, moderasi laporan RW-nya.
- Admin RT: mengelola warga RT-nya, moderasi laporan RT-nya.
- Warga: mengirim laporan, melihat laporan warga (non-rahasia, sesuai RW/RT) dan laporan sendiri.

## Implemented (18 Jun 2026)
- Login email/telepon, logout, seeding Superadmin, seed 16 kategori & 4 role bawaan.
- Master RW (validasi 1-3 digit angka), RT, Warga (soft delete, aktif/nonaktif, password default
  `[RW]_[RT]_[NamaDepan]_[increment]`), Kategori, Pengurus (RW oleh Superadmin, RT oleh Admin RW,
  otomatis menaikkan role), Role & Permission matrix dinamis.
- Halaman publik: hero, tab Form / Laporan Warga / Laporan Saya, badge status, penyamaran nama Anonim,
  laporan Rahasia disembunyikan dari publik.
- Admin: dashboard statistik + chart, daftar laporan berscope, View (auto ubah Baru→Dibaca),
  Pensil → form tindaklanjut (tanggal, deskripsi, lampiran) → status Selesai.
- Tombol Buletin (admin → publik) dan Dashboard (publik → admin). Mobile responsive.

## Backlog
- P0: — (tidak ada blocker diketahui)
- P1: notifikasi email tindaklanjut (Resend), ekspor laporan ke Excel/PDF, pencarian & pagination tabel.
- P2: statistik per kategori, riwayat audit perubahan status, impor massal data warga (CSV).
