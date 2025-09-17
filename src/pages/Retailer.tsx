import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Retailer() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [queryId, setQueryId] = useState<string>("");
  const [enteredId, setEnteredId] = useState<string>("");

  const batch = useQuery(
    api.batches.getBatchById,
    queryId ? { batchId: queryId } : (undefined as any),
  );
  const pendingBatches = useQuery(api.batches.getPendingBatchesForRetailer, {}); // NEW
  const acceptPending = useMutation(api.batches.retailerAcceptBatch); // NEW
  const updateStatus = useMutation(api.batches.updateBatchStatus); // ADD: wire retailer update

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const loadingBatch = queryId !== "" && batch === undefined;

  const canEdit = useMemo(() => {
    if (!user || !batch) return false;
    // Only allow edit if current user owns the batch (already accepted)
    return String(batch.currentOwnerId) === String(user._id);
  }, [user, batch]);

  // QR scanner state and refs
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

  // Retailer update form state
  const [status, setStatus] = useState<string>("with_retailer");
  const [retailPrice, setRetailPrice] = useState<string>("");
  const [shelfLocation, setShelfLocation] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (batch) {
      // Initialize form with current batch values
      setStatus(String(batch.status));
      setRetailPrice(typeof batch.retailPrice === "number" ? String(batch.retailPrice) : "");
      setShelfLocation(batch.shelfLocation || "");
      // Keep existing notes visible but editable
      setNotes(batch.notes || "");
    }
  }, [batch]);

  const handleFetch = () => {
    if (!enteredId.trim()) {
      toast("Please enter a batch ID.");
      return;
    }
    setQueryId(enteredId.trim());
  };

  const handleSubmitUpdate = async () => {
    if (!batch) return;

    const priceNum = retailPrice ? Number(retailPrice) : undefined;
    if (retailPrice && (Number.isNaN(priceNum) || (priceNum as number) <= 0)) {
      toast("Retail price must be a valid positive number.");
      return;
    }

    try {
      await updateStatus({
        batchId: batch.batchId,
        status: status as any,
        retailPrice: priceNum,
        shelfLocation: shelfLocation || undefined,
        notes: notes || undefined,
      });
      toast("Batch info updated!");
    } catch (e) {
      console.error(e);
      toast("Failed to update batch. Please try again.");
    }
  };

  const handleClaim = async (id: string) => {
    try {
      await acceptPending({ batchId: id });
      toast("You now own this batch and can update its info.");
      setQueryId(id);
    } catch (e) {
      console.error(e);
      toast("Failed to accept batch. Ensure it is assigned to you.");
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
                <h1 className="text-xl font-semibold tracking-tight">Retailer Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome, {user.name}
                </p>
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-8"
        >
          {/* Pending Batches to Accept */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Batches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!pendingBatches || pendingBatches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending transfers. Ask your distributor to assign a batch to you.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-2 pr-4">Batch ID</th>
                        <th className="py-2 pr-4">Crop</th>
                        <th className="py-2 pr-4">Qty</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingBatches.map((b) => (
                        <tr key={String(b._id)} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-mono">{b.batchId}</td>
                          <td className="py-2 pr-4">{b.cropVariety}</td>
                          <td className="py-2 pr-4">
                            {b.quantity} {b.unit}
                          </td>
                          <td className="py-2 pr-4 capitalize">
                            {String(b.status).replace(/_/g, " ")}
                          </td>
                          <td className="py-2 pr-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEnteredId(b.batchId);
                                  setQueryId(b.batchId);
                                }}
                                variant="outline"
                              >
                                View
                              </Button>
                              <Button size="sm" onClick={() => handleClaim(b.batchId)}>
                                Accept
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Collect Package</CardTitle>
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
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={startScanner}>Scan QR Code</Button>
                  <p className="text-xs text-muted-foreground">
                    Tip: If scanning isn't supported, enter the code manually.
                  </p>
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
                <p className="text-xs text-muted-foreground">
                  Tip: Ask your distributor to transfer ownership to you to enable editing.
                </p>
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
                <p className="text-xs text-muted-foreground">
                  View all batches currently owned by you.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Batch Details */}
          <Card>
            <CardHeader>
              <CardTitle>Batch Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!queryId ? (
                <p className="text-sm text-muted-foreground">
                  Enter a batch ID to view details.
                </p>
              ) : loadingBatch ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  Loading batch details...
                </div>
              ) : !batch ? (
                <p className="text-sm text-muted-foreground">No batch found for this ID.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <div className="text-xs text-muted-foreground">Previous Price</div>
                        <div>
                          {typeof batch.distributorPrice === "number"
                            ? batch.distributorPrice.toFixed(2)
                            : typeof batch.farmerPrice === "number"
                              ? batch.farmerPrice.toFixed(2)
                              : "-"}
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
                  </div>

                  <div className="space-y-4">
                    {/* Claim banner if pending for this retailer */}
                    {String(batch.status) === "in_transit_to_retailer" &&
                      batch.pendingOwnerId &&
                      String(batch.pendingOwnerId) === String(user._id) && (
                        <div className="rounded-md border p-3 bg-amber-50 text-amber-900">
                          <div className="text-sm font-medium">Pending Acceptance</div>
                          <div className="text-xs mt-1">
                            This batch is assigned to you but awaits your acceptance.
                          </div>
                          <div className="mt-2">
                            <Button size="sm" onClick={() => handleClaim(batch.batchId)}>
                              Accept This Batch
                            </Button>
                          </div>
                        </div>
                      )}

                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Trace QR</div>
                      <div className="flex items-center gap-4">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(batch.qrCode)}`}
                          alt="Trace QR"
                          className="h-36 w-36 border rounded bg-white"
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

                    {/* Retailer Update Form */}
                    <div className="pt-2 border-t">
                      <div className="text-sm font-medium mb-2">Update Retailer Info</div>
                      {!canEdit ? (
                        <p className="text-xs text-muted-foreground">
                          You cannot update this batch because you're not the current owner.
                          Ask the distributor to transfer it to you.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="with_retailer">Available (With Retailer)</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Retail Price</Label>
                            <Input
                              className="mt-1"
                              type="number"
                              min={0}
                              step="0.01"
                              value={retailPrice}
                              onChange={(e) => setRetailPrice(e.target.value)}
                              placeholder="e.g., 5.99"
                            />
                          </div>
                          <div>
                            <Label>Shelf Location</Label>
                            <Input
                              className="mt-1"
                              value={shelfLocation}
                              onChange={(e) => setShelfLocation(e.target.value)}
                              placeholder="Aisle 3, Shelf B"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Notes</Label>
                            <Textarea
                              className="mt-1"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Optional handling/availability info"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Button onClick={handleSubmitUpdate}>
                              Submit Update
                            </Button>
                          </div>
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