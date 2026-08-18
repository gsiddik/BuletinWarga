import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Building2, ClipboardList, Home, LogOut, Megaphone, Menu, ShieldCheck,
  Tags, Users, UserCog, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: Home, end: true },
  { to: "/admin/rw", label: "Master RW", icon: Building2, feature: "rw" },
  { to: "/admin/rt", label: "Master RT", icon: Building2, feature: "rt" },
  { to: "/admin/role", label: "Role & Permission", icon: ShieldCheck, feature: "role" },
  { to: "/admin/warga", label: "Master Warga", icon: Users, feature: "warga" },
  { to: "/admin/pengurus", label: "Master Pengurus", icon: UserCog, feature: "pengurus" },
  { to: "/admin/kategori", label: "Kategori Laporan", icon: Tags, feature: "kategori" },
  { to: "/admin/laporan", label: "Pengaduan & Aspirasi", icon: ClipboardList, feature: "laporan" },
];

export default function AdminLayout() {
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => !n.feature || can(n.feature, "read"));

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside
        data-testid="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card p-5 transition-transform duration-200 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Megaphone className="h-4 w-4" />
            </span>
            <span className="font-head text-base font-extrabold tracking-tight">Panel Pengurus</span>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} data-testid="sidebar-close-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
              data-testid={`nav-${n.to.split("/").pop()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`
              }
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-8 rounded-lg bg-muted/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Masuk sebagai</p>
          <p className="mt-2 font-head font-bold" data-testid="admin-current-user">{user?.full_name}</p>
          <p className="text-xs text-muted-foreground">{(user?.roles || []).join(", ")}</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 lg:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)} data-testid="sidebar-open-btn">
            <Menu className="h-5 w-5" />
          </button>
          <p className="hidden font-head text-sm font-semibold text-muted-foreground sm:block">
            Pengelolaan Pengaduan &amp; Aspirasi Warga
          </p>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" data-testid="nav-buletin-btn" className="rounded-md transition-colors">
              <Link to="/"><Megaphone className="mr-2 h-4 w-4" /> Buletin</Link>
            </Button>
            <Button
              size="sm" variant="outline" data-testid="admin-logout-btn"
              onClick={async () => { await logout(); navigate("/"); }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Keluar
            </Button>
          </div>
        </header>
        <main className="p-4 lg:p-6" data-testid="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
