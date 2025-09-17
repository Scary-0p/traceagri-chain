import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function Trace() {
  const navigate = useNavigate();
  const { batchId } = useParams();

  // Add consumer portal state for entering/scanning codes
  const [enteredId, setEnteredId] = useState<string>("");
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  // Add modal state for transaction detail view
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Helper to parse batch id from QR contents or URL
  const parseBatchId = (raw: string): string | null => {
    try {
      // If QR contains a full URL (e.g., https://.../trace/BATCH_...), extract last segment
      const url = new URL(raw);
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "trace");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    } catch {
      // Not a URL. If it looks like a code itself:
      if (raw.startsWith("BATCH_")) return raw;
    }
    return null;
  };

  // Helpers for role display and icons
  const roleMeta = (role?: string) => {
    switch (role) {
      case "farmer":
        return { label: "Farmer", icon: "👨‍🌾", color: "bg-green-100 text-green-900 border-green-200" };
      case "distributor":
        return { label: "Distributor", icon: "🚚", color: "bg-blue-100 text-blue-900 border-blue-200" };
      case "retailer":
        return { label: "Retailer", icon: "🏬", color: "bg-purple-100 text-purple-900 border-purple-200" };
      case "government":
        return { label: "Government", icon: "🏛️", color: "bg-amber-100 text-amber-900 border-amber-200" };
      default:
        return { label: "User", icon: "👤", color: "bg-muted text-foreground/80 border-border" };
    }
  };
  const safeDisplayName = (name?: string | null, role?: string | null) => {
    const meta = roleMeta(role || undefined);
    if (name && name.trim().length > 0) return name;
    if (role === "farmer") return `${meta.label} (unnamed)`;
    if (role === "distributor") return `${meta.label} (unnamed)`;
    if (role === "retailer") return `${meta.label} (unnamed)`;
    return meta.label;
  };
  const formatPrice = (p?: number | null) => (typeof p === "number" ? `₹${p.toFixed(2)}` : "—");

  const handleGo = () => {
    const id = enteredId.trim();
    if (!id) {
      toast("Please enter a batch code.");
      return;
    }
    navigate(`/trace/${id}`);
  };

  const startScanner = async () => {
    if (!(window as any).BarcodeDetector) {
      toast("QR scanning not supported in this browser. Please enter the code manually.");
      return;
    }
    setScannerOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });

      const scan = async () => {
        if (!videoRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          if (results && results.length > 0) {
            const rawValue = results[0].rawValue as string;
            const id = parseBatchId(rawValue);
            if (id) {
              stopScanner();
              navigate(`/trace/${id}`);
              return;
            }
          }
        } catch (e) {
          // Soft fail, keep scanning
        }
        rafRef.current = requestAnimationFrame(scan);
      };

      rafRef.current = requestAnimationFrame(scan);
    } catch (e) {
      console.error(e);
      toast("Unable to access camera. Please enter the code manually.");
      stopScanner();
    }
  };

  const stopScanner = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScannerOpen(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const batch = useQuery(
    api.batches.getBatchById,
    batchId ? { batchId } : (undefined as any),
  );

  // Build a sorted timeline from transactions, with safe fallbacks
  const timeline = (batchId && batch)
    ? [...batch.transactions]
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((tx, idx, arr) => {
          const prev = idx > 0 ? arr[idx - 1] : null;
          const priceDelta =
            typeof tx.price === "number" && prev && typeof prev.price === "number"
              ? tx.price - prev.price
              : null;
          const fromRole = tx.fromUser?.role;
          const toRole = tx.toUser?.role;
          const displayRole = toRole || fromRole; // Destination role usually describes step
          const meta = roleMeta(displayRole);
          const whoName = tx.toUser
            ? safeDisplayName(tx.toUser.name, tx.toUser.role)
            : tx.fromUser
              ? safeDisplayName(tx.fromUser.name, tx.fromUser.role)
              : "User";
          // Status label
          const statusLabel = String(tx.transactionType === "status_update" ? tx.newStatus : tx.transactionType)
            .replace(/_/g, " ");
          return {
            meta,
            whoName,
            when: new Date(tx.timestamp).toLocaleString(),
            statusLabel,
            price: tx.price,
            priceDelta,
            tx,
          };
        })
    : [];

  // Fix loading behavior: when no batchId, not loading
  const loading = batchId ? batch === undefined : false;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img
                src="/logo.svg"
                alt="AgriTrace"
                className="h-8 w-8 cursor-pointer"
                onClick={() => navigate("/")}
              />
              <span className="text-xl font-semibold tracking-tight">
                Trace Product
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Back
              </Button>
              <Button variant="outline" onClick={() => navigate("/")}>
                Home
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-6"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Batch Trace</h1>
            {batchId ? (
              <p className="text-sm text-muted-foreground">
                Unique Code: <span className="font-mono">{batchId}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Enter or scan a batch code to see its full journey.
              </p>
            )}
          </div>

          {/* Consumer entry when no code provided */}
          {!batchId && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <Input
                    placeholder="Enter Batch Code (e.g., BATCH_...)"
                    value={enteredId}
                    onChange={(e) => setEnteredId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleGo();
                    }}
                  />
                  <Button onClick={handleGo}>Go</Button>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={startScanner}>
                    Scan QR Code
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Tip: If scanning isn't supported, enter the code manually.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing details view if code present */}
          {batchId && (
            <Card>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    Loading batch details...
                  </div>
                ) : !batch ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      No batch found for this code.
                    </p>
                    <Button variant="outline" onClick={() => navigate("/trace")}>
                      Try another code
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Key batch info */}
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Status</div>
                          <div className="capitalize">
                            {String(batch.status).replace(/_/g, " ")}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Crop Variety</div>
                          <div>{batch.cropVariety}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground">Quantity</div>
                            <div>
                              {batch.quantity} {batch.unit}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Expected Price</div>
                            <div>
                              {typeof batch.expectedPrice === "number"
                                ? batch.expectedPrice.toFixed(2)
                                : "-"}
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Harvest Date</div>
                          <div>{new Date(batch.harvestDate).toLocaleDateString()}</div>
                        </div>
                        {batch.farmLocation ? (
                          <div>
                            <div className="text-xs text-muted-foreground">Farm Location</div>
                            <div>{batch.farmLocation}</div>
                          </div>
                        ) : null}
                        {batch.notes ? (
                          <div>
                            <div className="text-xs text-muted-foreground">Notes</div>
                            <div className="text-sm text-muted-foreground">{batch.notes}</div>
                          </div>
                        ) : null}
                      </div>

                      {/* Right: Farmer + QR */}
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Farmer</div>
                          <div>
                            {batch.farmer
                              ? `${safeDisplayName(batch.farmer.name, "farmer")}${
                                  batch.farmer.farmName ? " • " + batch.farmer.farmName : ""
                                }${batch.farmer.location ? " • " + batch.farmer.location : ""}`
                              : "Farmer"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">Trace QR</div>
                          <div className="flex items-center gap-4">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                batch.qrCode,
                              )}`}
                              alt="Trace QR"
                              className="h-40 w-40 border rounded bg-white"
                            />
                            <Button
                              variant="outline"
                              onClick={() =>
                                window.open(
                                  `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
                                    batch.qrCode,
                                  )}`,
                                  "_blank",
                                )
                              }
                            >
                              Download QR
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Journey Timeline Visualization */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold">Journey</h2>
                      {timeline.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No transactions yet.
                        </p>
                      ) : (
                        <div className="relative">
                          <div className="absolute left-[14px] top-0 bottom-0 w-px bg-border hidden md:block" />
                          <div className="space-y-4">
                            {timeline.map((step, idx) => {
                              const priceClass =
                                typeof step.price === "number"
                                  ? step.priceDelta == null
                                    ? "text-foreground"
                                    : step.priceDelta >= 0
                                    ? "text-green-700"
                                    : "text-red-700"
                                  : "text-muted-foreground";
                              return (
                                <div
                                  key={step.tx._id}
                                  className="relative flex gap-3 md:gap-4"
                                >
                                  {/* Node dot (only on md+) */}
                                  <div className="hidden md:flex flex-col items-center">
                                    <div className={`w-3 h-3 rounded-full bg-primary mt-2`} />
                                  </div>
                                  <div
                                    className={`flex-1 border rounded p-3 md:p-4 bg-card hover:shadow-sm transition cursor-pointer`}
                                    onClick={() => {
                                      setSelectedTx(step.tx);
                                      setDetailsOpen(true);
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg" aria-hidden>{step.meta.icon}</span>
                                        <Badge className={`border ${step.meta.color}`}>
                                          {step.meta.label}
                                        </Badge>
                                        <span className="font-medium">{step.whoName}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {step.when}
                                      </div>
                                    </div>
                                    <div className="mt-2 text-sm flex flex-wrap items-center gap-3">
                                      <span className="capitalize">
                                        {step.statusLabel}
                                      </span>
                                      <span className={`font-medium ${priceClass}`}>
                                        Price: {formatPrice(step.price)}
                                      </span>
                                      {typeof step.priceDelta === "number" && (
                                        <span className={`text-xs ${step.priceDelta >= 0 ? "text-green-700" : "text-red-700"}`}>
                                          {step.priceDelta >= 0 ? "▲" : "▼"} {formatPrice(Math.abs(step.priceDelta))}
                                        </span>
                                      )}
                                      {step.tx.transportMode && (
                                        <span className="text-xs text-muted-foreground">
                                          • Transport: {step.tx.transportMode}
                                        </span>
                                      )}
                                      {step.tx.destination && (
                                        <span className="text-xs text-muted-foreground">
                                          • Destination: {step.tx.destination}
                                        </span>
                                      )}
                                      {step.tx.storageInfo && (
                                        <span className="text-xs text-muted-foreground">
                                          • Storage: {step.tx.storageInfo}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Modal with full step details */}
          {selectedTx && (
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>Step Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium capitalize">
                      {(selectedTx.transactionType === "status_update"
                        ? selectedTx.newStatus
                        : selectedTx.transactionType
                      ).replace(/_/g, " ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(selectedTx.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground">From</div>
                      <div>
                        {selectedTx.fromUser
                          ? `${safeDisplayName(selectedTx.fromUser.name, selectedTx.fromUser.role)} (${roleMeta(selectedTx.fromUser.role).label})`
                          : "Unknown"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">To</div>
                      <div>
                        {selectedTx.toUser
                          ? `${safeDisplayName(selectedTx.toUser.name, selectedTx.toUser.role)} (${roleMeta(selectedTx.toUser.role).label})`
                          : "Unknown"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Price</div>
                      <div>{formatPrice(selectedTx.price)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Status After</div>
                      <div className="capitalize">
                        {String(selectedTx.newStatus).replace(/_/g, " ")}
                      </div>
                    </div>
                    {selectedTx.transportMode && (
                      <div className="md:col-span-1">
                        <div className="text-xs text-muted-foreground">Transport</div>
                        <div>{selectedTx.transportMode}</div>
                      </div>
                    )}
                    {selectedTx.destination && (
                      <div className="md:col-span-1">
                        <div className="text-xs text-muted-foreground">Destination</div>
                        <div>{selectedTx.destination}</div>
                      </div>
                    )}
                    {selectedTx.storageInfo && (
                      <div className="md:col-span-1">
                        <div className="text-xs text-muted-foreground">Storage</div>
                        <div>{selectedTx.storageInfo}</div>
                      </div>
                    )}
                    {selectedTx.notes && (
                      <div className="md:col-span-2">
                        <div className="text-xs text-muted-foreground">Notes</div>
                        <div className="text-muted-foreground">{selectedTx.notes}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </motion.div>
      </main>

      {/* Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={(o) => (o ? startScanner() : stopScanner())}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full bg-black/80 rounded overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={stopScanner}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}