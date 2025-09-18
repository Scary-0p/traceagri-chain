import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { Switch } from "@/components/ui/switch";

type Props = {
  role: string;
  batchId: string;
  setBatchId: (v: string) => void;
  quantity: string;
  setQuantity: (v: string) => void;
  unit: string;
  setUnit: (v: string) => void;
  expectedPrice: string;
  setExpectedPrice: (v: string) => void;
  negotiationAllowed: boolean;
  setNegotiationAllowed: (v: boolean) => void;
  specialTerms: string;
  setSpecialTerms: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  onCreateListing: () => void;
};

export default function CreateListingForm({
  role,
  batchId,
  setBatchId,
  quantity,
  setQuantity,
  unit,
  setUnit,
  expectedPrice,
  setExpectedPrice,
  negotiationAllowed,
  setNegotiationAllowed,
  specialTerms,
  setSpecialTerms,
  description,
  setDescription,
  onCreateListing,
}: Props) {
  return (
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
            <div className="flex items-center justify-between md:col-span-2 border rounded-md px-3 py-2">
              <div>
                <Label className="block">Allow Negotiation</Label>
                <p className="text-xs text-muted-foreground">
                  Let distributors propose counter offers.
                </p>
              </div>
              <Switch
                checked={negotiationAllowed}
                onCheckedChange={setNegotiationAllowed}
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
              <Button onClick={onCreateListing}>Create Listing</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}