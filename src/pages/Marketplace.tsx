import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import ListingDetailsModal from "@/components/marketplace/ListingDetailsModal";
import PlaceBidDialog from "@/components/marketplace/PlaceBidDialog";
import PriceInsightsDialog from "@/components/marketplace/PriceInsightsDialog";
import BrowseListings from "@/components/marketplace/BrowseListings";
import CreateListingForm from "@/components/marketplace/CreateListingForm";
import MyOrdersBids from "@/components/marketplace/MyOrdersBids";

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

  // Listing Details modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedListingForDetails, setSelectedListingForDetails] = useState<Id<"listings"> | null>(null);

  // Queries and mutations
  const openListings = useQuery(api.marketplace.listOpenListings, { 
    cropVariety: cropFilter || undefined 
  });
  const myListings = useQuery(api.marketplace.getMyListings, {});
  const myBids = useQuery(api.marketplace.getMyBids, {});
  const createListing = useMutation(api.marketplace.createListing);

  // New: price insights dialog state
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsCrop, setInsightsCrop] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const role = user?.role ?? "guest";

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

  // Helper: split lists
  const farmerActiveListings = (myListings ?? []).filter((l) => l.status === "open");
  const farmerHistoryListings = (myListings ?? []).filter((l) => l.status !== "open");

  const distributorActiveBids = (myBids ?? []).filter((b) => b.status === "pending");
  const distributorHistoryBids = (myBids ?? []).filter((b) => b.status !== "pending");

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
              <BrowseListings
                role={role}
                openListings={openListings}
                cropFilter={cropFilter}
                setCropFilter={setCropFilter}
                onOpenDetails={(id) => {
                  setSelectedListingForDetails(id);
                  setDetailsOpen(true);
                }}
                onOpenBidDialog={(id) => {
                  setSelectedListingId(id);
                  setBidDialogOpen(true);
                }}
              />
            </TabsContent>

            {/* List Produce Tab */}
            <TabsContent value="list" className="space-y-6">
              <CreateListingForm
                role={role}
                batchId={batchId}
                setBatchId={setBatchId}
                quantity={quantity}
                setQuantity={setQuantity}
                unit={unit}
                setUnit={setUnit}
                expectedPrice={expectedPrice}
                setExpectedPrice={setExpectedPrice}
                specialTerms={specialTerms}
                setSpecialTerms={setSpecialTerms}
                description={description}
                setDescription={setDescription}
                onCreateListing={handleCreateListing}
              />
            </TabsContent>

            {/* My Orders/Bids Tab */}
            <TabsContent value="orders" className="space-y-6">
              <MyOrdersBids
                role={role}
                myListings={myListings}
                myBids={myBids}
                onCheckPrice={(crop) => {
                  setInsightsCrop(crop);
                  setInsightsOpen(true);
                }}
                onViewDetails={(id) => {
                  setSelectedListingForDetails(id);
                  setDetailsOpen(true);
                }}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* Listing Details Modal */}
      <ListingDetailsModal
        open={detailsOpen}
        onOpenChange={(o) => {
          setDetailsOpen(o);
          if (!o) {
            setSelectedListingForDetails(null);
          }
        }}
        listingId={selectedListingForDetails}
        role={role}
        userEmail={user?.email ?? null}
      />

      {/* Bid Dialog */}
      <PlaceBidDialog
        open={bidDialogOpen}
        onOpenChange={setBidDialogOpen}
        listingId={selectedListingId}
      />

      {/* Insights Dialog */}
      <PriceInsightsDialog
        open={insightsOpen}
        onOpenChange={(o) => {
          setInsightsOpen(o);
          if (!o) setInsightsCrop(null);
        }}
        cropVariety={insightsCrop}
      />
    </div>
  );
}