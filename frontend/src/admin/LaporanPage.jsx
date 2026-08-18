import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errMsg, fileToAttachment, fmtDate, STATUS_STYLE } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ReportDetailDialog from "@/components/ReportDetailDialog";
import { PageHeader } from "@/admin/ui";

export default function LaporanPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({ type: "all", status: "all" });
  const [detailId, setDetailId] = useState(null);
  const [moderate, setModerate] = useState(null);
  const [fu, setFu] = useState({ date: "", description: "" });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const q = new URLSearchParams();
    if (filter.type !== "all") q.set("type", filter.type);
    if (filter.status !== "all") q.set("status", filter.status);
    api.get(`/reports/admin?${q}`).then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openModerate = async (row) => {
    try {
      const { data } = await api.get(`/reports/${row.id}?mark_read=true`);
      setModerate(data);
      setFu({ date: new Date().toISOString().slice(0, 10), description: "" });
      setFiles([]);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const submitFu = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const attachments = await Promise.all(files.map(fileToAttachment));
      await api.post(`/reports/${moderate.id}/followup`, { ...fu, attachments });
      toast.success("Tindaklanjut disimpan, status menjadi Selesai");
      setModerate(null);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader
        title="Pengaduan & Aspirasi"
        desc="Laporan warga sesuai cakupan wilayah Anda."
        action={
          <div className="flex gap-2">
            <Select value={filter.type} onValueChange={(v) => setFilter((f) => ({ ...f, type: v }))}>
              <SelectTrigger className="w-36" data-testid="filter-type-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="pengaduan">Pengaduan</SelectItem>
                <SelectItem value="aspirasi">Aspirasi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.status} onValueChange={(v) => setFilter((f) => ({ ...f, status: v }))}>
              <SelectTrigger className="w-36" data-testid="filter-status-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="baru">Baru</SelectItem>
                <SelectItem value="dibaca">Dibaca</SelectItem>
                <SelectItem value="selesai">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table data-testid="laporan-table">
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead><TableHead>Tipe</TableHead>
              <TableHead>Pengirim</TableHead><TableHead>Tujuan</TableHead>
              <TableHead>Status</TableHead><TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} data-testid={`laporan-row-${r.id}`}>
                <TableCell className="max-w-[240px]">
                  <p className="truncate font-semibold">{r.title}</p>
                  <div className="mt-1 flex gap-1">
                    {r.anonim && <Badge variant="outline" className="rounded-full text-[10px]">Anonim</Badge>}
                    {r.rahasia && <Badge variant="outline" className="rounded-full text-[10px] text-destructive"><Lock className="mr-1 h-2.5 w-2.5" />Rahasia</Badge>}
                  </div>
                </TableCell>
                <TableCell className="capitalize">{r.type}</TableCell>
                <TableCell data-testid={`laporan-sender-${r.id}`}>{r.sender_name}</TableCell>
                <TableCell className="text-sm">RW {r.target_rw_name}{r.target_rt_name ? ` / RT ${r.target_rt_name}` : ""}</TableCell>
                <TableCell>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                </TableCell>
                <TableCell className="text-sm">{fmtDate(r.created_at)}</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button size="icon" variant="outline" data-testid={`view-laporan-${r.id}`} onClick={() => setDetailId(r.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {r.type === "pengaduan" && can("laporan", "moderate") && (
                    <Button size="icon" variant="outline" data-testid={`moderate-laporan-${r.id}`} onClick={() => openModerate(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Belum ada laporan.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ReportDetailDialog
        reportId={detailId} open={!!detailId} markRead
        onOpenChange={(v) => !v && setDetailId(null)} onChanged={load}
      />

      <Dialog open={!!moderate} onOpenChange={(v) => !v && setModerate(null)}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto bg-card" data-testid="moderate-dialog">
          <DialogHeader><DialogTitle className="font-head">Moderasi & Tindaklanjut</DialogTitle></DialogHeader>
          {moderate && (
            <>
              <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
                <p className="font-head text-base font-bold">{moderate.title}</p>
                <p className="text-muted-foreground">Pengirim: <b className="text-foreground">{moderate.sender_name}</b> · {moderate.category_name}</p>
                <p className="whitespace-pre-wrap">{moderate.body}</p>
              </div>
              <form onSubmit={submitFu} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tanggal Tindaklanjut</Label>
                  <Input type="date" required data-testid="followup-date-input" value={fu.date}
                    onChange={(e) => setFu((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <Textarea rows={4} required data-testid="followup-desc-input" value={fu.description}
                    onChange={(e) => setFu((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Lampiran Tindaklanjut (gambar / PDF)</Label>
                  <Input type="file" multiple accept="image/*,application/pdf" data-testid="followup-file-input"
                    onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setModerate(null)} data-testid="followup-cancel-btn">Batal</Button>
                  <Button type="submit" disabled={busy} data-testid="followup-save-btn">Simpan</Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
