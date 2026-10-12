"use client";

import { Suspense, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Gavel,
  History,
  KeyRound,
  Layers,
  Lock,
  Mail,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trophy,
  Unlock,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarList, Empty, KpiGrid, Meter, PageHeader, Section, Stat, Status, Stepper, type Tone } from "@/components/dash";
import { DocPaper, KV } from "@/components/doc";
import { useApp, useRole } from "@/lib/store";
import { fmtD, mil, num, parseD, pkr } from "@/lib/domain";
import type { Bidder, Guarantee, Tender, Vendor } from "@/lib/types";
import { cn } from "@/lib/utils";

const SOURCING_STAGES = [
  "Requisition",
  "Method selected",
  "Bidding document",
  "Advertised",
  "Bids received",
  "Technical opening",
  "Financial opening",
  "Evaluation report",
  "Approval",
  "Intention to Award",
  "Contract / PO",
];

export default function SourcingPage() {
  return (
    <Suspense>
      <Sourcing />
    </Suspense>
  );
}

function Sourcing() {
  const s = useApp();
  const role = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"tenders" | "rfq" | "method" | "docs" | "guarantees">(
    (searchParams.get("view") as any) ?? "tenders"
  );

  // Method Selector state
  const [estValue, setEstValue] = useState(48000000);
  const [procType, setProcType] = useState("Goods");
  const [specialCircumstance, setSpecialCircumstance] = useState<"none" | "sole" | "emergency">("none");

  // Committee comment state
  const [sbdCommentInput, setSbdCommentInput] = useState("");

  // Modals
  const [berOpen, setBerOpen] = useState(false);
  const [rfqCstOpen, setRfqCstOpen] = useState(false);

  // Selected tender
  const currentTender = s.tenders[0];
  const responsiveBidders = currentTender.bidders.filter((b) => b.techScore >= 70);
  const winner = currentTender.bidders.find((b) => b.isWinner);

  // Method Recommendation computation
  const methodResult = useMemo(() => {
    const v = estValue || 0;
    const idx = s.methodThresholds.findIndex((t) => t.max === null || v <= t.max);
    const threshold = s.methodThresholds[idx] ?? s.methodThresholds[s.methodThresholds.length - 1];

    const band = v <= 100000 ? "B1" : v <= 3000000 ? "B2" : v <= 20000000 ? "B3" : v <= 50000000 ? "B4" : "B5";
    const matrixEntry = s.approvalMatrix.find((b) => b.band === band);

    let method = threshold.method;
    let docs = threshold.docs;
    let advert = threshold.advert;
    let minDays = threshold.minDays;
    let note = "";

    if (specialCircumstance === "sole") {
      method = "Direct Contracting (Single Source)";
      docs = "Recorded technical justification, proprietary certificate & negotiation minutes";
      advert = "Award published post-contract on PPRA portal";
      minDays = 0;
      note = "Requires approval one authority band higher than standard value threshold.";
    } else if (specialCircumstance === "emergency") {
      method = "Emergency Procurement (PPRA Rule 42c)";
      docs = "Emergency declaration certificate, post-facto documentation within 15 days";
      advert = "Award published post-contract on PPRA portal";
      minDays = 0;
      note = "Mandatory post-facto ratification report to Board / Competent Authority.";
    }

    return {
      method,
      docs,
      advert,
      minDays,
      band,
      chain: matrixEntry ? matrixEntry.chain : ["Procurement Committee", "Director Procurement"],
      note,
      matchedIndex: idx,
    };
  }, [estValue, specialCircumstance, s.methodThresholds, s.approvalMatrix]);

  // RFQ State
  const rfq = s.rfq;
  const rfqSelectedIds = s.rfqState.selected;
  const rfqQuotes = s.rfqState.quotes;
  const remainingQuotes = rfq.quoteBook.filter(
    (b) => rfqSelectedIds.includes(b.vendorId) && !rfqQuotes.some((q) => q.vendorId === b.vendorId)
  );

  const rfqEligibleVendors = rfq.vendorIds.map((id) => s.vendors.find((v) => v.id === id)!);

  // Submit SBD Comment
  const handlePostSbdComment = () => {
    if (!sbdCommentInput.trim()) return;
    s.addSbdComment(sbdCommentInput.trim());
    setSbdCommentInput("");
    toast.success("Comment recorded", { description: "Added to the committee sign-off log." });
  };

  // Lock SBD
  const handleLockSbd = () => {
    s.lockSbd();
    toast.success("Bidding document signed and locked", {
      description: "Hash signature recorded. Ready for public issuance.",
    });
  };

  // Dispatch RFQ
  const handleDispatchRfq = () => {
    if (rfqSelectedIds.length < 3) {
      toast.error("Minimum 3 vendors required", {
        description: "Under PPRA Rule 42(b), RFQ requires inviting at least 3 qualified vendors.",
      });
      return;
    }
    const res = s.dispatchRfq();
    toast.success(res.title, { description: res.message });
  };

  // Receive quote
  const handleReceiveNextQuote = () => {
    s.receiveQuote();
    toast.info("Quotation received", { description: "Timestamped and added to quotation register." });
  };

  // Sourcing stepper stage
  const tenderStepperAt = s.t089.po ? 10 : s.t089.closed ? 9 : s.t089.ita ? 8 : 7;

  return (
    <>
      <PageHeader
        module="Modules 5 & 6 · Sourcing & Evaluation"
        title="Sourcing workspace & bid evaluation"
        description="PPRA Rule-compliant procurement methods, electronic two-envelope sealed vault opening, automated comparative statements, and committee sign-off."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setBerOpen(true)}>
              <FileCheck className="size-4" /> Bid evaluation report (BER)
            </Button>
            {!role.readOnly && !s.vaultOpen && (
              <Button onClick={() => s.openEnvelopes()}>
                <KeyRound className="size-4" /> Open financial envelopes
              </Button>
            )}
          </div>
        }
      />

      <KpiGrid
        items={[
          {
            label: "Active procurement tenders",
            value: 2,
            icon: Gavel,
            hero: true,
            foot: "089 LED Floodlights · RFQ-0117",
          },
          {
            label: "Estimated procurement value",
            prefix: "PKR",
            value: (currentTender.estimatedBudgetPkr + rfq.estValue) / 1e6,
            decimals: 1,
            suffix: "M",
            icon: Wallet,
            foot: "Allocated under Approved CapEx / OpEx",
          },
          {
            label: "Bidding period compliance",
            value: 100,
            suffix: "%",
            icon: Calendar,
            delta: { dir: "flat", text: "21 days actual vs 15d min" },
            foot: "Meets PPRA Rule 22 mandatory notice",
          },
          {
            label: "Active bid securities held",
            value: s.guarantees.filter((g) => g.status === "Held" || g.status.includes("award")).length,
            icon: ShieldCheck,
            foot: `${pkr(s.guarantees.reduce((a, g) => a + g.amount, 0))} secured in escrow`,
          },
        ]}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="bg-muted/70 flex flex-wrap">
          <TabsTrigger value="tenders" className="gap-2">
            <Gavel className="size-4" /> Tender 089: 2-envelope evaluation
          </TabsTrigger>
          <TabsTrigger value="rfq" className="gap-2">
            <Mail className="size-4" /> RFQ-0117: Quotation comparative
          </TabsTrigger>
          <TabsTrigger value="method" className="gap-2">
            <Sparkles className="size-4 text-gold-text" /> PPRA method selector
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <FileText className="size-4" /> Standard bidding docs ({s.sbdTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="guarantees" className="gap-2">
            <ShieldCheck className="size-4" /> Bid securities & guarantees ({s.guarantees.length})
          </TabsTrigger>
        </TabsList>

        {/* ----------------- TAB 1: TENDER 089 TWO-ENVELOPE ----------------- */}
        {activeTab === "tenders" && (
          <div className="space-y-6">
            <Section
              title={
                <div className="flex flex-wrap items-center gap-2">
                  <span>{currentTender.tenderId}: {currentTender.title}</span>
                  <Badge variant="outline">{currentTender.method}</Badge>
                </div>
              }
              description={`Estimated budget: ${pkr(currentTender.estimatedBudgetPkr)} · SBD: ${currentTender.sbdTemplate} · Bid security: ${currentTender.bidSecurityPercent}`}
              action={
                <div className="flex items-center gap-2">
                  {s.t089.po ? (
                    <Status tone="success">PO Issued</Status>
                  ) : s.t089.ita ? (
                    <Status tone="gold">Intention to Award</Status>
                  ) : (
                    <Status tone="info">Evaluation Completed</Status>
                  )}
                </div>
              }
            >
              <div className="mb-6">
                <Stepper steps={SOURCING_STAGES} at={tenderStepperAt} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* 1. Technical Evaluation */}
                <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="font-semibold text-sm">
                      1. Technical evaluation results (Envelope 1)
                    </div>
                    <Badge variant="outline" className="text-[10px]">Cutoff: 70 / 100</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bidder</TableHead>
                        <TableHead>NTN / FBR</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentTender.bidders.map((b) => {
                        const pass = b.techScore >= 70;
                        return (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium text-xs">
                              {b.name}
                              <div className="text-[10px] text-muted-foreground">{b.dossier.pastProjects}</div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{b.ntn}</TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold tabular">
                              <span className={pass ? "text-success" : "text-destructive"}>
                                {b.techScore} / 100
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {pass ? (
                                <Status tone="success" icon={Check}>Qualified</Status>
                              ) : (
                                <Status tone="danger">Disqualified</Status>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <p className="text-[11px] text-muted-foreground">
                    Only technically responsive bidders qualify for public financial envelope opening.
                  </p>
                </div>

                {/* 2. Financial Envelopes & CST */}
                <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="font-semibold text-sm">
                      2. Financial comparative statement (Envelope 2)
                    </div>
                    {s.vaultOpen ? (
                      <Status tone="success" icon={Unlock}>Vault opened</Status>
                    ) : (
                      <Status tone="sealed" icon={Lock}>Envelopes encrypted</Status>
                    )}
                  </div>

                  {s.vaultOpen ? (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Bidder</TableHead>
                            <TableHead className="text-right">Quoted base</TableHead>
                            <TableHead className="text-right">Total (incl. tax)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {responsiveBidders
                            .slice()
                            .sort((a, b) => a.evaluatedTotalPkr - b.evaluatedTotalPkr)
                            .map((b, idx) => {
                              const isFirst = idx === 0;
                              return (
                                <TableRow
                                  key={b.id}
                                  className={cn(isFirst && "bg-gold/10 font-medium")}
                                >
                                  <TableCell>
                                    {isFirst ? (
                                      <Status tone="gold" icon={Trophy}>#1 L1</Status>
                                    ) : (
                                      <Badge variant="outline">#{idx + 1}</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs">{b.name}</TableCell>
                                  <TableCell className="text-right font-mono text-xs tabular">
                                    {num(b.quotedBasePkr)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs font-semibold tabular">
                                    {pkr(b.evaluatedTotalPkr)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                      {winner && (
                        <div className="rounded-lg border border-gold/40 bg-gold/10 p-3 text-xs flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gold-text">
                              Recommended Awardee: {winner.name}
                            </div>
                            <div className="text-muted-foreground text-[11px]">
                              Evaluated total {pkr(winner.evaluatedTotalPkr)} (turnkey rigging, aiming & warranty included).
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setBerOpen(true)}>
                            View BER
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                      <Lock className="size-8 text-sealed animate-pulse" />
                      <div className="text-xs font-medium">Financial envelopes are cryptographically locked</div>
                      <p className="text-[11px] text-muted-foreground max-w-xs">
                        Under PPRA Rule 36(b), financial bids remain unopened until technical evaluation is finalized and signed by the committee.
                      </p>
                      {!role.readOnly && (
                        <Button size="sm" onClick={() => s.openEnvelopes()}>
                          Open envelopes in committee presence
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Committee Sign-off Grid */}
              <div className="mt-6 pt-4 border-t">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Procurement Committee Sign-off & Conflict-of-Interest Declaration
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {currentTender.committee.map((c) => (
                    <div key={c.name} className="rounded-lg border bg-background p-3 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-foreground">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground">{c.role}</div>
                      </div>
                      <Status tone="success" icon={Check}>No conflict</Status>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* ----------------- TAB 2: RFQ WORKSPACE ----------------- */}
        {activeTab === "rfq" && (
          <div className="space-y-6">
            <Section
              title={
                <div className="flex flex-wrap items-center gap-2">
                  <span>{rfq.id}: {rfq.title}</span>
                  {s.rfqState.dispatched ? (
                    <Status tone="success">Dispatched to {rfqSelectedIds.length} vendors</Status>
                  ) : (
                    <Status tone="neutral">Draft invitation</Status>
                  )}
                </div>
              }
              description={`Estimated value: ${pkr(rfq.estValue)} · Closes: ${rfq.closes} · Request for Quotations (PPRA Rule 42b)`}
              action={
                s.rfqState.dispatched && rfqQuotes.length >= 3 && (
                  <Button onClick={() => setRfqCstOpen(true)}>
                    <FileSpreadsheet className="size-4" /> Comparative statement
                  </Button>
                )
              }
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)]">
                {/* Vendor Invitation List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Select vendors for quotation ({rfqSelectedIds.length} chosen)
                    </div>
                    <span className="text-[11px] text-muted-foreground">Minimum 3 required</span>
                  </div>

                  <div className="space-y-2">
                    {rfqEligibleVendors.map((v) => {
                      const isChecked = rfqSelectedIds.includes(v.id);
                      const isEligible = v.status === "Eligible";
                      return (
                        <label
                          key={v.id}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-lg border p-3 text-xs transition-colors",
                            isChecked && "border-primary/40 bg-primary/5",
                            !isEligible && "opacity-50 cursor-not-allowed bg-muted/40",
                            isEligible && !s.rfqState.dispatched && "cursor-pointer hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={!isEligible || s.rfqState.dispatched}
                              onChange={(e) => s.toggleRfqVendor(v.id, e.target.checked)}
                              className="size-4 rounded accent-primary"
                            />
                            <div>
                              <div className="font-semibold text-foreground">{v.name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                NTN: {v.ntn} · Prequal: {v.prequal}/100
                              </div>
                            </div>
                          </div>
                          <div>
                            {isEligible ? (
                              isChecked && s.rfqState.dispatched ? (
                                <Status tone="info" icon={Mail}>Invited</Status>
                              ) : (
                                <Status tone="neutral" icon={null}>Eligible</Status>
                              )
                            ) : (
                              <Status tone="danger">Debarred</Status>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {!s.rfqState.dispatched && (
                    <div className="pt-2">
                      <Button
                        className="w-full"
                        disabled={rfqSelectedIds.length < 3 || role.readOnly}
                        onClick={handleDispatchRfq}
                      >
                        <Send className="size-4" /> Send RFQ to {rfqSelectedIds.length} vendors
                      </Button>
                    </div>
                  )}
                </div>

                {/* Quotations Received */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Quotations received ({rfqQuotes.length} / {rfqSelectedIds.length})
                    </div>
                    {s.rfqState.dispatched && remainingQuotes.length > 0 && !role.readOnly && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleReceiveNextQuote}>
                        <RefreshCw className="size-3" /> Simulate incoming quote
                      </Button>
                    )}
                  </div>

                  {s.rfqState.dispatched ? (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vendor</TableHead>
                            <TableHead className="text-right">Quoted base</TableHead>
                            <TableHead>Delivery</TableHead>
                            <TableHead className="text-right">Timestamp</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rfqQuotes.map((q) => {
                            const v = s.vendors.find((x) => x.id === q.vendorId);
                            return (
                              <TableRow key={q.vendorId}>
                                <TableCell className="font-medium text-xs">{v?.name}</TableCell>
                                <TableCell className="text-right font-mono text-xs tabular font-semibold">
                                  {pkr(q.base)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{q.delivery}</TableCell>
                                <TableCell className="text-right text-[11px] text-muted-foreground font-mono">
                                  {q.at ?? "13-Oct 11:20"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {rfqQuotes.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4}>
                                <Empty>Waiting for vendor quotation submissions.</Empty>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>

                      {rfqQuotes.length >= 3 && (
                        <div className="rounded-lg border border-success/40 bg-success/10 p-4 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-xs text-success">
                              Quotation quorum reached ({rfqQuotes.length} received)
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              All bids are ready for comparative statement normalization and award.
                            </div>
                          </div>
                          <Button size="sm" onClick={() => setRfqCstOpen(true)}>
                            View comparative statement
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                      Quotations will appear in real time once the RFQ is dispatched to the selected vendors.
                    </div>
                  )}
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* ----------------- TAB 3: METHOD SELECTOR ----------------- */}
        {activeTab === "method" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)]">
            <Section
              title="Procurement method determination"
              description="Calculates statutory PPRA procurement method, advertising requirements, and financial approval band."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="ms-val">Estimated procurement value (PKR)</Label>
                  <Input
                    id="ms-val"
                    type="number"
                    value={estValue}
                    onChange={(e) => setEstValue(+e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground">
                    Formatted: <b className="font-mono text-foreground">{pkr(estValue)}</b> ({mil(estValue, 2)})
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label>Procurement category</Label>
                  <Select value={procType} onValueChange={setProcType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Goods">Goods</SelectItem>
                      <SelectItem value="Works">Works</SelectItem>
                      <SelectItem value="Services">Services / Consulting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label>Special circumstance</Label>
                  <Select value={specialCircumstance} onValueChange={(v: any) => setSpecialCircumstance(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Standard open procedure)</SelectItem>
                      <SelectItem value="sole">Direct contracting (Sole source)</SelectItem>
                      <SelectItem value="emergency">Emergency procurement (Rule 42c)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Computed Recommendation Box */}
              <div className="mt-6 rounded-xl border-2 border-gold/40 bg-gold/5 p-5 space-y-4">
                <div className="flex items-center gap-2 text-gold-text font-bold text-sm">
                  <Gavel className="size-5" /> Recommended Statutory Method: {methodResult.method}
                </div>
                <div className="text-xs text-foreground space-y-2">
                  <div>
                    <span className="font-semibold text-muted-foreground">Required documentation: </span>
                    {methodResult.docs}
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Advertisement requirement: </span>
                    {methodResult.advert}
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Minimum bidding period: </span>
                    {methodResult.minDays ? `${methodResult.minDays} calendar days` : "Not applicable (Direct)"}
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Financial delegation band: </span>
                    <Badge variant="outline" className="font-mono text-xs">{methodResult.band}</Badge>
                    <span className="ml-2 text-muted-foreground font-mono text-[11px]">
                      {methodResult.chain.join(" → ")}
                    </span>
                  </div>
                  {methodResult.note && (
                    <div className="rounded-md bg-warning/15 p-2 text-warning font-medium text-[11px]">
                      {methodResult.note}
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* Threshold Reference Table */}
            <Section
              title="Configured PPRA statutory thresholds"
              description="Policy parameters defined under PPRA 2004 Rules 12, 13, 36 & 42."
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Value up to</TableHead>
                    <TableHead>Prescribed method</TableHead>
                    <TableHead>Notice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.methodThresholds.map((t, idx) => {
                    const isSelected = idx === methodResult.matchedIndex && specialCircumstance === "none";
                    return (
                      <TableRow
                        key={idx}
                        className={cn(isSelected && "bg-primary/10 font-medium")}
                      >
                        <TableCell className="font-mono text-xs">
                          {t.max === null ? "Above 3,000,000" : pkr(t.max)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">{t.method}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.advert}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Section>
          </div>
        )}

        {/* ----------------- TAB 4: SBD DOCUMENTS & COMMITTEE REVIEW ----------------- */}
        {activeTab === "docs" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)]">
            <Section
              title="Standard bidding document repository"
              description="Standardized PEC & PPRA bidding documents maintained under version control."
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template document</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.sbdTemplates.map((t) => (
                    <TableRow key={t.name}>
                      <TableCell className="font-medium text-xs">{t.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">{t.version}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {t.updated}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-4 text-[11px] text-muted-foreground">
                Tender dossiers can only be spawned from approved, version-controlled standard templates.
              </p>
            </Section>

            <Section
              title={
                <div className="flex items-center justify-between w-full">
                  <span>Committee review thread · SBD v4.2-PCB-089</span>
                  {s.sbdLocked ? (
                    <Status tone="success" icon={Lock}>Document locked</Status>
                  ) : (
                    <Status tone="warning" icon={Clock}>Under review</Status>
                  )}
                </div>
              }
              description="LED floodlights tender document sign-off. Locking finalizes the document hash."
            >
              <div className="space-y-4">
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {s.sbdComments.map((c, i) => (
                    <div key={i} className="rounded-lg border bg-muted/20 p-3 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{c.by} ({c.role})</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{c.at}</span>
                      </div>
                      <p className="text-muted-foreground">{c.text}</p>
                    </div>
                  ))}
                </div>

                {!s.sbdLocked ? (
                  <div className="space-y-3 border-t pt-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add review feedback or condition..."
                        value={sbdCommentInput}
                        onChange={(e) => setSbdCommentInput(e.target.value)}
                        className="text-xs"
                      />
                      <Button size="sm" variant="outline" onClick={handlePostSbdComment}>
                        Post
                      </Button>
                    </div>
                    {!role.readOnly && (
                      <Button className="w-full" onClick={handleLockSbd}>
                        <Lock className="size-4" /> Sign off and lock bidding document
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-xs text-success flex items-center gap-2">
                    <CheckCircle2 className="size-4" /> Document locked and tamper-evident hash recorded.
                  </div>
                )}
              </div>
            </Section>
          </div>
        )}

        {/* ----------------- TAB 5: GUARANTEES ----------------- */}
        {activeTab === "guarantees" && (
          <Section
            title="Bid security & performance guarantee register"
            description="Tracking bank guarantees, CDRs and escrow instruments with automatic expiry alerts."
            flush
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Security type</TableHead>
                  <TableHead>Bidder / Contractor</TableHead>
                  <TableHead>Instrument ref</TableHead>
                  <TableHead className="text-right">Amount (PKR)</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.guarantees.map((g, idx) => {
                  return (
                    <TableRow key={idx}>
                      <TableCell className="pl-5 font-semibold text-xs">{g.type}</TableCell>
                      <TableCell className="text-xs">{g.bidder}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{g.instrument}</TableCell>
                      <TableCell className="text-right font-mono text-xs tabular font-semibold">
                        {pkr(g.amount)}
                      </TableCell>
                      <TableCell className="text-xs">{g.validity}</TableCell>
                      <TableCell>
                        <Status
                          tone={g.status === "Released" ? "neutral" : g.status === "Held" ? "info" : "warning"}
                        >
                          {g.status}
                        </Status>
                      </TableCell>
                      <TableCell className="text-right pr-5">
                        {g.status === "Release on award" && !role.readOnly ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              s.releaseGuarantee(idx);
                              toast.success("Security released", {
                                description: `${g.instrument} returned to bidder.`,
                              });
                            }}
                          >
                            Release
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Section>
        )}
      </Tabs>

      {/* ----------------- MODAL: BID EVALUATION REPORT (BER) ----------------- */}
      <Dialog open={berOpen} onOpenChange={setBerOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Bid evaluation report {currentTender.tenderId}</DialogTitle>
            <DialogDescription>Statutory evaluation document</DialogDescription>
          </DialogHeader>

          <DocPaper
            subtitle="Procurement Wing · Gaddafi Stadium Lahore"
            kind="Bid evaluation report"
            refNo={currentTender.tenderId}
            date="13-Oct-2026"
          >
            <div className="space-y-4 text-xs">
              <div>
                <div className="font-bold text-sm text-foreground">{currentTender.title}</div>
                <div className="text-muted-foreground">{currentTender.method} · Estimated: {pkr(currentTender.estimatedBudgetPkr)}</div>
              </div>

              {/* 1. Technical Evaluation */}
              <div className="border-t pt-3">
                <div className="font-semibold text-foreground mb-2">1. Technical evaluation (Minimum 70 points)</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1">Bidder</th>
                      <th className="text-right py-1">Score</th>
                      <th className="text-right py-1">Technical status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {currentTender.bidders.map((b) => (
                      <tr key={b.id}>
                        <td className="py-1.5">{b.name}</td>
                        <td className="text-right font-mono">{b.techScore}</td>
                        <td className="text-right">
                          <span className={b.techScore >= 70 ? "text-success font-semibold" : "text-destructive"}>
                            {b.techScore >= 70 ? "Qualified" : "Disqualified"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 2. Financial Evaluation */}
              <div className="border-t pt-3">
                <div className="font-semibold text-foreground mb-2">2. Financial evaluation of qualified bidders</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1">Rank</th>
                      <th className="py-1">Bidder</th>
                      <th className="text-right py-1">Evaluated total</th>
                      <th className="text-right py-1">Delivery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    {responsiveBidders
                      .slice()
                      .sort((a, b) => a.evaluatedTotalPkr - b.evaluatedTotalPkr)
                      .map((b, idx) => (
                        <tr key={b.id} className={idx === 0 ? "font-bold bg-muted/40" : ""}>
                          <td className="py-1.5 font-sans">#{idx + 1}</td>
                          <td className="font-sans">{b.name}</td>
                          <td className="text-right">{pkr(b.evaluatedTotalPkr)}</td>
                          <td className="text-right font-sans">{s.bidTerms[b.id]?.delivery ?? "60 days"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* 3. Recommendation */}
              <div className="rounded-lg bg-gold/15 p-3 border border-gold/40 text-gold-text">
                <div className="font-bold flex items-center gap-1.5">
                  <Trophy className="size-4" /> Recommendation for Award: {winner?.name}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Lowest evaluated responsive bidder adhering to all technical specifications and commercial terms.
                </div>
              </div>

              {/* 4. Committee Signatures */}
              <div className="border-t pt-3">
                <div className="font-semibold text-foreground mb-2">3. Committee members sign-off</div>
                <div className="grid grid-cols-3 gap-2">
                  {currentTender.committee.map((c) => (
                    <div key={c.name} className="border rounded p-2 text-[11px]">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-muted-foreground">{c.role}</div>
                      <div className="text-success mt-1 flex items-center gap-0.5">
                        <Check className="size-3" /> Signed & declared
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DocPaper>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setBerOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                window.print();
              }}
            >
              Print / Save PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------- MODAL: RFQ COMPARATIVE STATEMENT (CST) ----------------- */}
      <Dialog open={rfqCstOpen} onOpenChange={setRfqCstOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" /> Comparative statement (CST) · {rfq.id}
            </DialogTitle>
            <DialogDescription>
              Automatic 18% sales tax normalization applied so all bids compare on a uniform basis.
            </DialogDescription>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Quoted base</TableHead>
                <TableHead className="text-right">Sales tax (18%)</TableHead>
                <TableHead className="text-right">Evaluated total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfqQuotes
                .map((q) => {
                  const v = s.vendors.find((x) => x.id === q.vendorId)!;
                  const tax = q.base * 0.18;
                  const total = q.base * 1.18;
                  return { ...q, vendor: v, tax, total };
                })
                .sort((a, b) => a.total - b.total)
                .map((row, idx) => {
                  const isTop = idx === 0;
                  return (
                    <TableRow key={row.vendorId} className={cn(isTop && "bg-gold/15 font-semibold")}>
                      <TableCell>
                        {isTop ? <Status tone="gold" icon={Trophy}>#1 L1</Status> : `#${idx + 1}`}
                      </TableCell>
                      <TableCell className="text-xs">{row.vendor.name}</TableCell>
                      <TableCell className="text-right font-mono text-xs tabular">{num(row.base)}</TableCell>
                      <TableCell className="text-right font-mono text-xs tabular text-muted-foreground">
                        {num(row.tax)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular text-primary">
                        {pkr(row.total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRfqCstOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                toast.success("Comparative statement finalized", {
                  description: "Ready for purchase order release.",
                });
                setRfqCstOpen(false);
              }}
            >
              Approve comparative statement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
