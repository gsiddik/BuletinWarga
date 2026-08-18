import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, StatusPill } from "@/admin/ui";

const empty = { name: "", provinsi: "", kota: "", kecamatan: "", kelurahan: "" };

export default function RWPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = () => api.get("/rw?all=true").then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/rw/${editing.id}`, form);
      else await api.post("/rw", form);
      toast.success("Data RW disimpan");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const toggle = async (row) => {
    try {
      await api.patch(`/rw/${row.id}/toggle`);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <PageHeader
        title="Master Data RW"
        desc="Kelola data Rukun Warga beserta wilayah administratifnya."
        action={
          can("rw", "create") && (
            <Button data-testid="add-rw-btn" onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Tambah RW
            </Button>
          )
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table data-testid="rw-table">
          <TableHeader>
            <TableRow>
              <TableHead>RW</TableHead>
              <TableHead>Kelurahan</TableHead>
              <TableHead>Kecamatan</TableHead>
              <TableHead>Kota/Kabupaten</TableHead>
              <TableHead>Provinsi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} data-testid={`rw-row-${r.id}`}>
                <TableCell className="font-semibold">RW {r.name}</TableCell>
                <TableCell>{r.kelurahan}</TableCell>
                <TableCell>{r.kecamatan}</TableCell>
                <TableCell>{r.kota}</TableCell>
                <TableCell>{r.provinsi}</TableCell>
                <TableCell><StatusPill active={r.active} /></TableCell>
                <TableCell className="space-x-2 text-right">
                  {can("rw", "update") && (
                    <Button size="icon" variant="outline" data-testid={`edit-rw-${r.id}`}
                      onClick={() => { setEditing(r); setForm({ name: r.name, provinsi: r.provinsi, kota: r.kota, kecamatan: r.kecamatan, kelurahan: r.kelurahan }); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {can("rw", "toggle") && (
                    <Button size="icon" variant="outline" data-testid={`toggle-rw-${r.id}`} onClick={() => toggle(r)}>
                      <Power className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Belum ada data RW.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card" data-testid="rw-dialog">
          <DialogHeader><DialogTitle className="font-head">{editing ? "Ubah" : "Tambah"} Data RW</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama RW (1-3 digit angka)</Label>
              <Input data-testid="rw-name-input" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="007" />
            </div>
            {[["provinsi", "Provinsi"], ["kota", "Kota / Kabupaten"], ["kecamatan", "Kecamatan"], ["kelurahan", "Kelurahan"]].map(([k, l]) => (
              <div className="space-y-2" key={k}>
                <Label>{l}</Label>
                <Input data-testid={`rw-${k}-input`} required value={form[k]} onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="rw-cancel-btn">Batal</Button>
              <Button type="submit" data-testid="rw-save-btn">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
