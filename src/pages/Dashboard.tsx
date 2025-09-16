import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { LogOut, Package, Truck, Store, Eye, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function Dashboard() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [openCreate, setOpenCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ batchId: string; qrCode: string } | null>(null);

  const [produceType, setProduceType] = useState<string>("");
  const [cropVariety, setCropVariety] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<string>("kg");
  const [qualityGrade, setQualityGrade] = useState<string>("");
  const [expectedPrice, setExpectedPrice] = useState<string>("");
  const [harvestDate, setHarvestDate] = useState<string>("");
  const [farmLocation, setFarmLocation] = useState<string>(""); // initialize empty, sync from user below
  const [notes, setNotes] = useState<string>("");

  const createBatch = useMutation(api.batches.createBatch);
  const myBatches = useQuery(api.batches.getUserBatches, {}) ?? [];

  useEffect(() => {
    if (user?.location && !farmLocation) {
      setFarmLocation(user.location);
    }
  }, [user?.location]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Use farmer as the default role for new/guest users
  const role = user.role ?? "farmer";

  const getRoleIcon = () => {
    switch (role) {
      case "farmer":
        return <Package className="h-8 w-8" />;
      case "distributor":
        return <Truck className="h-8 w-8" />;
      case "retailer":
        return <Store className="h-8 w-8" />;
      case "government":
        return <Eye className="h-8 w-8" />;
      default:
        return <BarChart3 className="h-8 w-8" />;
    }
  };

  const getRoleTitle = () => {
    switch (role) {
      case "farmer":
        return "Farmer Portal";
      case "distributor":
        return "Distributor Dashboard";
      case "retailer":
        return "Retailer Interface";
      case "government":
        return "Government Dashboard";
      default:
        return "Dashboard";
    }
  };

  const getQuickActions = () => {
    switch (role) {
      case "farmer":
        return [
          { label: "Add New Produce", action: () => setOpenCreate(true), primary: true },
          { label: "View My Produce History", action: () => {
              const el = document.getElementById("my-produce-history");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          },
          { label: "Sales History", action: () => toast("Coming soon") },
        ];
      case "distributor":
        return [
          { label: "Receive Batch", action: () => navigate("/batches/receive"), primary: true },
          { label: "My Inventory", action: () => navigate("/batches") },
          { label: "Transfer History", action: () => navigate("/transfers") },
        ];
      case "retailer":
        return [
          { label: "Receive Batch", action: () => navigate("/batches/receive"), primary: true },
          { label: "My Products", action: () => navigate("/batches") },
          { label: "Mark as Sold", action: () => navigate("/sales") },
        ];
      case "government":
        return [
          { label: "View All Batches", action: () => navigate("/batches"), primary: true },
          { label: "Analytics", action: () => navigate("/analytics") },
          { label: "Export Reports", action: () => navigate("/reports") },
        ];
      default:
        return [];
    }
  };

  const resetForm = () => {
    setProduceType("");
    setCropVariety("");
    setQuantity("");
    setUnit("kg");
    setQualityGrade("");
    setExpectedPrice("");
    setHarvestDate("");
    setFarmLocation(user?.location || "");
    setNotes("");
    setSuccessData(null);
  };

  const handleSubmit = async () => {
    if (!produceType || !cropVariety || !quantity || !qualityGrade || !expectedPrice || !harvestDate) {
      toast("Please fill all required fields.");
      return;
    }
    const qty = Number(quantity);
    const price = Number(expectedPrice);
    if (Number.isNaN(qty) || qty <= 0) {
      toast("Quantity must be a valid positive number.");
      return;
    }
    if (Number.isNaN(price) || price <= 0) {
      toast("Expected price must be a valid positive number.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await createBatch({
        cropVariety: `${produceType} - ${cropVariety}`,
        quantity: qty,
        unit,
        qualityGrade,
        harvestDate: new Date(harvestDate).getTime(),
        expectedPrice: price,
        farmLocation: farmLocation || undefined,
        notes: notes || undefined,
      });
      setSuccessData(result);
      toast("Produce batch successfully listed!");
    } catch (e) {
      console.error(e);
      toast("Failed to submit batch. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
                <h1 className="text-xl font-semibold tracking-tight">{getRoleTitle()}</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  {getRoleIcon()}
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {role === "farmer" && "Manage Your Crops"}
                    {role === "distributor" && "Handle Distribution"}
                    {role === "retailer" && "Manage Retail Operations"}
                    {role === "government" && "Monitor Supply Chain"}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1">
                    {role === "farmer" && "Create batches, track sales, and manage your farm operations"}
                    {role === "distributor" && "Receive, transport, and transfer agricultural products"}
                    {role === "retailer" && "Manage inventory and track product origins"}
                    {role === "government" && "Oversee agricultural supply chain transparency"}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {getQuickActions().map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <Button
                      variant={action.primary ? "default" : "outline"}
                      className="w-full h-auto py-4"
                      onClick={action.action}
                    >
                      {action.label}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Farmer: Create Produce Dialog */}
          {role === "farmer" && (
            <Dialog open={openCreate} onOpenChange={(o) => {
              setOpenCreate(o);
              if (!o) resetForm();
            }}>
              <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                  <DialogTitle>{successData ? "Batch Created" : "Add New Produce"}</DialogTitle>
                </DialogHeader>

                {!successData ? (
                  <div className="grid gap-4 max-h-[70vh] overflow-auto pr-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Produce Type</Label>
                        <Select value={produceType} onValueChange={setProduceType}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Rice">Rice</SelectItem>
                            <SelectItem value="Wheat">Wheat</SelectItem>
                            <SelectItem value="Tomato">Tomato</SelectItem>
                            <SelectItem value="Potato">Potato</SelectItem>
                            <SelectItem value="Onion">Onion</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Crop Variety</Label>
                        <Input className="mt-1" value={cropVariety} onChange={(e) => setCropVariety(e.target.value)} placeholder="e.g., Basmati, Heirloom" />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input className="mt-1" type="number" min={0} step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 500" />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Select value={unit} onValueChange={setUnit}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select unit" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="quintal">quintal</SelectItem>
                            <SelectItem value="liter">liter</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quality Grade</Label>
                        <Select value={qualityGrade} onValueChange={setQualityGrade}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select grade" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Grade A">Grade A</SelectItem>
                            <SelectItem value="Grade B">Grade B</SelectItem>
                            <SelectItem value="Grade C">Grade C</SelectItem>
                            <SelectItem value="Organic">Organic</SelectItem>
                            <SelectItem value="Conventional">Conventional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Expected Price (per unit)</Label>
                        <Input className="mt-1" type="number" min={0} step="0.01" value={expectedPrice} onChange={(e) => setExpectedPrice(e.target.value)} placeholder="e.g., 3.50" />
                      </div>
                      <div>
                        <Label>Harvest Date</Label>
                        <Input className="mt-1" type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Farm Location</Label>
                        <Input className="mt-1" value={farmLocation} onChange={(e) => setFarmLocation(e.target.value)} placeholder="Village / District, State" />
                      </div>
                    </div>
                    <div>
                      <Label>Additional Notes (optional)</Label>
                      <Textarea className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Handling, certifications, etc." />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">Produce batch successfully listed!</div>
                    <div className="rounded-lg border p-4">
                      <div className="text-sm">
                        <div><span className="font-medium">Batch ID:</span> {successData.batchId}</div>
                        <div className="mt-2">
                          <span className="font-medium">Trace QR:</span>
                        </div>
                        <div className="mt-3 flex items-center gap-4">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(successData.qrCode)}`}
                            alt="Batch QR"
                            className="h-36 w-36 border rounded bg-white"
                          />
                          <div className="text-xs break-all text-muted-foreground max-w-[280px]">
                            {successData.qrCode}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <DialogFooter className="mt-2">
                  {!successData ? (
                    <>
                      <Button variant="ghost" onClick={() => { resetForm(); }} disabled={submitting}>
                        Clear Form
                      </Button>
                      <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "Submitting..." : "Submit"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => {
                        window.open(`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(successData.qrCode)}`, "_blank");
                      }}>
                        Download QR
                      </Button>
                      <Button onClick={() => { setOpenCreate(false); resetForm(); }}>
                        Done
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Farmer: My Produce History */}
          {role === "farmer" && (
            <Card id="my-produce-history">
              <CardHeader>
                <CardTitle>My Produce History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {myBatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No batches yet. Create your first batch.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-muted-foreground">
                        <tr className="border-b">
                          <th className="py-2 pr-4">Batch ID</th>
                          <th className="py-2 pr-4">Variety</th>
                          <th className="py-2 pr-4">Qty</th>
                          <th className="py-2 pr-4">Price</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-4">Submitted</th>
                          <th className="py-2 pr-4">QR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myBatches.map((b) => (
                          <tr key={b._id} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-mono">{b.batchId}</td>
                            <td className="py-2 pr-4">{b.cropVariety}</td>
                            <td className="py-2 pr-4">{b.quantity} {b.unit}</td>
                            <td className="py-2 pr-4">{typeof b.expectedPrice === "number" ? b.expectedPrice.toFixed(2) : "-"}</td>
                            <td className="py-2 pr-4 capitalize">{String(b.status).replace(/_/g, " ")}</td>
                            <td className="py-2 pr-4">{new Date(b._creationTime).toLocaleDateString()}</td>
                            <td className="py-2 pr-4">
                              <Button variant="outline" size="sm" onClick={() => {
                                window.open(`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(b.qrCode)}`, "_blank");
                              }}>
                                View QR
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Role-specific Information */}
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {role === "farmer" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    1. Create a new crop batch with harvest details
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Generate QR codes for traceability
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Transfer batches to distributors when sold
                  </p>
                </div>
              )}
              {role === "distributor" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    1. Receive batches from farmers by scanning QR codes
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Update transport and handling status
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Transfer to retailers when ready
                  </p>
                </div>
              )}
              {role === "retailer" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    1. Receive products from distributors
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. View complete product journey and pricing
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Mark products as sold to complete the chain
                  </p>
                </div>
              )}
              {role === "government" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    1. Monitor all agricultural transactions in real-time
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Generate compliance and audit reports
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Track pricing trends and detect anomalies
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}