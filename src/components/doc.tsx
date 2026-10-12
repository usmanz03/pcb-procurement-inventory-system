/* eslint-disable @next/next/no-img-element */
import { asset } from "@/lib/nav";
import { cn } from "@/lib/utils";

/* Official-looking PCB document on white paper, in both themes */
export function DocPaper({ subtitle, kind, refNo, date, children, className }: {
  subtitle: string; kind: string; refNo?: string; date?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("doc-paper rounded-lg border p-5 text-[13px]", className)}>
      <div className="mb-4 flex items-start justify-between gap-4 border-b-2 border-[var(--primary)] pb-3">
        <div className="flex items-center gap-3">
          <img src={asset("/pcb-logo.svg")} alt="Pakistan Cricket Board" className="h-14 w-auto" />
          <div>
            <div className="text-[15px] font-bold tracking-tight">PAKISTAN CRICKET BOARD</div>
            <div className="text-xs text-[var(--muted-foreground)]">{subtitle}</div>
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="font-semibold uppercase tracking-wide">{kind}</div>
          {refNo && <div className="font-mono">{refNo}</div>}
          {date && <div className="text-[var(--muted-foreground)]">{date}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function KV({ rows, className }: { rows: [string, React.ReactNode][]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-[9.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px]", className)}>
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
