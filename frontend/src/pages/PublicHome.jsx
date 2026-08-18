import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, LogOut, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import ReportForm from "@/components/ReportForm";
import ReportCards from "@/components/ReportCards";
import ReportDetailDialog from "@/components/ReportDetailDialog";

export default function PublicHome() {
  const { user, isAdmin, logout, loading } = useAuth();
  const [tab, setTab] = useState("form");
  const [warga, setWarga] = useState([]);
  const [mine, setMine] = useState([]);
  const [detail, setDetail] = useState(null);

  const loadWarga = useCallback(() => {
    api.get("/reports/public").then((r) => setWarga(r.data)).catch(() => setWarga([]));
  }, []);
  const loadMine = useCallback(() => {
    if (!user) return setMine([]);
    api.get("/reports/mine").then((r) => setMine(r.data)).catch(() => setMine([]));
  }, [user]);

  useEffect(() => {
    loadWarga();
    loadMine();
  }, [loadWarga, loadMine]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" data-testid="brand-link" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Megaphone className="h-4 w-4" />
            </span>
            <span className="font-head text-lg font-extrabold tracking-tight">Buletin Warga</span>
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button asChild size="sm" data-testid="nav-dashboard-btn" className="rounded-full transition-colors">
                <Link to="/admin"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Link>
              </Button>
            )}
            {loading ? null : user ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline" data-testid="current-user-name">
                  {user.full_name}
                </span>
                <Button size="sm" variant="outline" data-testid="logout-btn" onClick={logout} className="rounded-full">
                  <LogOut className="mr-2 h-4 w-4" /> Keluar
                </Button>
              </>
            ) : (
              <Button asChild size="sm" variant="outline" data-testid="nav-login-btn" className="rounded-full">
                <Link to="/login">Masuk</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1651514645933-c26e0eb4ace3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwzfHxjb21tdW5pdHklMjBtZWV0aW5nJTIwbmVpZ2hib3Job29kfGVufDB8fHx8MTc4NzA2NzQwNXww&ixlib=rb-4.1.0&q=85"
          alt="Warga berdiskusi"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/35" />
        <div className="relative z-10 mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">Kanal resmi RT & RW</p>
          <h1 className="mt-5 max-w-2xl font-head text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Sampaikan pengaduan &amp; aspirasi lingkungan Anda.
          </h1>
          <p className="mt-6 max-w-xl text-white/85">
            Setiap laporan dicatat, dibaca pengurus, dan ditindaklanjuti secara transparan.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList data-testid="public-tabs" className="mb-10 flex h-auto w-full flex-wrap justify-start gap-2 bg-muted/70 p-1.5">
            <TabsTrigger value="form" data-testid="tab-form" className="rounded-full px-5 py-2">
              Form Pengaduan &amp; Aspirasi
            </TabsTrigger>
            <TabsTrigger value="warga" data-testid="tab-laporan-warga" className="rounded-full px-5 py-2">
              Laporan Warga
            </TabsTrigger>
            <TabsTrigger value="mine" data-testid="tab-laporan-saya" className="rounded-full px-5 py-2">
              Laporan Saya
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form">
            <div className="grid gap-12 lg:grid-cols-[1.4fr_0.6fr]">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
                <h2 className="font-head text-2xl font-extrabold tracking-tight">Formulir Laporan</h2>
                <p className="mb-8 mt-2 text-sm text-muted-foreground">
                  Lengkapi data berikut agar pengurus dapat menindaklanjuti dengan cepat.
                </p>
                {user ? (
                  <ReportForm onCreated={() => { loadMine(); loadWarga(); setTab("mine"); }} />
                ) : (
                  <div data-testid="form-login-required" className="rounded-lg border border-dashed border-border bg-muted/40 p-8 text-center">
                    <p className="font-head text-lg font-bold">Masuk untuk mengisi laporan</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Gunakan email atau nomor telepon yang terdaftar di RT/RW Anda.
                    </p>
                    <Button asChild className="mt-6 rounded-full" data-testid="form-login-btn">
                      <Link to="/login">Masuk sekarang</Link>
                    </Button>
                  </div>
                )}
              </div>
              <aside className="space-y-6">
                <img
                  src="https://images.pexels.com/photos/3720/person-hand-smartphone-technology.jpg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                  alt="Akses dari ponsel"
                  className="h-48 w-full rounded-xl object-cover"
                />
                <div className="rounded-xl bg-muted/60 p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Catatan</p>
                  <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <li>Laporan <b className="text-foreground">Anonim</b> menyamarkan nama Anda di daftar publik.</li>
                    <li>Laporan <b className="text-foreground">Rahasia</b> hanya terlihat oleh Anda dan pengurus berwenang.</li>
                    <li>Lampiran mendukung gambar dan PDF.</li>
                  </ul>
                </div>
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="warga">
            <h2 className="mb-8 font-head text-2xl font-extrabold tracking-tight">Daftar Pengaduan &amp; Aspirasi</h2>
            <ReportCards reports={warga} onOpen={(r) => setDetail(r.id)} />
          </TabsContent>

          <TabsContent value="mine">
            <h2 className="mb-8 font-head text-2xl font-extrabold tracking-tight">Laporan Saya</h2>
            {user ? (
              <ReportCards reports={mine} onOpen={(r) => setDetail(r.id)} emptyText="Anda belum mengirim laporan." />
            ) : (
              <p className="text-muted-foreground">Masuk untuk melihat laporan Anda.</p>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border bg-card py-10">
        <div className="mx-auto max-w-6xl px-5 text-sm text-muted-foreground">
          Buletin Warga — kanal pengaduan &amp; aspirasi lingkungan RT/RW.
        </div>
      </footer>

      <ReportDetailDialog
        reportId={detail}
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
      />
    </div>
  );
}
