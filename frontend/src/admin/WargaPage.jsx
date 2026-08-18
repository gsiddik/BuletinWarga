import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, StatusPill } from "@/admin/ui";

const empty = {
  full_name: "", address: "", phone: "", email: "",
  rw_id: "", rt_id: "", roles: ["warga"], password: "",
};

export default function WargaPage() {
  const { can, user, scope } = useAuth();
  const [rows, setRows] = useState([]);
  const [rws, setRws] = useState([]);
  const [rts, setRts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => api.get("/warga").then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e)));

  useEffect(() => {
    load();
    api.get("/rw?all=true").then((r) => setRws(r.data));
    api.get("/roles").then((r) => setRoles(r.data));
  }, []);

  const activeRw = scope === "global" ? form.rw_id : user?.rw_id;

  useEffect(() => {
    if (!activeRw) return setRts([]);
    api.get(`/rt?rw_id=${activeRw}&all=true`).then((r) => setRts(r.data));
  }, [activeRw]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const rwName = (id) => rws.find((r) => r.id === id)?.name || "-";
  const rtName = (id) => rts.find((r) => r.id === id)?.name || "-";

  const openForm = (row) => {
    if (row) {
      setEditing(row);
      setForm({
        full_name: row.full_name, address: row.address || "", phone: row.phone,
        email: row.email, rw_id: row.rw_id || "", rt_id: row.rt_id || "",
        roles: row.roles || ["warga"], password: "",
      });
    } else {
      setEditing(null);
      setForm({
        ...empty,
        rw_id: scope === "global" ? "" : user?.rw_id || "",
        rt_id: scope === "rt" ? user?.rt_id || "" : "",
      });
    }
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, rw_id: form.rw_id || null, rt_id: form.rt_id || null };
      if (!payload.password) delete payload.password;
      if (editing) {
        await api.put(`/warga/${editing.id}`, payload);
        toast.success("Data warga diperbarui");
      } else {
        const { data } = await api.post("/warga", payload);
        toast.success(`Warga ditambahkan. Password default: ${data.generated_password}`, { duration: 9000 });
      }
      setOpen(false);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const act = async (fn) => { try { await fn(); load(); } catch (e) { toast.error(errMsg(e)); } };

  const toggleRole = (name) =>
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(name) ? f.roles.filter((r) => r !== name) : [...f.roles, name],
    }));

  return (
    <div>
      <PageHeader
        title="Master Data Warga"
        desc="Kelola akun warga beserta penempatan RW/RT dan rolenya."
        action={can("warga", "create") && (
          <Button data-testid="add-warga-btn" onClick={() => openForm(null)}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Warga
          </Button>
        )}
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table data-testid="warga-table">
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead><TableHead>Kontak</TableHead>
              <TableHead>RW / RT</TableHead><TableHead>Role</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} data-testid={`warga-row-${r.id}`}>
                <TableCell>
                  <p className="font-semibold">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">{r.address}</p>
                </TableCell>
                <TableCell className="text-sm">
                  <p>{r.email}</p><p className="text-muted-foreground">{r.phone}</p>
                </TableCell>
                <TableCell className="text-sm">RW {r.rw_name || "-"} / RT {r.rt_name || "-"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(r.roles || []).map((x) => <Badge key={x} variant="outline" className="rounded-full text-xs">{x}</Badge>)}
                  </div>
                </TableCell>
                <TableCell><StatusPill active={r.active} /></TableCell>
                <TableCell className="space-x-2 text-right">
                  {can("warga", "update") && (
                    <Button size="icon" variant="outline" data-testid={`edit-warga-${r.id}`} onClick={() => openForm(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {can("warga", "toggle") && (
                    <Button size="icon" variant="outline" data-testid={`toggle-warga-${r.id}`}
                      onClick={() => act(() => api.patch(`/warga/${r.id}/toggle`))}>
                      <Power className="h-4 w-4" />
                    </Button>
                  )}
                  {can("warga", "delete") && (
                    <Button size="icon" variant="outline" data-testid={`delete-warga-${r.id}`}
                      onClick={() => act(() => api.delete(`/warga/${r.id}`))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Belum ada data warga.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto bg-card" data-testid="warga-dialog">
          <DialogHeader><DialogTitle className="font-head">{editing ? "Ubah" : "Tambah"} Data Warga</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input data-testid="warga-name-input" required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input data-testid="warga-address-input" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nomor Telepon</Label>
                <Input data-testid="warga-phone-input" required value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" data-testid="warga-email-input" required value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>RW</Label>
                {scope === "global" ? (
                  <Select value={form.rw_id} onValueChange={(v) => { set("rw_id", v); set("rt_id", ""); }}>
                    <SelectTrigger data-testid="warga-rw-select"><SelectValue placeholder="Pilih RW" /></SelectTrigger>
                    <SelectContent>
                      {rws.map((r) => <SelectItem key={r.id} value={r.id}>RW {r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input readOnly className="bg-muted" data-testid="warga-rw-locked" value={`RW ${rwName(user?.rw_id)}`} />
                )}
              </div>
              <div className="space-y-2">
                <Label>RT</Label>
                {scope === "rt" ? (
                  <Input readOnly className="bg-muted" data-testid="warga-rt-locked" value={`RT ${rtName(user?.rt_id)}`} />
                ) : (
                  <Select value={form.rt_id} onValueChange={(v) => set("rt_id", v)} disabled={!activeRw}>
                    <SelectTrigger data-testid="warga-rt-select"><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                    <SelectContent>
                      {rts.map((r) => <SelectItem key={r.id} value={r.id}>RT {r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex flex-wrap gap-4 rounded-lg border border-border p-3">
                {roles.map((r) => (
                  <label key={r.name} className="flex items-center gap-2 text-xs">
                    <Checkbox data-testid={`warga-role-${r.name}`}
                      checked={form.roles.includes(r.name)} onCheckedChange={() => toggleRole(r.name)} />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password {editing ? "(kosongkan bila tidak diubah)" : "(kosongkan untuk password default otomatis)"}</Label>
              <Input data-testid="warga-password-input" value={form.password} onChange={(e) => set("password", e.target.value)}
                placeholder="[RW]_[RT]_[Nama depan]_[No]" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="warga-cancel-btn">Batal</Button>
              <Button type="submit" data-testid="warga-save-btn">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
