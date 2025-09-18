import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Package, DollarSign, Store, MapPin } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type Listing = {
  _id: Id<"listings">;
  cropVariety: string;
  quantity: number;
  unit: string;
  expectedPrice: number;
  status: string;
  farmer?: { name?: string | null } | null;
  location?: string | null;
  description?: string | null;
};

type Props = {
  role: string;
  openListings: Array<Listing> | undefined;
  cropFilter: string;
  setCropFilter: (v: string) => void;
  onOpenDetails: (id: Id<"listings">) => void;
  onOpenBidDialog: (id: Id<"listings">) => void;
};

export default function BrowseListings({
  role,
  openListings,
  cropFilter,
  setCropFilter,
  onOpenDetails,
  onOpenBidDialog,
}: Props) {
  const getStatusBadge = (status: string) => {
    const base = "inline-flex items-center rounded px-2 py-0.5 text-xs border";
    switch (status) {
      case "open":
        return <span className={base}>Open for Bids</span>;
      case "locked_in":
        return <span className={base}>Order Confirmed</span>;
      case "sold":
        return <span className={base}>Completed</span>;
      default:
        return <span className={base}>{status}</span>;
    }
  };

  return (
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
              <Card
                key={listing._id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onOpenDetails(listing._id)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{listing.cropVariety}</h3>
                    {getStatusBadge(listing.status)}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {listing.quantity} {listing.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {listing.expectedPrice.toFixed(2)} per {listing.unit}
                      </span>
                    </div>
                    {listing.farmer && (
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <span>{listing.farmer.name || "Farmer"}</span>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBidDialog(listing._id);
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
  );
}
