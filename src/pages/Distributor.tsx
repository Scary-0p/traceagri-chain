import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Distributor() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [queryId, setQueryId] = useState<string>("");
  const [enteredId, setEnteredId] = useState<string>("");

  const batch = useQuery(api.batches.getBatchById, queryId ? { batchId: queryId } : (undefined as any));
  const retailers = useQuery(api.batches.getUsersByRole, { role: "retailer" });

  const acceptFromFarmer = useMutation(api.batches.acceptBatchFromFarmer);
  const transferToRetailer = useMutation(api.batches.transferBatch);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const loadingBatch = queryId !== "" && batch === undefined;

  const canAcceptFromFarmer = useMemo(() => {
    if (!user || !batch) return false;
    return String(batch.currentOwnerId) !== String(user._id) && !!user.role && user.role === "distributor";
  }, [user, batch]);

  const canTransfer = useMemo(() => {
    if (!user || !batch) return false;
    return String(batch.currentOwnerId) === String(user._id);
    // Only distributor who owns the batch can transfer to retailer
  }, [user, batch]);

  // Scanner (BarcodeDetector)
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const parseBatchId = (raw: string): string | null => {
    try {
      const url = new URL(raw);
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "trace");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    } catch {
      if (raw.startsWith("BATCH_")) return raw;
    }
    return null;
  };

  const startScanner = async () => {
    if (!(window as any).BarcodeDetector) {
      toast("QR scanning not supported. Enter code manually.");
      return;
    }
    setScannerOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
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
              setEnteredId(id);
              setQueryId(id);
              return;
            }
          }
        } catch {}
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);
    } catch (e) {
      console.error(e);
      toast("Unable to access camera.");
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
    return () => stopScanner();
  }, []);

  // Accept form state
  const [transportMode, setTransportMode] = useState<string>("truck");
  const [storageInfo, setStorageInfo] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [acceptNotes, setAcceptNotes] = useState<string>("");
  const [acceptPrice, setAcceptPrice] = useState<string>("");

  // Transfer form state
  const [retailerId, setRetailerId] = useState<string>("");
  const [transferPrice, setTransferPrice] = useState<string>("");
  const [transferNotes, setTransferNotes] = useState<string>("");

  const handleFetch = () => {
    if (!enteredId.trim()) {
      toast("Please enter a batch ID.");
      return;
    }
    setQueryId(enteredId.trim());
  };

  const handleAccept = async () => {
    if (!batch) return;
    const priceNum = acceptPrice ? Number(acceptPrice) : undefined;
    if (acceptPrice && (Number.isNaN(priceNum) || (priceNum as number) <= 0)) {
      toast("Price must be a valid positive number.");
      return;
    }
    try {
      await acceptFromFarmer({
        batchId: batch.batchId,
        price: priceNum,
        transportMode: transportMode || undefined,
        storageInfo: storageInfo || undefined,
        destination: destination || undefined,
        notes: acceptNotes || undefined,
      });
      toast("Batch accepted from farmer.");
      setQueryId(batch.batchId);
    } catch (e) {
      console.error(e);
      toast("Failed to accept batch.");
    }
  };

  const handleTransfer = async () => {
    if (!batch) return;
    if (!retailerId) {
      toast("Select a retailer.");
      return;
    }
    const priceNum = transferPrice ? Number(transferPrice) : undefined;
    if (transferPrice && (Number.isNaN(priceNum) || (priceNum as number) <= 0)) {
      toast("Price must be a valid positive number.");
      return;
    }
    try {
      await transferToRetailer({
        batchId: batch.batchId,
        toUserId: retailerId as any,
        price: priceNum,
        notes: transferNotes || undefined,
      });
      toast("Transferred to retailer.");
      setQueryId(batch.batchId);
      setRetailerId("");
      setTransferPrice("");
      setTransferNotes("");
    } catch (e) {
      console.error(e);
      toast("Failed to transfer batch.");
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img
                src="/logo.svg"
                alt="AgriTrace"
                className="h-8 w-8 cursor-pointer"
                onClick={() => navigate("/")}
              />
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Distributor Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome, {user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="space-y-8">
          {/* Locate / Collect */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Locate or Collect Batch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Enter Batch ID</Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      placeholder="BATCH_..."
                      value={enteredId}
                      onChange={(e) => setEnteredId(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleFetch(); }}
                    />
                    <Button onClick={handleFetch}>Fetch</Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={startScanner}>Scan QR Code</Button>
                  <p className="text-xs text-muted-foreground">Tip: If scanning isn't supported, enter the code.</p>
                </div>
                {scannerOpen && (
                  <div className="space-y-2">
                    <div className="aspect-video w-full bg-black/80 rounded overflow-hidden">
                      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={stopScanner}>Close</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Batches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  Go to My Inventory
                </Button>
                <p className="text-xs text-muted-foreground">View all batches currently owned by you.</p>
              </CardContent>
            </Card>
          </div>

          {/* Batch Details and Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Batch Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!queryId ? (
                <p className="text-sm text-muted-foreground">Enter or scan a batch ID to view details.</p>
              ) : loadingBatch ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  Loading batch details...
                </div>
              ) : !batch ? (
                <p className="text-sm text-muted-foreground">No batch found for this ID.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Batch ID</div>
                      <div className="font-mono">{batch.batchId}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div className="capitalize">{String(batch.status).replace(/_/g, " ")}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Crop Variety</div>
                      <div>{batch.cropVariety}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Quantity</div>
                        <div>{batch.quantity} {batch.unit}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Farmer Price</div>
                        <div>
                          {typeof batch.farmerPrice === "number" ? batch.farmerPrice.toFixed(2) : "-"}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Farmer</div>
                      <div>
                        {batch.farmer
                          ? `${batch.farmer.name}${batch.farmer.farmName ? " • " + batch.farmer.farmName : ""}${batch.farmer.location ? " • " + batch.farmer.location : ""}`
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Harvest Date</div>
                      <div>{new Date(batch.harvestDate).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Accept from Farmer */}
                    <div className="pt-2 border-t">
                      <div className="text-sm font-medium mb-2">Batch Collection (Accept from Farmer)</div>
                      {!canAcceptFromFarmer ? (
                        <p className="text-xs text-muted-foreground">
                          You can accept this batch only if it is currently owned by a farmer.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Transport Mode</Label>
                            <Select value={transportMode} onValueChange={setTransportMode}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="truck">Truck</SelectItem>
                                <SelectItem value="tractor">Tractor</SelectItem>
                                <SelectItem value="cart">Cart</SelectItem>
                                <SelectItem value="van">Van</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Agreed Price (optional)</Label>
                            <Input
                              className="mt-1"
                              type="number"
                              min={0}
                              step="0.01"
                              value={acceptPrice}
                              onChange={(e) => setAcceptPrice(e.target.value)}
                              placeholder="e.g., 20.00"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Storage/Temperature Info (optional)</Label>
                            <Input
                              className="mt-1"
                              value={storageInfo}
                              onChange={(e) => setStorageInfo(e.target.value)}
                              placeholder="e.g., 4°C refrigerated"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Destination (optional)</Label>
                            <Input
                              className="mt-1"
                              value={destination}
                              onChange={(e) => setDestination(e.target.value)}
                              placeholder="e.g., City Market, Warehouse A"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Notes</Label>
                            <Textarea
                              className="mt-1"
                              value={acceptNotes}
                              onChange={(e) => setAcceptNotes(e.target.value)}
                              placeholder="Optional handling/collection notes"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Button onClick={handleAccept}>Submit Collection</Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Transfer to Retailer */}
                    <div className="pt-2 border-t">
                      <div className="text-sm font-medium mb-2">Transfer to Retailer</div>
                      {!canTransfer ? (
                        <p className="text-xs text-muted-foreground">
                          You can transfer only when you currently own this batch.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Retailer</Label>
                            <Select value={retailerId} onValueChange={setRetailerId}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select retailer" />
                              </SelectTrigger>
                              <SelectContent>
                                {(retailers || []).map((r) => (
                                  <SelectItem key={String(r._id)} value={String(r._id)}>
                                    {r.name || r.email || String(r._id)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Transfer Price (optional)</Label>
                            <Input
                              className="mt-1"
                              type="number"
                              min={0}
                              step="0.01"
                              value={transferPrice}
                              onChange={(e) => setTransferPrice(e.target.value)}
                              placeholder="e.g., 25.00"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Notes</Label>
                            <Textarea
                              className="mt-1"
                              value={transferNotes}
                              onChange={(e) => setTransferNotes(e.target.value)}
                              placeholder="Optional remarks for handover"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Button onClick={handleTransfer}>Submit Transfer</Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Transfer History */}
                    <div className="pt-4 mt-2 border-t">
                      <div className="text-sm font-medium mb-2">Transfer History</div>
                      {!batch.transactions || batch.transactions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No transfer records available.</p>
                      ) : (
                        <div className="space-y-3">
                          {batch.transactions
                            .sort((a, b) => a.timestamp - b.timestamp)
                            .map((tx) => (
                              <div key={String(tx._id)} className="rounded-md border p-3">
                                <div className="text-xs text-muted-foreground">
                                  {new Date(tx.timestamp).toLocaleString()}
                                </div>
                                <div className="mt-1 text-sm">
                                  <span className="font-medium">
                                    {tx.fromUser?.name || "Unknown"} ({tx.fromUser?.role || "N/A"})
                                  </span>
                                  {" "}→{" "}
                                  <span className="font-medium">
                                    {tx.toUser?.name || "Unknown"} ({tx.toUser?.role || "N/A"})
                                  </span>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {tx.transactionType === "creation" ? "Creation" : "Transfer/Update"}
                                  {typeof tx.price === "number" ? ` • Price: ${tx.price.toFixed(2)}` : ""}
                                  {tx.notes ? ` • Notes: ${tx.notes}` : ""}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {tx.previousStatus ? `Status: ${String(tx.previousStatus).replace(/_/g, " ")} → ${String(tx.newStatus).replace(/_/g, " ")}` : `Status: ${String(tx.newStatus).replace(/_/g, " ")}`}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}