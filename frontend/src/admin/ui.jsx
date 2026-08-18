export const PageHeader = ({ title, desc, action }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="font-head text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
    </div>
    {action}
  </div>
);

export const StatusPill = ({ active }) => (
  <span
    className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}
  >
    {active ? "Aktif" : "Nonaktif"}
  </span>
);

export default PageHeader;
