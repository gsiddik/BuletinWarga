import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { CheckCircle2, Eye, Inbox, Lightbulb, Users } from "lucide-react";
import { api } from "@/lib/api";

const Stat = ({ label, value, icon: Icon, tone = "bg-primary/10 text-primary", testid }) => (
  <div className="rounded-lg border border-border bg-card p-5" data-testid={testid}>
    <div className="flex items-start justify-between">
      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <span className={`grid h-8 w-8 place-items-center rounded-md ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <p className="mt-4 font-head text-3xl font-extrabold tracking-tight">{value ?? 0}</p>
  </div>
);

export default function DashboardPage() {
  const [s, setS] = useState({});

  useEffect(() => {
    api.get("/reports/stats").then((r) => setS(r.data)).catch(() => {});
  }, []);

  const chart = [
    { name: "Baru", Pengaduan: s.pengaduan_baru || 0, Aspirasi: s.aspirasi_baru || 0 },
    { name: "Dibaca", Pengaduan: s.pengaduan_dibaca || 0, Aspirasi: s.aspirasi_dibaca || 0 },
    { name: "Selesai", Pengaduan: s.pengaduan_selesai || 0, Aspirasi: 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-head text-2xl font-extrabold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ringkasan laporan sesuai cakupan wilayah Anda.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat testid="stat-pengaduan-total" label="Pengaduan Masuk" value={s.pengaduan_total} icon={Inbox} />
        <Stat testid="stat-pengaduan-dibaca" label="Pengaduan Dibaca" value={s.pengaduan_dibaca} icon={Eye} tone="bg-blue-100 text-blue-700" />
        <Stat testid="stat-pengaduan-selesai" label="Pengaduan Selesai" value={s.pengaduan_selesai} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-700" />
        <Stat testid="stat-aspirasi-total" label="Aspirasi Masuk" value={s.aspirasi_total} icon={Lightbulb} tone="bg-amber-100 text-amber-700" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-head text-lg font-bold">Distribusi Status Laporan</h2>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e9e2" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="Pengaduan" fill="#2C5F2D" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Aspirasi" fill="#97BC62" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <Stat testid="stat-warga-total" label="Total Warga Terdaftar" value={s.warga_total} icon={Users} tone="bg-secondary/30 text-primary" />
      </div>
    </div>
  );
}
