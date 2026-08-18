import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api, errMsg, fileToAttachment } from "@/lib/api";

const empty = {
  type: "pengaduan", title: "", body: "", incident_date: "", location: "",
  target_rw_id: "", target_rt_id: "", category_id: "", anonim: false, rahasia: false,
};

export const ReportForm = ({ onCreated }) => {
  const [form, setForm] = useState(empty);
  const [rws, setRws] = useState([]);
  const [rts, setRts] = useState([]);
  const [cats, setCats] = useState([]);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/rw").then((r) => setRws(r.data));
    api.get("/kategori").then((r) => setCats(r.data));
  }, []);

  useEffect(() => {
    if (!form.target_rw_id) return setRts([]);
    api.get(`/rt?rw_id=${form.target_rw_id}`).then((r) => setRts(r.data));
  }, [form.target_rw_id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const attachments = await Promise.all(files.map(fileToAttachment));
      await api.post("/reports", {
        ...form,
        target_rt_id: form.target_rt_id || null,
        attachments,
      });
      toast.success("Laporan berhasil dikirim");
      setForm(empty);
      setFiles([]);
      onCreated?.();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} data-testid="report-form" className="space-y-7">
      <div className="space-y-3">
        <Label>Tipe Laporan</Label>
        <RadioGroup
          value={form.type}
          onValueChange={(v) => set("type", v)}
          className="flex gap-6"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="pengaduan" data-testid="report-type-pengaduan" /> Pengaduan
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="aspirasi" data-testid="report-type-aspirasi" /> Aspirasi
          </label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Judul Laporan</Label>
        <Input
          id="title" maxLength={255} required data-testid="report-title-input"
          className="bg-muted/50"
          value={form.title} onChange={(e) => set("title", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Isi Laporan</Label>
        <Textarea
          id="body" maxLength={3000} rows={6} required data-testid="report-body-input"
          className="bg-muted/50"
          value={form.body} onChange={(e) => set("body", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{form.body.length}/3000 karakter</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="incident_date">Tanggal Kejadian</Label>
          <Input
            id="incident_date" type="date" required data-testid="report-date-input"
            className="bg-muted/50"
            value={form.incident_date} onChange={(e) => set("incident_date", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Lokasi Kejadian</Label>
          <Input
            id="location" data-testid="report-location-input" className="bg-muted/50"
            value={form.location} onChange={(e) => set("location", e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Ditujukan kepada (RW)</Label>
          <Select value={form.target_rw_id} onValueChange={(v) => { set("target_rw_id", v); set("target_rt_id", ""); }}>
            <SelectTrigger data-testid="report-rw-select" className="bg-muted/50">
              <SelectValue placeholder="Pilih RW" />
            </SelectTrigger>
            <SelectContent>
              {rws.map((r) => (
                <SelectItem key={r.id} value={r.id}>RW {r.name} — {r.kelurahan}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Ditujukan kepada (RT) — opsional</Label>
          <Select value={form.target_rt_id} onValueChange={(v) => set("target_rt_id", v)} disabled={!form.target_rw_id}>
            <SelectTrigger data-testid="report-rt-select" className="bg-muted/50">
              <SelectValue placeholder="Pilih RT" />
            </SelectTrigger>
            <SelectContent>
              {rts.map((r) => (
                <SelectItem key={r.id} value={r.id}>RT {r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Kategori Laporan</Label>
        <Select value={form.category_id} onValueChange={(v) => set("category_id", v)}>
          <SelectTrigger data-testid="report-category-select" className="bg-muted/50">
            <SelectValue placeholder="Pilih kategori" />
          </SelectTrigger>
          <SelectContent>
            {cats.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="attachments" className="flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Upload Lampiran (gambar / PDF)
        </Label>
        <Input
          id="attachments" type="file" multiple accept="image/*,application/pdf"
          data-testid="report-attachment-input" className="bg-muted/50"
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />
        {files.length > 0 && (
          <p className="text-xs text-muted-foreground">{files.length} berkas dipilih</p>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.anonim} data-testid="report-anonim-checkbox"
            onCheckedChange={(v) => set("anonim", !!v)}
          />
          <span><b>Anonim</b> — nama Anda disamarkan pada daftar publik.</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.rahasia} data-testid="report-rahasia-checkbox"
            onCheckedChange={(v) => set("rahasia", !!v)}
          />
          <span><b>Rahasia</b> — laporan tidak ditampilkan ke publik, hanya Anda dan pengurus berwenang.</span>
        </label>
      </div>

      <Button type="submit" disabled={busy} data-testid="report-submit-btn" className="rounded-full px-8 transition-colors">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Kirim Laporan
      </Button>
    </form>
  );
};

export default ReportForm;
