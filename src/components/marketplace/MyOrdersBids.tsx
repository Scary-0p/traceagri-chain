import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Id } from "@/convex/_generated/dataModel";

type Listing = {
  _id: Id<"listings">;
  cropVariety: string;
  quantity: number;
  unit: string;
  expectedPrice: number;
  status: string;
  acceptedBid?: any | null;
  acceptedAt?: number | null;
  finalPrice?: number | null;
  _creationTime: number;
};

type FarmerListing = Listing;

type Bid = {
  _id: Id<"bids">;
  status: string;
  pricePerUnit: number;
  timestamp: number;
  listing?: {
    cropVariety?: string | null;
    farmer?: { name?: string | null } | null;
  } | null;
  comments?: string | null;
};

type Props = {
  role: string;
  myListings: Array<FarmerListing> | undefined | null;
  myBids: Array<Bid> | undefined | null;
  onCheckPrice: (cropVariety: string) => void;
  onViewDetails: (listingId: Id<"listings">) => void;
};

export default function MyOrdersBids({
  role,
  myListings,
  myBids,
  onCheckPrice,
  onViewDetails,
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
      case "pending":
        return <span className={base}>Pending</span>;
      case "accepted":
        return (
          <span className={`${base} bg-green-100 text-green-800 border-green-200`}>
            Accepted
          </span>
        );
      case "rejected":
        return (
          <span className={`${base} bg-red-100 text-red-800 border-red-200`}>
            Rejected
          </span>
        );
      default:
        return <span className={base}>{status}</span>;
    }
  };

  if (role === "farmer") {
    const listings = (myListings ?? []) as FarmerListing[];
    const farmerActiveListings = listings.filter((l) => l.status === "open");
    const farmerHistoryListings = listings.filter((l) => l.status !== "open");

    return (
      <Card>
        <CardHeader>
          <CardTitle>My Listings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Active Listings</h3>
              <span className="text-xs text-muted-foreground">
                {farmerActiveListings.length} item(s)
              </span>
            </div>
            {farmerActiveListings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active listings. Create your first listing.
              </p>
            ) : (
              <div className="space-y-4">
                {farmerActiveListings.map((listing) => (
                  <Card key={listing._id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium">{listing.cropVariety}</h3>
                          <p className="text-sm text-muted-foreground">
                            {listing.quantity} {listing.unit} at{" "}
                            {listing.expectedPrice.toFixed(2)} per unit
                          </p>
                        </div>
                        {getStatusBadge(listing.status)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCheckPrice(listing.cropVariety)}
                        >
                          Check Price
                        </Button>
                        <Button size="sm" onClick={() => onViewDetails(listing._id)}>
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">History (Sold / Locked)</h3>
              <span className="text-xs text-muted-foreground">
                {farmerHistoryListings.length} item(s)
              </span>
            </div>
            {farmerHistoryListings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No past orders yet.</p>
            ) : (
              <div className="space-y-4">
                {farmerHistoryListings
                  .sort((a, b) => (b.acceptedAt ?? 0) - (a.acceptedAt ?? 0))
                  .map((listing) => (
                    <Card key={listing._id} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium">{listing.cropVariety}</h3>
                            <p className="text-sm text-muted-foreground">
                              {listing.quantity} {listing.unit} •{" "}
                              {listing.acceptedBid
                                ? `Sold at ${listing.finalPrice?.toFixed(2)} per unit`
                                : "Locked"}
                              {listing.acceptedAt
                                ? ` • ${new Date(listing.acceptedAt).toLocaleDateString()}`
                                : ""}
                            </p>
                          </div>
                          {getStatusBadge(listing.status)}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onCheckPrice(listing.cropVariety)}
                          >
                            Check Price
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Distributor view
  const bids = (myBids ?? []) as Bid[];
  const distributorActiveBids = bids.filter((b) => b.status === "pending");
  const distributorHistoryBids = bids.filter((b) => b.status !== "pending");

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Bids</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Active Bids</h3>
            <span className="text-xs text-muted-foreground">
              {distributorActiveBids.length} item(s)
            </span>
          </div>
          {distributorActiveBids.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active bids. Browse produce to place a bid.
            </p>
          ) : (
            <div className="space-y-4">
              {distributorActiveBids.map((bid) => (
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
                            ` • Farmer: ${bid.listing.farmer.name}`}
                          {bid.status === "pending"
                            ? " • Pending Farmer Response"
                            : ""}
                        </p>
                      </div>
                      {getStatusBadge(bid.status)}
                    </div>
                    {bid.comments && (
                      <p className="text-sm text-muted-foreground">
                        “{bid.comments}”
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">History</h3>
            <span className="text-xs text-muted-foreground">
              {distributorHistoryBids.length} item(s)
            </span>
          </div>
          {distributorHistoryBids.length === 0 ? (
            <p className="text-sm text-muted-foreground">No past bids yet.</p>
          ) : (
            <div className="space-y-4">
              {distributorHistoryBids
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((bid) => (
                  <Card key={bid._id} className="border-l-4 border-l-green-600">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium">
                            {bid.listing?.cropVariety || "Unknown Crop"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Bid: {bid.pricePerUnit.toFixed(2)} per unit
                            {bid.listing?.farmer &&
                              ` • Farmer: ${bid.listing.farmer.name}`}
                          </p>
                        </div>
                        {getStatusBadge(bid.status)}
                      </div>
                      {bid.comments && (
                        <p className="text-sm text-muted-foreground">
                          “{bid.comments}”
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
