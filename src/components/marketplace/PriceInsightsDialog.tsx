import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cropVariety: string | null;
};

export default function PriceInsightsDialog({ open, onOpenChange, cropVariety }: Props) {
  const priceInsights = useQuery(
    api.marketplace.getPriceInsightsForCrop,
    cropVariety ? { cropVariety } : "skip"
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{cropVariety ? `Price Insights • ${cropVariety}` : "Price Insights"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!cropVariety || !priceInsights ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">Average Accepted</div>
                    <div className="text-lg font-semibold">
                      {priceInsights.averageAcceptedPrice != null
                        ? priceInsights.averageAcceptedPrice.toFixed(2)
                        : "—"}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">Min (7d)</div>
                    <div className="text-lg font-semibold">
                      {priceInsights.minAcceptedPriceThisWeek != null
                        ? priceInsights.minAcceptedPriceThisWeek.toFixed(2)
                        : "—"}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">Max (7d)</div>
                    <div className="text-lg font-semibold">
                      {priceInsights.maxAcceptedPriceThisWeek != null
                        ? priceInsights.maxAcceptedPriceThisWeek.toFixed(2)
                        : "—"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Recent Accepted Deals</div>
                {priceInsights.recentAccepted.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No recent accepted deals.</div>
                ) : (
                  <div className="space-y-2">
                    {priceInsights.recentAccepted.map((r: any) => (
                      <div key={String(r.listingId)} className="rounded-md border p-3 text-sm">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-medium">{r.cropVariety}</div>
                            <div className="text-muted-foreground text-xs">
                              {r.quantity} {r.unit} • {r.farmerName || "Farmer"} → {r.distributorName || "Distributor"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {typeof r.finalPrice === "number" ? r.finalPrice.toFixed(2) : "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.acceptedAt ? new Date(r.acceptedAt).toLocaleDateString() : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
