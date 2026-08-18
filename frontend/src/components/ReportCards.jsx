import { Lock, MapPin, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmtDate, STATUS_STYLE } from "@/lib/api";

export const ReportCards = ({ reports, onOpen, emptyText = "Belum ada laporan." }) => {
  if (!reports.length)
    return (
      <p data-testid="report-empty-state" className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
        {emptyText}
      </p>
    );
  return (
    <div className="stagger-in grid gap-6 md:grid-cols-2" data-testid="report-card-list">
      {reports.map((r) => (
        <button
          key={r.id}
          data-testid={`report-card-${r.id}`}
          onClick={() => onOpen(r)}
          className="group rounded-xl border border-border bg-card p-6 text-left shadow-sm shadow-slate-200/50 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={`rounded-full ${r.type === "pengaduan" ? "bg-primary/10 text-primary hover:bg-primary/10" : "bg-secondary/25 text-secondary-foreground hover:bg-secondary/25"}`}
            >
              {r.type === "pengaduan" ? "Pengaduan" : "Aspirasi"}
            </Badge>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[r.status]}`}>
              {r.status}
            </span>
            {r.rahasia && (
              <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">
                <Lock className="h-3 w-3" /> Rahasia
              </span>
            )}
          </div>
          <h3 className="mt-4 font-head text-lg font-bold leading-snug transition-colors group-hover:text-primary">
            {r.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.body}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Oleh <b className="text-foreground">{r.sender_name}</b></span>
            <span>RW {r.target_rw_name}{r.target_rt_name ? ` / RT ${r.target_rt_name}` : ""}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location || "-"}</span>
            <span>{fmtDate(r.created_at)}</span>
            {r.attachment_count > 0 && (
              <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{r.attachment_count}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

export default ReportCards;
