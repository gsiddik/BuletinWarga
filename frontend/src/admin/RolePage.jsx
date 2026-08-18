import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/admin/ui";

const ACTION_LABEL = {
  create: "Create", read: "Read", update: "Update",
  delete: "Soft Delete", toggle: "Aktif/Nonaktif", moderate: "Moderasi",
};

const SCOPES = [
  { value: "global", label: "Seluruh aplikasi" },
  { value: "rw", label: "Sebatas RW" },
  { value: "rt", label: "Sebatas RT" },
  { value: "self", label: "Hanya data sendiri" },
];

export default function RolePage() {
  const { can } = useAuth();
  const [roles, setRoles] = useState([]);
  const [meta, setMeta] = useState({ features: [], actions: [] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", label: "", scope: "self", permissions: {} });

  const load = () => api.get("/roles").then((r) => setRoles(r.data));
  useEffect(() => {
    load();
    api.get("/features").then((r) => setMeta(r.data));
  }, []);

  const togglePerm = (feature, action) =>
    setForm((f) => {
      const cur = new Set(f.permissions[feature] || []);
      cur.has(action) ? cur.delete(action) : cur.add(action);
      return { ...f, permissions: { ...f.permissions, [feature]: Array.from(cur) } };
    });

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/roles/${editing.id}`, form);
      else await api.post("/roles", form);
      toast.success("Role disimpan");
      setOpen(false);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const availableActions = (featKey) =>
    featKey === "laporan" ? meta.actions : meta.actions.filter((a) => a !== "moderate");

  return (
    <div>
      <PageHeader
        title="Role & Permission"
        desc="Atur hak akses dinamis per fitur untuk setiap role."
        action={can("role", "create") && (
          <Button data-testid="add-role-btn"
            onClick={() => { setEditing(null); setForm({ name: "", label: "", scope: "self", permissions: {} }); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Role
          </Button>
        )}
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table data-testid="role-table">
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead><TableHead>Cakupan</TableHead>
              <TableHead>Permission</TableHead><TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((r) => (
              <TableRow key={r.id} data-testid={`role-row-${r.name}`}>
                <TableCell>
                  <p className="font-semibold">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.name}{r.is_system ? " · bawaan" : ""}</p>
                </TableCell>
                <TableCell className="text-sm">{SCOPES.find((s) => s.value === r.scope)?.label || r.scope}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(r.permissions || {}).map(([f, acts]) => (
                      <Badge key={f} variant="outline" className="rounded-full text-xs">
                        {f}: {acts.length}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  {can("role", "update") && r.name !== "superadmin" && (
                    <Button size="icon" variant="outline" data-testid={`edit-role-${r.name}`}
                      onClick={() => { setEditing(r); setForm({ name: r.name, label: r.label, scope: r.scope || "self", permissions: r.permissions || {} }); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {can("role", "delete") && !r.is_system && (
                    <Button size="icon" variant="outline" data-testid={`delete-role-${r.name}`}
                      onClick={async () => { try { await api.delete(`/roles/${r.id}`); load(); } catch (e) { toast.error(errMsg(e)); } }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto bg-card" data-testid="role-dialog">
          <DialogHeader><DialogTitle className="font-head">{editing ? "Ubah" : "Tambah"} Role</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nama Role (kode)</Label>
                <Input data-testid="role-name-input" required disabled={!!editing}
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="sekretaris_rw" />
              </div>
              <div className="space-y-2">
                <Label>Label Tampilan</Label>
                <Input data-testid="role-label-input" required value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Sekretaris RW" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cakupan Data</Label>
              <Select value={form.scope} onValueChange={(v) => setForm((f) => ({ ...f, scope: v }))}>
                <SelectTrigger data-testid="role-scope-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Permission per Fitur</Label>
              {meta.features.map((f) => (
                <div key={f.key} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold">{f.label}</p>
                  <div className="mt-3 flex flex-wrap gap-4">
                    {availableActions(f.key).map((a) => (
                      <label key={a} className="flex items-center gap-2 text-xs">
                        <Checkbox
                          data-testid={`perm-${f.key}-${a}`}
                          checked={(form.permissions[f.key] || []).includes(a)}
                          onCheckedChange={() => togglePerm(f.key, a)}
                        />
                        {ACTION_LABEL[a]}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="role-cancel-btn">Batal</Button>
              <Button type="submit" data-testid="role-save-btn">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
