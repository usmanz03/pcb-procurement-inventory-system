"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRightLeft, Building2, CheckCircle2, Clock, FileCheck2, Gavel, Lock, Mail, PackagePlus, QrCode, Trash2, Users, Warehouse } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { QrLabelDialog } from "@/components/qr-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiGrid, Meter, PageHeader, Section, Status, Stepper, type Tone } from "@/components/dash";
import { DocPaper, KV } from "@/components/doc";
import { useApp, useRole } from "@/lib/store";
import { num, pkr, TODAY_STR } from "@/lib/domain";
import type { Lifecycle } from "@/lib/types";
import { cn } from "@/lib/utils";

const LIFECYCLE: Lifecycle[] = ["Issued", "In Use", "Returned", "Under Repair", "Disposed"];
const LC_TONE: Record<Lifecycle, Tone> = { Issued: "info", "In Use": "success", Returned: "neutral", "Under Repair": "warning", Disposed: "danger" };

export default function CustodyPage() {
  const s = useApp();
  const role = useRole();
  const [holderId, setHolderId] = useState(s.custodyHolders[0].empId);
  const [asset, setAsset] = useState<string | null>(null);
  const [handOpen, setHandOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const holder = s.custodyHolders.find((h) => h.empId === holderId) ?? s.custodyHolders[0];
  const custodian = (dept: string) => s.departmentCustodians.find((d) => d.dept === dept)?.custodian ?? "—";
  const rows = s.custodyHolders.flatMap((h) => h.assets.map((a) => ({ ...a, h, m: s.custodyMeta[a.assetTag] })));
  const pending = rows.filter((r) => r.m.ack === "Pending");
  const value = rows.reduce((a, r) => a + r.valuePkr, 0);

  return (
    <>
      <PageHeader module="Stores" title="Custody & sub-store issuance" description="Central Store → Departmental Custodian → Employee. Custody moves only when the recipient confirms."
        actions={<>
          <Button variant="outline" onClick={() => setExitOpen(true)}><FileCheck2 /> Exit clearance</Button>
          {!role.readOnly && <Button variant="outline" onClick={() => setHandOpen(true)}><ArrowRightLeft /> Hand over</Button>}
          {!role.readOnly && <Button onClick={() => setIssueOpen(true)}><PackagePlus /> Issue asset to staff</Button>}
        </>} />

      <KpiGrid items={[
        { label: "Assets in custody", value: rows.length, icon: Users, hero: true, foot: `${pkr(value)} on the custody ledger` },
        { label: "Awaiting confirmation", value: pending.length, icon: Clock, delta: pending.some((p) => (p.m.ackHours ?? 0) >= s.ackEscalationHours) ? { dir: "up", text: "1 escalated", good: false } : { dir: "flat", text: "Within 48h" } },
        { label: "Under repair", value: rows.filter((r) => r.m.lifecycle === "Under Repair").length, icon: AlertTriangle, foot: "Tracked to return" },
        { label: "Departmental custodians", value: s.departmentCustodians.length, icon: Building2, foot: "Accountable per department" },
      ]} />

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Section className="self-start" title="Chain of custody" description="Each department has an accountable custodian with its own ledger.">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1"><Warehouse className="size-3.5 text-primary" />Central Store · Muhammad Rashid</span>
            <span className="text-muted-foreground">→</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1"><Building2 className="size-3.5 text-primary" />Departmental custodian</span>
            <span className="text-muted-foreground">→</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold px-3 py-1 font-semibold"><Users className="size-3.5 text-gold-text" />Employee confirms receipt</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {s.departmentCustodians.map((d) => (
              <div key={d.dept} className="rounded-lg border bg-muted/30 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{d.dept}</div>
                <div className="mt-1 text-[13px] font-semibold">{d.custodian}</div>
                <div className="text-xs text-muted-foreground">{d.holders} holder{d.holders === 1 ? "" : "s"} · {d.items} items on ledger</div>
              </div>
            ))}
          </div>
        </Section>
        <Section className="self-start" title="Awaiting recipient confirmation" description={`Unconfirmed issues escalate to the departmental custodian after ${s.ackEscalationHours} hours.`} action={<Status tone={pending.length ? "warning" : "success"} icon={null}>{pending.length} pending</Status>}>
          {pending.length ? (
            <ul className="grid gap-3">
              {pending.map((r) => {
                const hrs = r.m.ackHours ?? 0, esc = hrs >= s.ackEscalationHours;
                return (
                  <li key={r.assetTag} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><div className="truncate text-[13px] font-semibold">{r.h.name} · <span className="font-mono text-xs">{r.assetTag}</span></div><div className="truncate text-xs text-muted-foreground">{r.description}</div></div>
                      {esc ? <Status tone="danger" icon={AlertTriangle}>Escalated</Status> : <Status tone="warning" icon={Clock}>{hrs}h</Status>}
                    </div>
                    <Meter value={(hrs / s.ackEscalationHours) * 100} tone={esc ? "danger" : "warning"} className="my-2" />
                    {esc && <p className="mb-2 text-[11px] text-muted-foreground">Escalated to {custodian(r.h.department)}</p>}
                    {!role.readOnly && <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { const x = s.remindCustody(r.assetTag); toast.success(x.title, { description: x.message }); }}><Mail /> Remind</Button>
                      <Button size="sm" variant="ghost" onClick={() => { const x = s.confirmCustody(r.assetTag); toast.success(x.title, { description: x.message }); }}>Record confirmation</Button>
                    </div>}
                  </li>
                );
              })}
            </ul>
          ) : <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground"><CheckCircle2 className="size-5 text-success" />Every recipient has confirmed.</div>}
        </Section>
      </div>

      <Section className="mb-6 border-l-2 border-l-gold" title={`${holder.name} · ${holder.empId}`} description={`${holder.designation} · ${holder.department} · custodian ${custodian(holder.department)}`}
        action={<Select value={holderId} onValueChange={setHolderId}><SelectTrigger className="w-64"><SelectValue /></SelectTrigger><SelectContent>{s.custodyHolders.map((h) => <SelectItem key={h.empId} value={h.empId}>{h.name} ({h.assets.length})</SelectItem>)}</SelectContent></Select>}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {holder.assets.map((a) => {
            const m = s.custodyMeta[a.assetTag];
            return (
              <button key={a.assetTag} type="button" onClick={() => setAsset(a.assetTag)} className="rounded-lg border bg-muted/30 p-3 text-left transition-colors hover:border-primary/50">
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-semibold">{a.assetTag}</span><Status tone={LC_TONE[m.lifecycle]} icon={null}>{m.lifecycle}</Status></div>
                <div className="mt-2 line-clamp-2 text-[13px]">{a.description}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{m.purpose} · {m.location}</div>
                {m.ack === "Pending" && <div className="mt-2"><Status tone="warning" icon={Clock}>Awaiting confirmation</Status></div>}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Custody register · who holds what" description="Select a row to open that holder." flush>
        <Table>
          <TableHeader><TableRow><TableHead className="pl-5">Asset</TableHead><TableHead>Custody chain</TableHead><TableHead>Purpose / location</TableHead><TableHead>Issued</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Lifecycle</TableHead><TableHead className="pr-5">Confirmation</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.assetTag} className={cn("cursor-pointer", r.h.empId === holder.empId && "bg-primary/5")} onClick={() => setHolderId(r.h.empId)}>
                <TableCell className="max-w-[15rem] pl-5 whitespace-normal"><div className="font-mono text-xs font-semibold">{r.assetTag}</div><div className="line-clamp-1 text-xs text-muted-foreground">{r.description}</div></TableCell>
                <TableCell className="text-xs"><span className="text-muted-foreground">Store → {custodian(r.h.department)} →</span> <b>{r.h.name}</b></TableCell>
                <TableCell className="text-xs"><div>{r.m.purpose}</div><div className="text-muted-foreground">{r.m.location}</div></TableCell>
                <TableCell className="text-xs"><div>{r.issuedDate}</div><div className="text-muted-foreground">{r.m.returnable ? `Return by ${r.m.expectedReturn}` : "Non-returnable"}</div></TableCell>
                <TableCell className="text-right font-mono text-xs tabular">{num(r.valuePkr)}</TableCell>
                <TableCell><Status tone={LC_TONE[r.m.lifecycle]} icon={null}>{r.m.lifecycle}</Status></TableCell>
                <TableCell className="pr-5">{r.m.ack === "Pending" ? <Status tone={(r.m.ackHours ?? 0) >= s.ackEscalationHours ? "danger" : "warning"} icon={Clock}>Pending · {r.m.ackHours}h</Status> : <Status tone="success">Confirmed</Status>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section className="mt-6" title="Condemnation & disposal register" description="Assets proposed for write-off or auction, the survey committee's finding and the approval decision. History is kept permanently." flush>
        <Table>
          <TableHeader><TableRow><TableHead className="pl-5">Reference</TableHead><TableHead>Asset</TableHead><TableHead>Reason</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Book value</TableHead><TableHead className="pr-5">Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {s.disposals.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="pl-5"><div className="font-mono text-xs font-semibold">{d.id}</div><div className="text-[11px] text-muted-foreground">{d.date}</div></TableCell>
                <TableCell className="max-w-[16rem] whitespace-normal"><div className="font-mono text-xs">{d.assetTag}</div><div className="line-clamp-1 text-xs text-muted-foreground">{d.description}</div></TableCell>
                <TableCell className="max-w-[16rem] whitespace-normal text-xs text-muted-foreground">{d.reason}</TableCell>
                <TableCell className="text-xs">{d.method}{d.reservePrice ? <div className="text-[11px] text-muted-foreground">Reserve {pkr(d.reservePrice)}</div> : null}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular">{num(d.bookValue)}</TableCell>
                <TableCell className="pr-5"><Status tone={d.status === "Written off" ? "neutral" : d.status === "Approved for auction" ? "gold" : d.status === "Rejected" ? "danger" : "warning"} icon={d.status === "Awaiting approval" ? Clock : d.method === "Auction" ? Gavel : undefined}>{d.status}</Status></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <AssetDialog tag={asset} onClose={() => setAsset(null)} />
      <IssueDialog open={issueOpen} onOpenChange={setIssueOpen} />
      <HandoverDialog open={handOpen} onOpenChange={setHandOpen} />
      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="sr-only"><DialogTitle>Exit clearance</DialogTitle><DialogDescription>Outstanding custody report</DialogDescription></DialogHeader>
          <ExitClearance empId={holder.empId} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function AssetDialog({ tag, onClose }: { tag: string | null; onClose: () => void }) {
  const s = useApp();
  const role = useRole();
  const holder = s.custodyHolders.find((h) => h.assets.some((a) => a.assetTag === tag));
  const a = holder?.assets.find((x) => x.assetTag === tag);
  const m = tag ? s.custodyMeta[tag] : undefined;
  const [dispose, setDispose] = useState(false);
  const [qr, setQr] = useState(false);
  return (
    <Dialog open={!!a} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        {a && m && holder && <>
          <DialogHeader><DialogTitle>{a.assetTag} · {a.description}</DialogTitle><DialogDescription>Asset lifecycle and custody</DialogDescription></DialogHeader>
          <Stepper steps={LIFECYCLE} at={LIFECYCLE.indexOf(m.lifecycle)} />
          <KV rows={[["Holder", `${holder.name} (${holder.empId})`], ["Purpose", m.purpose], ["Location", m.location], ["Expected return", m.returnable ? m.expectedReturn : "Non-returnable"], ["Item code", <span key="c" className="font-mono">{a.itemCode}</span>], ["Value", pkr(a.valuePkr)]]} />
          {!role.readOnly && m.lifecycle !== "Disposed" && <DialogFooter className="flex-wrap gap-2 sm:justify-start">
            {(["In Use", "Returned", "Under Repair"] as Lifecycle[]).filter((x) => x !== m.lifecycle).map((x) => (
              <Button key={x} size="sm" variant="outline" onClick={() => { const r = s.setLifecycle(a.assetTag, x); toast.success(r.title, { description: r.message }); onClose(); }}>
                {x === "In Use" ? "Back in use" : x === "Returned" ? "Returned to store" : "Send for repair"}
              </Button>
            ))}
            <Button size="sm" variant="destructive" onClick={() => setDispose(true)}><Trash2 /> Propose disposal</Button>
          </DialogFooter>}
          <Button size="sm" variant="ghost" className="justify-self-start" onClick={() => setQr(true)}><QrCode /> Asset label</Button>
          <DisposeDialog tag={dispose ? a.assetTag : null} onClose={() => { setDispose(false); onClose(); }} />
          <QrLabelDialog code={qr ? a.assetTag : null} title={a.description} sub={`${holder.name} · ${holder.department}`} onClose={() => setQr(false)} />
        </>}
      </DialogContent>
    </Dialog>
  );
}

function HandoverDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useApp();
  const all = s.custodyHolders.flatMap((h) => h.assets.map((a) => ({ a, h })));
  const [tag, setTag] = useState(all[0]?.a.assetTag ?? "");
  const [to, setTo] = useState(s.custodyHolders[1]?.empId ?? "");
  const [purpose, setPurpose] = useState("Series video analysis");
  const [ret, setRet] = useState("2026-12-31");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Hand over custody</DialogTitle><DialogDescription>The new holder must confirm receipt. Unconfirmed handovers escalate after {s.ackEscalationHours} hours.</DialogDescription></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Asset</Label><Select value={tag} onValueChange={setTag}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{all.map(({ a, h }) => <SelectItem key={a.assetTag} value={a.assetTag}>{a.assetTag} · {a.description.slice(0, 30)} ({h.name})</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label>New holder</Label><Select value={to} onValueChange={setTo}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{s.custodyHolders.map((h) => <SelectItem key={h.empId} value={h.empId}>{h.name} · {h.department}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label htmlFor="hp">Purpose</Label><Input id="hp" value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="hr">Expected return</Label><Input id="hr" type="date" value={ret} onChange={(e) => setRet(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { const r = s.handOver({ tag, toEmpId: to, purpose, expectedReturn: ret }); if (r.ok) { toast.success(r.title, { description: r.message }); onOpenChange(false); } else toast.error(r.title, { description: r.message }); }}>Hand over</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExitClearance({ empId }: { empId: string }) {
  const s = useApp();
  const h = s.custodyHolders.find((x) => x.empId === empId)!;
  const outstanding = h.assets.filter((a) => { const m = s.custodyMeta[a.assetTag]; return m.returnable && !["Returned", "Disposed"].includes(m.lifecycle); });
  const clear = outstanding.length === 0;
  return (
    <DocPaper subtitle="Stores & Custody Wing · Gaddafi Stadium, Lahore" kind="Exit clearance" date={TODAY_STR}>
      <KV className="mb-4" rows={[["Employee", `${h.name} (${h.empId})`], ["Department", h.department], ["Custodian", s.departmentCustodians.find((d) => d.dept === h.department)?.custodian ?? "—"]]} />
      <div className={cn("mb-3 flex gap-2 rounded-lg border p-3 text-xs", clear ? "border-[var(--success)]/30 bg-[var(--success)]/8" : "border-[var(--destructive)]/30 bg-[var(--destructive)]/8")}>
        {clear ? <CheckCircle2 className="size-4 text-[var(--success)]" /> : <Lock className="size-4 text-[var(--destructive)]" />}
        <div><b className="text-[13px]">{clear ? "Cleared: NOC can be issued" : `Clearance blocked: ${outstanding.length} returnable item${outstanding.length === 1 ? "" : "s"} outstanding`}</b><br />Items must be returned to store, or written off with approval, before the NOC is issued.</div>
      </div>
      <table className="w-full text-xs">
        <thead><tr className="border-b text-left text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]"><th className="py-2">Asset tag</th><th>Description</th><th>Status</th><th className="text-right">Value (PKR)</th></tr></thead>
        <tbody>{outstanding.map((a) => <tr key={a.assetTag} className="border-b"><td className="py-2 font-mono">{a.assetTag}</td><td>{a.description}</td><td>{s.custodyMeta[a.assetTag].lifecycle}</td><td className="text-right font-mono">{num(a.valuePkr)}</td></tr>)}
          {!outstanding.length && <tr><td colSpan={4} className="py-4 text-center text-[var(--muted-foreground)]">Nothing outstanding.</td></tr>}</tbody>
      </table>
    </DocPaper>
  );
}

function DisposeDialog({ tag, onClose }: { tag: string | null; onClose: () => void }) {
  const s = useApp();
  const [reason, setReason] = useState("Beyond economical repair per survey committee inspection");
  const [method, setMethod] = useState<"Write-off" | "Auction">("Auction");
  const [reserve, setReserve] = useState(25000);
  return (
    <Dialog open={!!tag} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Propose disposal · {tag}</DialogTitle><DialogDescription>The survey committee&apos;s finding goes to the Director and CFO for approval. The asset stays on record until approved.</DialogDescription></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Method</Label><Select value={method} onValueChange={(v) => setMethod(v as "Write-off" | "Auction")}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Auction">Public auction</SelectItem><SelectItem value="Write-off">Write-off</SelectItem></SelectContent></Select></div>
          {method === "Auction" && <div className="grid gap-1.5"><Label htmlFor="rp">Reserve price (PKR)</Label><Input id="rp" type="number" value={reserve} onChange={(e) => setReserve(+e.target.value)} /></div>}
          <div className="grid gap-1.5"><Label htmlFor="rs">Survey committee finding</Label><Textarea id="rs" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => { const r = s.proposeDisposal({ tag: tag!, reason, method, reservePrice: method === "Auction" ? reserve : undefined }); if (r.ok) toast.success(r.title, { description: r.message }); else toast.error(r.title, { description: r.message }); onClose(); }}>Send for approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IssueDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useApp();
  const assets = s.itemsMaster.filter((i) => i.classification.includes("Asset") && (i.storeBreakdown["STORE-LHR-01"] ?? 0) > 0);
  const [code, setCode] = useState(assets[0]?.code ?? "");
  const [emp, setEmp] = useState(s.custodyHolders[0]?.empId ?? "");
  const [purpose, setPurpose] = useState("Match-day operations");
  const [loc, setLoc] = useState("Gaddafi Stadium, Lahore");
  const [ret, setRet] = useState("2026-12-31");
  const item = s.itemsMaster.find((i) => i.code === code);
  const h = s.custodyHolders.find((x) => x.empId === emp);
  const custodian = s.departmentCustodians.find((d) => d.dept === h?.department)?.custodian ?? "Departmental custodian";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Issue an asset to a staff member</DialogTitle><DialogDescription>A new asset tag is created, the store balance drops, and the person is asked to confirm receipt.</DialogDescription></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Asset from Gaddafi Central Store</Label><Select value={code} onValueChange={setCode}><SelectTrigger className="w-full"><SelectValue placeholder="No assets in store" /></SelectTrigger><SelectContent>{assets.map((i) => <SelectItem key={i.code} value={i.code}>{i.name.slice(0, 44)} · {i.storeBreakdown["STORE-LHR-01"]} in store</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label>Issued to</Label><Select value={emp} onValueChange={setEmp}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{s.custodyHolders.map((x) => <SelectItem key={x.empId} value={x.empId}>{x.name} · {x.department}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label htmlFor="ip">Purpose</Label><Input id="ip" value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="il">Location</Label><Input id="il" value={loc} onChange={(e) => setLoc(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="ir">Return by</Label><Input id="ir" type="date" value={ret} onChange={(e) => setRet(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Accountable custodian</Label><div className="flex h-9 items-center truncate rounded-md border bg-muted/40 px-3 text-sm">{custodian}</div></div>
          </div>
          {item && <p className="text-xs text-muted-foreground">Value on the custody record: {pkr(item.avgCostPkr)}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!item} onClick={() => { const r = s.issueAsset({ itemCode: code, empId: emp, purpose, location: loc, expectedReturn: ret }); if (r.ok) { toast.success(r.title, { description: r.message }); onOpenChange(false); } else toast.error(r.title, { description: r.message }); }}>Issue and request confirmation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
