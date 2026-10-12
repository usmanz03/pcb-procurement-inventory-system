"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { animate, motion, useInView } from "motion/react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Check, Clock, Lock, Minus, Trophy, Undo2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/* ---------- Page header ---------- */
export function PageHeader({ module, title, description, actions }: { module: string; title: string; description: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-text">{module}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-[28px]">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Section card ---------- */
export function Section({ title, description, action, children, className, contentClassName, flush }: {
  title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; contentClassName?: string; flush?: boolean;
}) {
  return (
    <Card className={cn("card-lift gap-0 overflow-hidden py-0", className)}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 border-b-0 px-5 pt-5 pb-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-[15px] font-semibold">{title}</CardTitle>
          {description && <CardDescription className="text-[13px]">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn(flush ? "px-0 pb-0" : "px-5 pb-5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

/* ---------- Status badge: always icon + label, never colour alone ---------- */
export type Tone = "success" | "warning" | "danger" | "info" | "sealed" | "gold" | "neutral";
const TONE: Record<Tone, { cls: string; icon: LucideIcon }> = {
  success: { cls: "text-success bg-success/10 ring-success/25", icon: Check },
  warning: { cls: "text-warning bg-warning/10 ring-warning/25", icon: AlertTriangle },
  danger: { cls: "text-destructive bg-destructive/10 ring-destructive/25", icon: X },
  info: { cls: "text-info bg-info/10 ring-info/25", icon: Clock },
  sealed: { cls: "text-sealed bg-sealed/10 ring-sealed/25", icon: Lock },
  gold: { cls: "text-gold-text bg-gold/12 ring-gold/40", icon: Trophy },
  neutral: { cls: "text-muted-foreground bg-muted ring-border", icon: Minus },
};
export function Status({ tone, children, icon, className }: { tone: Tone; children: React.ReactNode; icon?: LucideIcon | null; className?: string }) {
  const t = TONE[tone];
  const Icon = icon === null ? null : icon ?? t.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", t.cls, className)}>
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}
export const ReturnIcon = Undo2;

/* ---------- Count-up number ---------- */
export function CountUp({ value, decimals = 0, prefix = "", suffix = "" }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const fmt = (v: number) => prefix + v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    const c = animate(0, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => { if (ref.current) ref.current.textContent = fmt(v); } });
    return () => c.stop();
  }, [inView, value, decimals, prefix, suffix]);
  return <span ref={ref} className="tabular">{prefix}{value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

/* ---------- Sparkline ---------- */
export function Sparkline({ data, color = "var(--chart-1)" }: { data: number[]; color?: string }) {
  const id = useRef(`sp${Math.random().toString(36).slice(2, 8)}`).current;
  const rows = data.map((v, i) => ({ i, v }));
  return (
    <ChartContainer config={{ v: { label: "Value", color } }} className="aspect-auto h-9 w-24">
      <AreaChart data={rows} margin={{ top: 4, right: 4, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area dataKey="v" type="monotone" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} isAnimationActive />
      </AreaChart>
    </ChartContainer>
  );
}

/* ---------- KPI card ---------- */
export interface KpiProps {
  label: string; value: number; decimals?: number; prefix?: string; suffix?: string; icon: LucideIcon; hero?: boolean;
  foot?: React.ReactNode; delta?: { dir: "up" | "down" | "flat"; text: string; good?: boolean }; spark?: number[]; sparkColor?: string; href?: string;
}
export function Kpi(k: KpiProps) {
  const good = k.delta?.good ?? k.delta?.dir === "up";
  const DeltaIcon = k.delta?.dir === "up" ? ArrowUpRight : k.delta?.dir === "down" ? ArrowDownRight : Minus;
  const body = (
    <Card className={cn("card-lift group relative h-full gap-3 overflow-hidden px-5 py-4 transition-all duration-200", k.href && "hover:-translate-y-0.5 hover:border-primary/40", k.hero && "border-gold/50")}>
      {k.hero && <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold via-gold/60 to-transparent" />}
      <div className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
        <span>{k.label}</span>
        <span className={cn("flex size-8 items-center justify-center rounded-lg", k.hero ? "bg-gold/15 text-gold-text" : "bg-primary/10 text-primary")}><k.icon className="size-4" /></span>
      </div>
      <div className="font-display text-[34px] font-semibold leading-none tracking-tight">
        {k.prefix && <span className="mr-1 text-base font-medium text-muted-foreground">{k.prefix}</span>}
        <CountUp value={k.value} decimals={k.decimals} suffix={k.suffix} />
      </div>
      <div className="flex items-end justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex min-w-0 flex-col gap-0.5">
          {k.delta && (
            <span className={cn("inline-flex items-center gap-0.5 font-semibold", k.delta.dir === "flat" ? "text-muted-foreground" : good ? "text-success" : "text-destructive")}>
              <DeltaIcon className="size-3.5" />{k.delta.text}
            </span>
          )}
          {k.foot && <span className="truncate">{k.foot}</span>}
        </div>
        {k.spark && <Sparkline data={k.spark} color={k.sparkColor} />}
      </div>
    </Card>
  );
  return k.href ? <Link href={k.href} className="block h-full">{body}</Link> : body;
}

export function KpiGrid({ items }: { items: KpiProps[] }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((k, i) => (
        <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
          <Kpi {...k} />
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- Charts ---------- */
const axis = { tickLine: false, axisLine: false, tickMargin: 8, fontSize: 11 } as const;

export function StackedBars({ data, config, xKey, height = 260, target, valueFormat = (v: number) => `${v}` }: {
  data: Record<string, number | string>[]; config: ChartConfig; xKey: string; height?: number; target?: { value: number; label: string }; valueFormat?: (v: number) => string;
}) {
  const keys = Object.keys(config);
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 4" />
        <XAxis dataKey={xKey} {...axis} />
        <YAxis {...axis} width={44} />
        <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={<ChartTooltipContent formatter={(v, n) => (<div className="flex w-full justify-between gap-6"><span className="text-muted-foreground">{config[n as string]?.label}</span><span className="font-mono font-medium tabular">{valueFormat(Number(v))}</span></div>)} />} />
        <ChartLegend content={<ChartLegendContent />} />
        {target && <ReferenceLine y={target.value} stroke="var(--chart-3)" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: target.label, position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 11 }} />}
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} stackId="a" fill={`var(--color-${k})`} radius={i === keys.length - 1 ? [5, 5, 0, 0] : [0, 0, 0, 0]} maxBarSize={48} stroke="var(--card)" strokeWidth={1} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

export function SingleBars({ data, xKey, yKey, label, color = "var(--chart-1)", height = 240, target, valueFormat = (v: number) => `${v}` }: {
  data: Record<string, number | string>[]; xKey: string; yKey: string; label: string; color?: string; height?: number; target?: { value: number; label: string }; valueFormat?: (v: number) => string;
}) {
  return (
    <ChartContainer config={{ [yKey]: { label, color } }} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 4" />
        <XAxis dataKey={xKey} {...axis} />
        <YAxis {...axis} width={44} />
        <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={<ChartTooltipContent formatter={(v) => (<div className="flex w-full justify-between gap-6"><span className="text-muted-foreground">{label}</span><span className="font-mono font-medium">{valueFormat(Number(v))}</span></div>)} />} />
        {target && <ReferenceLine y={target.value} stroke="var(--chart-3)" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: target.label, position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 11 }} />}
        <Bar dataKey={yKey} fill={`var(--color-${yKey})`} radius={[5, 5, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  );
}

export function AreaTrend({ data, xKey, series, height = 230, valueFormat = (v: number) => `${v}`, target }: {
  data: Record<string, number | string | null>[]; xKey: string; series: { key: string; label: string; color: string; area?: boolean }[]; height?: number; valueFormat?: (v: number) => string; target?: { value: number; label: string };
}) {
  const config: ChartConfig = Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }]));
  const Chart = series.some((s) => s.area) ? AreaChart : LineChart;
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <Chart data={data} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--color-${s.key})`} stopOpacity={0.3} />
              <stop offset="100%" stopColor={`var(--color-${s.key})`} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 4" />
        <XAxis dataKey={xKey} {...axis} />
        <YAxis {...axis} width={48} tickFormatter={(v) => valueFormat(Number(v))} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" formatter={(v, n) => (<div className="flex w-full justify-between gap-6"><span className="text-muted-foreground">{config[n as string]?.label}</span><span className="font-mono font-medium">{valueFormat(Number(v))}</span></div>)} />} />
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {target && <ReferenceLine y={target.value} stroke="var(--chart-3)" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: target.label, position: "insideTopRight", fill: "var(--muted-foreground)", fontSize: 11 }} />}
        {series.map((s) =>
          s.area ? (
            <Area key={s.key} dataKey={s.key} type="monotone" stroke={`var(--color-${s.key})`} strokeWidth={2.25} fill={`url(#fill-${s.key})`} connectNulls dot={false} activeDot={{ r: 4 }} />
          ) : (
            <Line key={s.key} dataKey={s.key} type="monotone" stroke={`var(--color-${s.key})`} strokeWidth={2.25} connectNulls dot={{ r: 3 }} activeDot={{ r: 5 }} />
          )
        )}
      </Chart>
    </ChartContainer>
  );
}

/* Horizontal bar list: label, animated bar, value */
export function BarList({ rows, format = (v: number) => `${v}`, onSelect, max: maxIn }: {
  rows: { name: string; value: number; color?: string; hint?: string }[]; format?: (v: number) => string; onSelect?: (i: number) => void; max?: number;
}) {
  const max = maxIn ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <button
          key={r.name}
          type="button"
          disabled={!onSelect}
          onClick={() => onSelect?.(i)}
          title={r.hint ?? `${r.name}: ${format(r.value)}`}
          className="group grid grid-cols-[minmax(0,10rem)_1fr_4.5rem] items-center gap-3 rounded-md text-left text-[13px] enabled:cursor-pointer disabled:cursor-default"
        >
          <span className="truncate text-muted-foreground group-enabled:group-hover:text-foreground">{r.name}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted">
            <motion.span
              className="block h-full rounded-full"
              style={{ background: r.color ?? "var(--chart-1)" }}
              initial={{ width: 0 }}
              animate={{ width: `${(r.value / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
          </span>
          <span className="text-right font-mono text-xs font-semibold tabular">{format(r.value)}</span>
        </button>
      ))}
    </div>
  );
}

/* SLA / progress bar */
export function Meter({ value, tone = "primary", className }: { value: number; tone?: "primary" | "warning" | "danger" | "gold"; className?: string }) {
  const bg = { primary: "bg-primary", warning: "bg-warning", danger: "bg-destructive", gold: "bg-gold" }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <motion.div className={cn("h-full rounded-full", bg)} initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, value))}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
    </div>
  );
}

/* Horizontal stepper */
export function Stepper({ steps, at }: { steps: string[]; at: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {steps.map((s, i) => (
        <li key={s} className={cn(
          "inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs",
          i < at && "text-foreground",
          i === at && "border-gold font-semibold text-foreground shadow-[0_0_0_3px] shadow-gold/15",
          i > at && "text-muted-foreground"
        )}>
          <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
            i < at ? "bg-primary text-primary-foreground" : i === at ? "bg-gold text-gold-foreground" : "bg-muted text-muted-foreground")}>
            {i < at ? <Check className="size-3" /> : i + 1}
          </span>
          {s}
        </li>
      ))}
    </ol>
  );
}

/* Small labelled value panel */
export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "success" | "warning" | "danger" }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-xl font-semibold tabular", tone === "success" && "text-success", tone === "warning" && "text-warning", tone === "danger" && "text-destructive")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{children}</div>;
}
