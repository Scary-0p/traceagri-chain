import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";

export default function Trace() {
  const navigate = useNavigate();
  const { batchId } = useParams();

  const batch = useQuery(
    api.batches.getBatchById,
    batchId ? { batchId } : (undefined as any),
  );

  const loading = batch === undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img
                src="/logo.svg"
                alt="AgriTrace"
                className="h-8 w-8 cursor-pointer"
                onClick={() => navigate("/")}
              />
              <span className="text-xl font-semibold tracking-tight">
                Trace Product
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => navigate("/")}>
                Home
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-6"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Batch Trace</h1>
            <p className="text-sm text-muted-foreground">
              Unique Code: <span className="font-mono">{batchId}</span>
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  Loading batch details...
                </div>
              ) : !batch ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No batch found for this code.
                  </p>
                  <Button variant="outline" onClick={() => navigate("/")}>
                    Go Back
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div className="capitalize">
                        {String(batch.status).replace(/_/g, " ")}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Crop Variety</div>
                      <div>{batch.cropVariety}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Quantity</div>
                        <div>
                          {batch.quantity} {batch.unit}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Expected Price</div>
                        <div>
                          {typeof batch.expectedPrice === "number"
                            ? batch.expectedPrice.toFixed(2)
                            : "-"}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Harvest Date</div>
                      <div>{new Date(batch.harvestDate).toLocaleDateString()}</div>
                    </div>
                    {batch.farmLocation ? (
                      <div>
                        <div className="text-xs text-muted-foreground">Farm Location</div>
                        <div>{batch.farmLocation}</div>
                      </div>
                    ) : null}
                    {batch.notes ? (
                      <div>
                        <div className="text-xs text-muted-foreground">Notes</div>
                        <div className="text-sm text-muted-foreground">{batch.notes}</div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Farmer</div>
                      <div>
                        {batch.farmer
                          ? `${batch.farmer.name}${batch.farmer.farmName ? " • " + batch.farmer.farmName : ""}${
                              batch.farmer.location ? " • " + batch.farmer.location : ""
                            }`
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Trace QR</div>
                      <div className="flex items-center gap-4">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                            batch.qrCode,
                          )}`}
                          alt="Trace QR"
                          className="h-40 w-40 border rounded bg-white"
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
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {!loading && batch && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
                {batch.transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions yet.</p>
                ) : (
                  <div className="space-y-3">
                    {batch.transactions
                      .sort((a, b) => a.timestamp - b.timestamp)
                      .map((tx) => (
                        <div key={tx._id} className="border rounded p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-medium capitalize">
                              {tx.transactionType.replace(/_/g, " ")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(tx.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            {tx.fromUser
                              ? `${tx.fromUser.name} (${tx.fromUser.role})`
                              : "Unknown"}{" "}
                            →{" "}
                            {tx.toUser
                              ? `${tx.toUser.name} (${tx.toUser.role})`
                              : "Unknown"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Status:{" "}
                            <span className="capitalize">
                              {String(tx.newStatus).replace(/_/g, " ")}
                            </span>
                            {typeof tx.price === "number" ? ` • Price: ${tx.price.toFixed(2)}` : ""}
                            {tx.notes ? ` • Notes: ${tx.notes}` : ""}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
}
