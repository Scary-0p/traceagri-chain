import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: Id<"listings"> | null;
};

export default function PlaceBidDialog({ open, onOpenChange, listingId }: Props) {
  const placeBid = useMutation(api.marketplace.placeBid);

  const [pricePerUnit, setPricePerUnit] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [pickupProposal, setPickupProposal] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [comments, setComments] = useState("");

  const reset = () => {
    setPricePerUnit("");
    setMinQuantity("");
    setMaxQuantity("");
    setPickupProposal("");
    setPaymentTerms("");
    setComments("");
  };

  const handlePlaceBid = async () => {
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
      onOpenChange(false);
      reset();
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
        if (!o) reset();
      }}
    >
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePlaceBid}>Place Bid</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
