import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MapPin, Store } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: Id<"listings"> | null;
  role: string;
  userEmail?: string | null;
};

export default function ListingDetailsModal({ open, onOpenChange, listingId, role, userEmail }: Props) {
  const listingDetails = useQuery(
    api.marketplace.getListingDetails,
    listingId ? { listingId } : "skip"
  );

  const acceptBid = useMutation(api.marketplace.acceptBid);
  const placeBid = useMutation(api.marketplace.placeBid);

  const [showInlineBidForm, setShowInlineBidForm] = useState(false);
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [pickupProposal, setPickupProposal] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [comments, setComments] = useState("");

  const isOpenListing = useMemo(
    () => listingDetails?.listing?.status === "open",
    [listingDetails]
  );

  const resetInlineForm = () => {
    setShowInlineBidForm(false);
    setPricePerUnit("");
    setMinQuantity("");
    setMaxQuantity("");
    setPickupProposal("");
    setPaymentTerms("");
    setComments("");
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const cls = "inline-flex items-center rounded px-2 py-0.5 text-xs border";
    switch (status) {
      case "open":
        return <span className={`${cls}`}>Open for Bids</span>;
      case "locked_in":
        return <span className={`${cls}`}>Order Confirmed</span>;
      case "sold":
        return <span className={`${cls}`}>Completed</span>;
      case "pending":
        return <span className={`${cls}`}>Pending</span>;
      case "accepted":
        return <span className={`${cls} bg-green-100 text-green-800 border-green-200`}>Accepted</span>;
      case "rejected":
        return <span className={`${cls} bg-red-100 text-red-800 border-red-200`}>Rejected</span>;
      default:
        return <span className={cls}>{status}</span>;
    }
  };

  const handleAcceptBid = async (bidId: Id<"bids">) => {
    if (!listingDetails?.listing?._id) return;
    if (!window.confirm("Are you sure you want to accept this bid? This will lock in the deal and reject all other bids.")) {
      return;
    }
    try {
      await acceptBid({ listingId: listingDetails.listing._id, bidId });
      toast("Bid accepted! Order confirmed.");
    } catch (e) {
      console.error(e);
      toast("Failed to accept bid. Please try again.");
    }
  };

  const handlePlaceBidInline = async () => {
    if (!listingId || !pricePerUnit) {
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
        listingId,
        pricePerUnit: price,
        minQuantity: minQty,
        maxQuantity: maxQty,
        pickupProposal: pickupProposal || undefined,
        paymentTerms: paymentTerms || undefined,
        comments: comments || undefined,
      });
      toast("Bid placed successfully!");
      setShowInlineBidForm(false);
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

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          resetInlineForm();
        }
      }}
    >
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Listing Details</DialogTitle>
        </DialogHeader>

        {!listingId || !listingDetails ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold">{listingDetails.listing.cropVariety}</div>
                    <div className="text-sm text-muted-foreground">
                      {listingDetails.listing.quantity} {listingDetails.listing.unit} • Ask:{" "}
                      {listingDetails.listing.expectedPrice.toFixed(2)} per {listingDetails.listing.unit}
                    </div>
                  </div>
                  <div>{getStatusBadge(listingDetails.listing.status)}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span>{listingDetails.farmer?.name || "Farmer"}</span>
                  </div>
                  {listingDetails.farmer?.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{listingDetails.farmer.location}</span>
                    </div>
                  )}
                </div>

                {listingDetails.listing.description && (
                  <p className="text-sm text-muted-foreground">{listingDetails.listing.description}</p>
                )}
              </CardContent>
            </Card>

            <div>
              <div className="text-sm font-medium mb-2">Bids</div>
              {listingDetails.bids.length === 0 ? (
                <div className="text-sm text-muted-foreground">No bids yet.</div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-auto pr-2">
                  {listingDetails.bids.map((bid: any) => {
                    const isMine = userEmail && bid.distributor?.email === userEmail;
                    return (
                      <div
                        key={String(bid._id)}
                        className={`rounded-md border p-3 text-sm ${isMine ? "border-blue-300 bg-blue-50/50" : ""}`}
                      >
                        <div className="flex justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">
                              {bid.distributor?.name || "Distributor"} • {bid.pricePerUnit.toFixed(2)} per unit
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {bid.minQuantity ? `Min: ${bid.minQuantity} • ` : ""}
                              {bid.maxQuantity ? `Max: ${bid.maxQuantity} • ` : ""}
                              {bid.pickupProposal ? `Pickup: ${bid.pickupProposal} • ` : ""}
                              {bid.paymentTerms ? `Terms: ${bid.paymentTerms} • ` : ""}
                              {new Date(bid.timestamp).toLocaleString()}
                            </div>
                            {bid.comments && (
                              <div className="text-xs italic text-muted-foreground">"{bid.comments}"</div>
                            )}
                          </div>
                          <div className="text-right space-y-2">
                            {getStatusBadge(bid.status)}
                            {role === "farmer" &&
                              listingDetails.listing.status === "open" &&
                              bid.status === "pending" && (
                                <div className="mt-2">
                                  <Button size="sm" onClick={() => handleAcceptBid(bid._id)}>
                                    Accept Bid
                                  </Button>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {role === "distributor" && isOpenListing && (
              <>
                {!showInlineBidForm ? (
                  <div className="flex justify-end">
                    <Button onClick={() => setShowInlineBidForm(true)}>Make Bid</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Place a Bid</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      <div className="md:col-span-2">
                        <Label>Comments</Label>
                        <Textarea
                          className="mt-1"
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          placeholder="Additional notes or requirements..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetInlineForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handlePlaceBidInline}>Submit Bid</Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {(role !== "distributor" || !isOpenListing) && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                  }}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
