import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, StatusPill } from "@/admin/ui";

export default function RTPage() {
  const { can, user, scope } = useAuth();
  const [rows, setRows] = useState([]);
  const [rws, setRws] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", rw_id: "" });

  const load = () => api.get("/rt?all=true").then((r) => setRows(r.data));
  useEffect(() => {
    load();
    api.get("/rw?all=true").then((r) => setRws(r.data));
  }, []);

  const rwName = (id) => rws.find((r) => r.id === id)?.name || "-";
  const lockedRw = scope !== "global" ? user?.rw_id : null;

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { name: form.name, rw_id: lockedRw || form.rw_id };
      if (editing) await api.put(`/rt/${editing.id}`, payload);
      else await api.post("/rt", payload);
      toast.success("Data RT disimpan");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Master Data RT"
        desc="Kelola daftar RT pada setiap RW."
        action={
          can("rt", "create") && (
            <Button data-testid="add-rt-btn" onClick={() => { setEditing(null); setForm({ name: "", rw_id: lockedRw || "" }); setOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Tambah RT
            </Button>
          )
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table data-testid="rt-table">
          <TableHeader>
            <TableRow>
              <TableHead>RT</TableHead><TableHead>RW</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} data-testid={`rt-row-${r.id}`}>
                <TableCell className="font-semibold">RT {r.name}</TableCell>
                <TableCell>RW {rwName(r.rw_id)}</TableCell>
                <TableCell><StatusPill active={r.active} /></TableCell>
                <TableCell className="space-x-2 text-right">
                  {can("rt", "update") && (
                    <Button size="icon" variant="outline" data-testid={`edit-rt-${r.id}`}
                      onClick={() => { setEditing(r); setForm({ name: r.name, rw_id: r.rw_id }); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {can("rt", "toggle") && (
                    <Button size="icon" variant="outline" data-testid={`toggle-rt-${r.id}`}
                      onClick={async () => { try { await api.patch(`/rt/${r.id}/toggle`); load(); } catch (e) { toast.error(errMsg(e)); } }}>
                      <Power className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Belum ada data RT.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card" data-testid="rt-dialog">
          <DialogHeader><DialogTitle className="font-head">{editing ? "Ubah" : "Tambah"} Data RT</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>RW</Label>
              {lockedRw ? (
                <Input value={`RW ${rwName(lockedRw)}`} readOnly data-testid="rt-rw-locked" className="bg-muted" />
              ) : (
                <Select value={form.rw_id} onValueChange={(v) => setForm((f) => ({ ...f, rw_id: v }))}>
                  <SelectTrigger data-testid="rt-rw-select"><SelectValue placeholder="Pilih RW" /></SelectTrigger>
                  <SelectContent>
                    {rws.map((r) => <SelectItem key={r.id} value={r.id}>RW {r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Nama RT</Label>
              <Input data-testid="rt-name-input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="003" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="rt-cancel-btn">Batal</Button>
              <Button type="submit" data-testid="rt-save-btn">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
