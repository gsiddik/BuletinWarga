import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, MapPin, Tag, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { api, errMsg, fmtDate, STATUS_STYLE } from "@/lib/api";

export const ReportDetailDialog = ({ reportId, open, onOpenChange, markRead = false, onChanged }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open || !reportId) return;
    setData(null);
    api
      .get(`/reports/${reportId}${markRead ? "?mark_read=true" : ""}`)
      .then((r) => {
        setData(r.data);
        if (markRead) onChanged?.();
      })
      .catch((e) => {
        toast.error(errMsg(e));
        onOpenChange(false);
      });
  }, [open, reportId, markRead]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto bg-card" data-testid="report-detail-dialog">
        {!data ? (
          <div className="flex items-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat detail…
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                  {data.type === "pengaduan" ? "Pengaduan" : "Aspirasi"}
                </Badge>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[data.status]}`}>
                  {data.status}
                </span>
                {data.anonim && <Badge variant="outline" className="rounded-full">Anonim</Badge>}
                {data.rahasia && <Badge variant="outline" className="rounded-full text-destructive">Rahasia</Badge>}
              </div>
              <DialogTitle className="pt-2 text-left font-head text-xl" data-testid="report-detail-title">
                {data.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <p><span className="text-muted-foreground">Pengirim:</span>{" "}
                  <b data-testid="report-detail-sender">{data.sender_name}</b></p>
                <p><span className="text-muted-foreground">Tanggal kejadian:</span> {fmtDate(data.incident_date)}</p>
                <p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {data.location || "-"}</p>
                <p className="flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-muted-foreground" /> {data.category_name || "-"}</p>
                <p><span className="text-muted-foreground">Ditujukan:</span> RW {data.target_rw_name}
                  {data.target_rt_name ? ` / RT ${data.target_rt_name}` : ""}</p>
                <p><span className="text-muted-foreground">Dikirim:</span> {fmtDate(data.created_at)}</p>
              </div>

              <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 leading-relaxed" data-testid="report-detail-body">
                {data.body}
              </p>

              {(data.attachments || []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lampiran</p>
                  <div className="flex flex-wrap gap-3">
                    {data.attachments.map((a, i) =>
                      a.mime?.startsWith("image/") ? (
                        <a key={i} href={a.data} target="_blank" rel="noreferrer">
                          <img src={a.data} alt={a.name} className="h-24 w-24 rounded-lg border object-cover" />
                        </a>
                      ) : (
                        <a key={i} href={a.data} target="_blank" rel="noreferrer"
                           className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-muted">
                          <FileText className="h-4 w-4" /> {a.name}
                        </a>
                      )
                    )}
                  </div>
                </div>
              )}

              {data.followup && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-800">Tindak Lanjut</p>
                  <p className="mt-2 text-sm"><b>{fmtDate(data.followup.date)}</b> — oleh {data.followup.by}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{data.followup.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(data.followup.attachments || []).map((a, i) => (
                      <a key={i} href={a.data} target="_blank" rel="noreferrer"
                         className="flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs">
                        <FileText className="h-3 w-3" /> {a.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReportDetailDialog;
