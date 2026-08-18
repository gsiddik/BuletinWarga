import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/admin/ui";

export default function PengurusPage() {
  const { can, user, scope } = useAuth();
  const level = scope === "global" ? "rw" : "rt";
  const [rows, setRows] = useState([]);
  const [rws, setRws] = useState([]);
  const [rts, setRts] = useState([]);
  const [wargas, setWargas] = useState([]);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ rw_id: "", rt_id: "", ketua_user_id: "", members: [] });

  const load = () => api.get("/pengurus").then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e)));

  useEffect(() => {
    load();
    api.get("/rw?all=true").then((r) => setRws(r.data));
    if (level === "rt") api.get(`/rt?rw_id=${user?.rw_id}&all=true`).then((r) => setRts(r.data));
  }, [level, user?.rw_id]);

  const targetRw = level === "rw" ? form.rw_id : user?.rw_id;

  useEffect(() => {
    const params = level === "rw" ? (targetRw ? `?rw_id=${targetRw}` : null) : (form.rt_id ? `?rt_id=${form.rt_id}` : null);
    if (!params) return setWargas([]);
    api.get(`/warga${params}`).then((r) => setWargas(r.data)).catch(() => setWargas([]));
  }, [level, targetRw, form.rt_id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openForm = (row) => {
    if (row) {
      setEditing(row);
      setForm({ rw_id: row.rw_id || "", rt_id: row.rt_id || "", ketua_user_id: row.ketua_user_id || "",
        members: (row.members || []).map((m) => ({ jabatan: m.jabatan, user_id: m.user_id })) });
    } else {
      setEditing(null);
      setForm({ rw_id: level === "rw" ? "" : user?.rw_id || "", rt_id: "", ketua_user_id: "", members: [] });
    }
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        level, rw_id: level === "rw" ? form.rw_id : user?.rw_id,
        rt_id: level === "rt" ? form.rt_id : null,
        ketua_user_id: form.ketua_user_id,
        members: form.members.filter((m) => m.jabatan && m.user_id),
      };
      if (editing) await api.put(`/pengurus/${editing.id}`, payload);
      else await api.post("/pengurus", payload);
      toast.success("Data pengurus disimpan, role telah diperbarui");
      setOpen(false);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const wargaOptions = useMemo(() => wargas, [wargas]);

  return (
    <div>
      <PageHeader
        title="Master Data Pengurus"
        desc={level === "rw" ? "Daftar pengurus RW. Setiap pengurus otomatis mendapat role Admin RW." : "Daftar pengurus RT. Setiap pengurus otomatis mendapat role Admin RT."}
        action={can("pengurus", "create") && (
          <Button data-testid="add-pengurus-btn" onClick={() => openForm(null)}>
            <Plus className="mr-2 h-4 w-4" /> Tambah
          </Button>
        )}
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table data-testid="pengurus-table">
          <TableHeader>
            <TableRow>
              <TableHead>Wilayah</TableHead><TableHead>Ketua</TableHead>
              <TableHead>Jumlah Pengurus</TableHead><TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} data-testid={`pengurus-row-${r.id}`}>
                <TableCell className="font-semibold">
                  RW {r.rw_name}{r.rt_name ? ` / RT ${r.rt_name}` : ""}
                </TableCell>
                <TableCell>{r.ketua_name || "-"}</TableCell>
                <TableCell>{(r.members || []).length + 1} orang</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button size="icon" variant="outline" data-testid={`view-pengurus-${r.id}`} onClick={() => setViewing(r)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {can("pengurus", "update") && (
                    <Button size="icon" variant="outline" data-testid={`edit-pengurus-${r.id}`} onClick={() => openForm(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Belum ada data pengurus.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto bg-card" data-testid="pengurus-dialog">
          <DialogHeader>
            <DialogTitle className="font-head">{editing ? "Ubah" : "Tambah"} Pengurus {level.toUpperCase()}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            {level === "rw" ? (
              <div className="space-y-2">
                <Label>RW</Label>
                <Select value={form.rw_id} onValueChange={(v) => { set("rw_id", v); set("ketua_user_id", ""); }}>
                  <SelectTrigger data-testid="pengurus-rw-select"><SelectValue placeholder="Pilih RW" /></SelectTrigger>
                  <SelectContent>{rws.map((r) => <SelectItem key={r.id} value={r.id}>RW {r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>RT</Label>
                <Select value={form.rt_id} onValueChange={(v) => { set("rt_id", v); set("ketua_user_id", ""); }}>
                  <SelectTrigger data-testid="pengurus-rt-select"><SelectValue placeholder="Pilih RT" /></SelectTrigger>
                  <SelectContent>{rts.map((r) => <SelectItem key={r.id} value={r.id}>RT {r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Ketua</Label>
              <Select value={form.ketua_user_id} onValueChange={(v) => set("ketua_user_id", v)}>
                <SelectTrigger data-testid="pengurus-ketua-select"><SelectValue placeholder="Pilih warga" /></SelectTrigger>
                <SelectContent>
                  {wargaOptions.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Jabatan di bawah Ketua</Label>
              {form.members.map((m, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input placeholder="Jabatan" data-testid={`pengurus-jabatan-${i}`} value={m.jabatan}
                    onChange={(e) => setForm((f) => {
                      const members = [...f.members]; members[i] = { ...members[i], jabatan: e.target.value }; return { ...f, members };
                    })} />
                  <Select value={m.user_id} onValueChange={(v) => setForm((f) => {
                    const members = [...f.members]; members[i] = { ...members[i], user_id: v }; return { ...f, members };
                  })}>
                    <SelectTrigger data-testid={`pengurus-member-${i}`}><SelectValue placeholder="Pilih warga" /></SelectTrigger>
                    <SelectContent>
                      {wargaOptions.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="icon" variant="outline" data-testid={`pengurus-remove-${i}`}
                    onClick={() => setForm((f) => ({ ...f, members: f.members.filter((_, j) => j !== i) }))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" data-testid="pengurus-add-row-btn"
                onClick={() => setForm((f) => ({ ...f, members: [...f.members, { jabatan: "", user_id: "" }] }))}>
                <Plus className="mr-2 h-4 w-4" /> Tambah Jabatan
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="pengurus-cancel-btn">Batal</Button>
              <Button type="submit" data-testid="pengurus-save-btn">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="bg-card" data-testid="pengurus-view-dialog">
          <DialogHeader><DialogTitle className="font-head">Detail Pengurus</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Wilayah:</span> RW {viewing.rw_name}{viewing.rt_name ? ` / RT ${viewing.rt_name}` : ""}</p>
              <p><span className="text-muted-foreground">Ketua:</span> <b>{viewing.ketua_name}</b></p>
              <div className="rounded-lg border border-border">
                {(viewing.members || []).map((m, i) => (
                  <div key={i} className="flex justify-between border-b border-border px-4 py-2 last:border-0">
                    <span className="text-muted-foreground">{m.jabatan}</span><span>{m.name}</span>
                  </div>
                ))}
                {!(viewing.members || []).length && <p className="px-4 py-3 text-muted-foreground">Tidak ada pengurus tambahan.</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
