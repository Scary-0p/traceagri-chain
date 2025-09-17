import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Package, Truck, Store, DollarSign, MapPin, Calendar } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function Marketplace() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [cropFilter, setCropFilter] = useState<string>("");
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<Id<"listings"> | null>(null);

  // Listing form state
  const [batchId, setBatchId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<string>("kg");
  const [expectedPrice, setExpectedPrice] = useState<string>("");
  const [negotiationAllowed, setNegotiationAllowed] = useState<boolean>(true);
  const [specialTerms, setSpecialTerms] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Bid form state
  const [pricePerUnit, setPricePerUnit] = useState<string>("");
  const [minQuantity, setMinQuantity] = useState<string>("");
  const [maxQuantity, setMaxQuantity] = useState<string>("");
  const [pickupProposal, setPickupProposal] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [comments, setComments] = useState<string>("");

  // Queries and mutations
  const openListings = useQuery(api.marketplace.listOpenListings, { 
    cropVariety: cropFilter || undefined 
  });
  const myListings = useQuery(api.marketplace.getMyListings, {});
  const myBids = useQuery(api.marketplace.getMyBids, {});

  const createListing = useMutation(api.marketplace.createListing);
  const placeBid = useMutation(api.marketplace.placeBid);
  const acceptBid = useMutation(api.marketplace.acceptBid);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const role = user.role ?? "farmer";

  const handleCreateListing = async () => {
    if (!batchId || !quantity || !expectedPrice) {
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
      await createListing({
        batchId: batchId.trim(),
        quantity: qty,
        unit,
        expectedPrice: price,
        negotiationAllowed,
        specialTerms: specialTerms || undefined,
        description: description || undefined,
      });
      toast("Listing created successfully!");
      setBatchId("");
      setQuantity("");
      setExpectedPrice("");
      setSpecialTerms("");
      setDescription("");
    } catch (e) {
      console.error(e);
      toast("Failed to create listing. Please try again.");
    }
  };

  const handlePlaceBid = async () => {
    if (!selectedListingId || !pricePerUnit) {
      toast("Please fill required fields.");
      return;
    }

    const price = Number(pricePerUnit);
    const minQty = minQuantity ? Number(minQuantity) : undefined;
    const maxQty = maxQuantity ? Number(maxQuantity) : undefined;

    if (Number.isNaN(price) || price <= 0) {
      toast("Price must be a valid positive number.");
      return;
    }

    try {
      await placeBid({
        listingId: selectedListingId,
        pricePerUnit: price,
        minQuantity: minQty,
        maxQuantity: maxQty,
        pickupProposal: pickupProposal || undefined,
        paymentTerms: paymentTerms || undefined,
        comments: comments || undefined,
      });
      toast("Bid placed successfully!");
      setBidDialogOpen(false);
      setPricePerUnit("");
      setMinQuantity("");
      setMaxQuantity("");
      setPickupProposal("");
      setPaymentTerms("");
      setComments("");
    } catch (e) {
      console.error(e);
      toast("Failed to place bid. Please try again.");
    }
  };

  const handleAcceptBid = async (listingId: Id<"listings">, bidId: Id<"bids">) => {
    if (!window.confirm("Are you sure you want to accept this bid? This will lock in the deal and reject all other bids.")) {
      return;
    }

    try {
      await acceptBid({ listingId, bidId });
      toast("Bid accepted! Order confirmed.");
    } catch (e) {
      console.error(e);
      toast("Failed to accept bid. Please try again.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="default">Open for Bids</Badge>;
      case "locked_in":
        return <Badge variant="secondary">Order Confirmed</Badge>;
      case "sold":
        return <Badge variant="outline">Completed</Badge>;
      case "pending":
        return <Badge variant="default">Pending</Badge>;
      case "accepted":
        return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
                <h1 className="text-xl font-semibold tracking-tight">Marketplace</h1>
                <p className="text-sm text-muted-foreground">
                  Buy and sell agricultural produce
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
        >
          <Tabs defaultValue="browse" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="browse">Browse Produce</TabsTrigger>
              <TabsTrigger value="list">List Produce</TabsTrigger>
              <TabsTrigger value="orders">My Orders/Bids</TabsTrigger>
            </TabsList>

            {/* Browse Produce Tab */}
            <TabsContent value="browse" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Available Produce
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label>Filter by Crop Variety</Label>
                      <Input
                        className="mt-1"
                        placeholder="e.g., Rice, Tomato, Wheat..."
                        value={cropFilter}
                        onChange={(e) => setCropFilter(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {!openListings || openListings.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        No open listings available.
                      </div>
                    ) : (
                      openListings.map((listing) => (
                        <Card key={listing._id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <h3 className="font-medium">{listing.cropVariety}</h3>
                              {getStatusBadge(listing.status)}
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span>{listing.quantity} {listing.unit}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span>{listing.expectedPrice.toFixed(2)} per {listing.unit}</span>
                              </div>
                              {listing.farmer && (
                                <div className="flex items-center gap-2">
                                  <Store className="h-4 w-4 text-muted-foreground" />
                                  <span>{listing.farmer.name}</span>
                                </div>
                              )}
                              {listing.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>{listing.location}</span>
                                </div>
                              )}
                            </div>

                            {listing.description && (
                              <p className="text-xs text-muted-foreground">
                                {listing.description}
                              </p>
                            )}

                            {role === "distributor" && (
                              <Button
                                className="w-full"
                                onClick={() => {
                                  setSelectedListingId(listing._id);
                                  setBidDialogOpen(true);
                                }}
                              >
                                Place Bid
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* List Produce Tab */}
            <TabsContent value="list" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Create New Listing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {role !== "farmer" ? (
                    <p className="text-sm text-muted-foreground">
                      Only farmers can create listings. Please switch to a farmer account.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Batch ID *</Label>
                        <Input
                          className="mt-1"
                          placeholder="BATCH_..."
                          value={batchId}
                          onChange={(e) => setBatchId(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Create batch in Dashboard first, then enter its ID here.
                        </p>
                      </div>
                      <div>
                        <Label>Quantity *</Label>
                        <Input
                          className="mt-1"
                          type="number"
                          min={0}
                          step="0.01"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="e.g., 500"
                        />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Input
                          className="mt-1"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          placeholder="kg, quintal, liter"
                        />
                      </div>
                      <div>
                        <Label>Expected Price (per unit) *</Label>
                        <Input
                          className="mt-1"
                          type="number"
                          min={0}
                          step="0.01"
                          value={expectedPrice}
                          onChange={(e) => setExpectedPrice(e.target.value)}
                          placeholder="e.g., 3.50"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Special Terms</Label>
                        <Input
                          className="mt-1"
                          value={specialTerms}
                          onChange={(e) => setSpecialTerms(e.target.value)}
                          placeholder="Payment terms, delivery requirements, etc."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          className="mt-1"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Additional details about the produce..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Button onClick={handleCreateListing}>
                          Create Listing
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* My Orders/Bids Tab */}
            <TabsContent value="orders" className="space-y-6">
              {role === "farmer" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>My Listings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!myListings || myListings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No listings yet. Create your first listing.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {myListings.map((listing) => (
                          <Card key={listing._id} className="border-l-4 border-l-primary">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h3 className="font-medium">{listing.cropVariety}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {listing.quantity} {listing.unit} at {listing.expectedPrice.toFixed(2)} per unit
                                  </p>
                                </div>
                                {getStatusBadge(listing.status)}
                              </div>

                              {listing.acceptedBid && (
                                <div className="mt-3 p-3 bg-green-50 rounded-md">
                                  <p className="text-sm font-medium text-green-800">
                                    Order Confirmed
                                  </p>
                                  <p className="text-sm text-green-700">
                                    Accepted bid: {listing.finalPrice?.toFixed(2)} per unit
                                    {listing.acceptedBid.distributor && 
                                      ` from ${listing.acceptedBid.distributor.name}`
                                    }
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>My Bids</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!myBids || myBids.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No bids placed yet. Browse produce to place your first bid.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {myBids.map((bid) => (
                          <Card key={bid._id} className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h3 className="font-medium">
                                    {bid.listing?.cropVariety || "Unknown Crop"}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    Bid: {bid.pricePerUnit.toFixed(2)} per unit
                                    {bid.listing?.farmer && 
                                      ` • Farmer: ${bid.listing.farmer.name}`
                                    }
                                  </p>
                                </div>
                                {getStatusBadge(bid.status)}
                              </div>

                              {bid.comments && (
                                <p className="text-sm text-muted-foreground">
                                  "{bid.comments}"
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* Bid Dialog */}
      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Place Bid</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Price per Unit *</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                step="0.01"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                placeholder="e.g., 4.00"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Quantity</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label>Max Quantity</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  value={maxQuantity}
                  onChange={(e) => setMaxQuantity(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <Label>Pickup Proposal</Label>
              <Input
                className="mt-1"
                value={pickupProposal}
                onChange={(e) => setPickupProposal(e.target.value)}
                placeholder="e.g., Within 3 days, own transport"
              />
            </div>
            <div>
              <Label>Payment Terms</Label>
              <Input
                className="mt-1"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g., Net 30, Cash on delivery"
              />
            </div>
            <div>
              <Label>Comments</Label>
              <Textarea
                className="mt-1"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Additional notes or requirements..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBidDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePlaceBid}>
              Place Bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
