"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer, QrCode, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { asset } from "@/lib/nav";

/* Scannable QR asset label (FR-2.6). The code resolves to the live Item Code trace. */
export function QrLabelDialog({ code, title, sub, onClose }: { code: string | null; title?: string; sub?: string; onClose: () => void }) {
  const [src, setSrc] = useState<string>("");
  const url = code && typeof window !== "undefined" ? `${window.location.origin}${asset(`/trace/?code=${encodeURIComponent(code)}`)}` : "";
  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: "M", color: { dark: "#0b3d2a", light: "#ffffff" } }).then(setSrc).catch(() => setSrc(""));
  }, [url]);

  const print = () => {
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${code}</title><style>body{font-family:system-ui,sans-serif;margin:0;display:flex;justify-content:center;padding:24px}.l{border:2px solid #0b3d2a;border-radius:10px;padding:14px;width:300px;text-align:center}img.q{width:220px;height:220px}.c{font:700 15px ui-monospace,monospace;color:#0b3d2a;margin-top:6px}.t{font-size:12px;margin-top:4px}.s{font-size:10px;color:#555;margin-top:2px}.h{display:flex;align-items:center;gap:8px;justify-content:center;font:700 11px system-ui;letter-spacing:.06em;margin-bottom:8px}.h img{height:26px}</style></head><body><div class="l"><div class="h"><img src="${window.location.origin}${asset("/pcb-logo.svg")}"/>PAKISTAN CRICKET BOARD</div><img class="q" src="${src}"/><div class="c">${code}</div><div class="t">${title ?? ""}</div><div class="s">${sub ?? ""}</div></div><script>onload=()=>{print();}</script></body></html>`);
    w.document.close();
  };

  return (
    <Dialog open={!!code} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><QrCode className="size-5 text-primary" /> Asset label</DialogTitle>
          <DialogDescription>Scan with any phone camera to open this Item Code&apos;s live trace.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-xl border-2 border-dashed border-primary/40 bg-muted/20 p-5 text-center">
          <div className="mx-auto flex size-48 items-center justify-center rounded-lg border bg-white p-2 shadow-sm">
            {src ? <img src={src} alt={`QR code for ${code}`} className="size-full" /> : <QrCode className="size-10 animate-pulse text-muted-foreground" />}
          </div>
          <div>
            <div className="font-mono text-sm font-bold text-primary">{code}</div>
            {title && <div className="truncate text-xs font-medium">{title}</div>}
            {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"><Smartphone className="size-3.5" />{url.replace(/^https?:\/\//, "")}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={print} disabled={!src}><Printer /> Print label</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
