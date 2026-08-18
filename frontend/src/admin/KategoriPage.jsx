import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, StatusPill } from "@/admin/ui";

export default function KategoriPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");

  const load = () => api.get("/kategori?all=true").then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/kategori/${editing.id}`, { name });
      else await api.post("/kategori", { name });
      toast.success("Kategori disimpan");
      setOpen(false);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const act = async (fn) => {
    try { await fn(); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div>
      <PageHeader
        title="Master Kategori Laporan"
        desc="Kategori yang dapat dipilih warga saat mengirim laporan."
        action={can("kategori", "create") && (
          <Button data-testid="add-kategori-btn" onClick={() => { setEditing(null); setName(""); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Kategori
          </Button>
        )}
      />
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table data-testid="kategori-table">
          <TableHeader>
            <TableRow><TableHead>Nama Kategori</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} data-testid={`kategori-row-${r.id}`}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><StatusPill active={r.active} /></TableCell>
                <TableCell className="space-x-2 text-right">
                  {can("kategori", "update") && (
                    <Button size="icon" variant="outline" data-testid={`edit-kategori-${r.id}`}
                      onClick={() => { setEditing(r); setName(r.name); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {can("kategori", "toggle") && (
                    <Button size="icon" variant="outline" data-testid={`toggle-kategori-${r.id}`}
                      onClick={() => act(() => api.patch(`/kategori/${r.id}/toggle`))}>
                      <Power className="h-4 w-4" />
                    </Button>
                  )}
                  {can("kategori", "delete") && (
                    <Button size="icon" variant="outline" data-testid={`delete-kategori-${r.id}`}
                      onClick={() => act(() => api.delete(`/kategori/${r.id}`))}>
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
        <DialogContent className="bg-card" data-testid="kategori-dialog">
          <DialogHeader><DialogTitle className="font-head">{editing ? "Ubah" : "Tambah"} Kategori</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Kategori</Label>
              <Input data-testid="kategori-name-input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="kategori-cancel-btn">Batal</Button>
              <Button type="submit" data-testid="kategori-save-btn">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
