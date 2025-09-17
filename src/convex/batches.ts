import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { BATCH_STATUS, batchStatusValidator } from "./schema";

// Generate unique batch ID (blockchain-style)
function generateBatchId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `BATCH_${timestamp}_${random}`.toUpperCase();
}

// Create new crop batch (Farmer only)
export const createBatch = mutation({
  args: {
    cropVariety: v.string(),
    quantity: v.number(),
    unit: v.string(),
    qualityGrade: v.string(),
    harvestDate: v.number(),
    expectedPrice: v.number(),
    // New optional fields from the form
    farmLocation: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    // Allow users with undefined role (new/guest) to act as farmers by default
    if (!user || (user.role !== undefined && user.role !== "farmer")) {
      throw new Error("Only farmers can create batches");
    }

    const batchId = generateBatchId();
    const qrCode = `${process.env.SITE_URL || 'http://localhost:5173'}/trace/${batchId}`;

    await ctx.db.insert("batches", {
      batchId,
      farmerId: user._id,
      cropVariety: args.cropVariety,
      quantity: args.quantity,
      unit: args.unit,
      qualityGrade: args.qualityGrade,
      harvestDate: args.harvestDate,
      expectedPrice: args.expectedPrice,
      // save optional fields
      farmLocation: args.farmLocation,
      notes: args.notes,
      status: BATCH_STATUS.CREATED,
      currentOwnerId: user._id,
      qrCode,
    });

    await ctx.db.insert("transactions", {
      batchId,
      fromUserId: user._id,
      toUserId: user._id,
      transactionType: "creation",
      newStatus: BATCH_STATUS.CREATED,
      timestamp: Date.now(),
    });

    return { batchId, qrCode };
  },
});

// Transfer batch to next stakeholder
export const transferBatch = mutation({
  args: {
    batchId: v.string(),
    toUserId: v.id("users"),
    price: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Authentication required");
    }

    const batch = await ctx.db
      .query("batches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .unique();

    if (!batch) {
      throw new Error("Batch not found");
    }

    if (batch.currentOwnerId !== user._id) {
      throw new Error("You don't own this batch");
    }

    const toUser = await ctx.db.get(args.toUserId);
    if (!toUser) {
      throw new Error("Recipient not found");
    }

    // Determine new status based on recipient role
    let newStatus: typeof BATCH_STATUS[keyof typeof BATCH_STATUS];
    switch (toUser.role) {
      case "distributor":
        newStatus = BATCH_STATUS.WITH_DISTRIBUTOR;
        break;
      case "retailer":
        // Set to in transit to retailer and mark pendingOwnerId instead of switching owner immediately
        newStatus = BATCH_STATUS.IN_TRANSIT_TO_RETAILER;
        break;
      default:
        throw new Error("Invalid recipient role");
    }

    // Update batch
    await ctx.db.patch(batch._id, {
      status: newStatus,
      // Only move ownership immediately for distributor
      ...(toUser.role === "distributor" && { currentOwnerId: args.toUserId }),
      ...(args.price && toUser.role === "distributor" && { farmerPrice: args.price }),
      ...(args.price && toUser.role === "retailer" && { distributorPrice: args.price }),
      // For retailer transfer, store intended recipient
      ...(toUser.role === "retailer" && { pendingOwnerId: args.toUserId }),
    });

    // Record transaction
    await ctx.db.insert("transactions", {
      batchId: args.batchId,
      fromUserId: user._id,
      toUserId: args.toUserId,
      transactionType: "transfer",
      previousStatus: batch.status,
      newStatus,
      price: args.price,
      notes: args.notes,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// Add a distributor-initiated acceptance mutation (farmer -> distributor)
export const acceptBatchFromFarmer = mutation({
  args: {
    batchId: v.string(),
    price: v.optional(v.number()),
    transportMode: v.optional(v.string()),
    storageInfo: v.optional(v.string()),
    destination: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Authentication required");
    }
    if (user.role !== "distributor") {
      throw new Error("Only distributors can accept batches");
    }

    const batch = await ctx.db
      .query("batches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .unique();

    if (!batch) {
      throw new Error("Batch not found");
    }

    // Ensure the current owner is a farmer
    const currentOwner = await ctx.db.get(batch.currentOwnerId);
    if (!currentOwner) {
      throw new Error("Current owner not found");
    }
    if (currentOwner.role !== "farmer") {
      throw new Error("Batch can only be accepted from a farmer");
    }

    // Update batch: distributor takes ownership
    await ctx.db.patch(batch._id, {
      status: BATCH_STATUS.WITH_DISTRIBUTOR,
      currentOwnerId: user._id,
      ...(args.price && { farmerPrice: args.price }),
      // keep other fields as-is
    });

    // Record transaction (collection/transfer)
    await ctx.db.insert("transactions", {
      batchId: args.batchId,
      fromUserId: currentOwner._id,
      toUserId: user._id,
      transactionType: "transfer",
      previousStatus: batch.status,
      newStatus: BATCH_STATUS.WITH_DISTRIBUTOR,
      price: args.price,
      notes: args.notes,
      timestamp: Date.now(),
      transportMode: args.transportMode,
      storageInfo: args.storageInfo,
      destination: args.destination,
    });

    return { success: true };
  },
});

// Retailer accepts/claims a pending transfer
export const retailerAcceptBatch = mutation({
  args: {
    batchId: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Authentication required");
    }
    if (user.role !== "retailer") {
      throw new Error("Only retailers can accept batches");
    }

    const batch = await ctx.db
      .query("batches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .unique();

    if (!batch) {
      throw new Error("Batch not found");
    }

    // Retailer can accept only if intended pendingOwnerId is them,
    // or already currentOwner is them (idempotent acceptance)
    const isIntended = batch.pendingOwnerId === user._id;
    const alreadyOwner = batch.currentOwnerId === user._id;

    if (!isIntended && !alreadyOwner) {
      throw new Error("This batch is not assigned to you");
    }

    await ctx.db.patch(batch._id, {
      status: BATCH_STATUS.WITH_RETAILER,
      currentOwnerId: user._id,
      pendingOwnerId: undefined,
    });

    await ctx.db.insert("transactions", {
      batchId: args.batchId,
      fromUserId: user._id,
      toUserId: user._id,
      transactionType: "status_update",
      previousStatus: batch.status,
      newStatus: BATCH_STATUS.WITH_RETAILER,
      notes: args.notes,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// List pending batches for retailer
export const getPendingBatchesForRetailer = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "retailer") {
      return [];
    }
    // Batches awaiting this retailer's acceptance
    const pending = await ctx.db
      .query("batches")
      .withIndex("by_pending_owner", (q) => q.eq("pendingOwnerId", user._id))
      .collect();

    // Enrich each pending batch with distributor (sender) name and transfer timestamp (most recent transfer to this retailer)
    const enriched = await Promise.all(
      pending.map(async (b) => {
        const txs = await ctx.db
          .query("transactions")
          .withIndex("by_batch", (q) => q.eq("batchId", b.batchId))
          .collect();

        // Find the latest transfer to this retailer (ideally the distributor -> retailer handoff)
        const transfersToRetailer = txs
          .filter((tx) => tx.toUserId === user._id && tx.transactionType === "transfer")
          .sort((a, z) => z.timestamp - a.timestamp);

        const latest = transfersToRetailer[0];
        let fromUserName: string | null = null;
        if (latest) {
          const fromUser = await ctx.db.get(latest.fromUserId);
          fromUserName = fromUser?.name ?? fromUser?.email ?? null;
        }

        return {
          ...b,
          lastTransfer: latest
            ? {
                timestamp: latest.timestamp,
                fromUserName,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

// Get batches for current user
export const getUserBatches = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    if (user.role === "government") {
      // Government can see all batches
      return await ctx.db.query("batches").collect();
    }

    // Others see only their batches
    return await ctx.db
      .query("batches")
      .withIndex("by_current_owner", (q) => q.eq("currentOwnerId", user._id))
      .collect();
  },
});

// Get batch by ID (for tracing)
export const getBatchById = query({
  args: { batchId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // If no batchId provided, return null to avoid querying
    if (!args.batchId) {
      return null;
    }

    // Narrow to string for type-safety after guard
    const id = args.batchId as string;

    const batch = await ctx.db
      .query("batches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", id))
      .unique();

    if (!batch) {
      return null;
    }

    // Get farmer details
    const farmer = await ctx.db.get(batch.farmerId);
    
    // Get transaction history
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_batch", (q) => q.eq("batchId", id))
      .collect();

    // Get user details for each transaction
    const transactionsWithUsers = await Promise.all(
      transactions.map(async (tx) => {
        const fromUser = await ctx.db.get(tx.fromUserId);
        const toUser = await ctx.db.get(tx.toUserId);
        return {
          ...tx,
          fromUser: fromUser ? { name: fromUser.name, role: fromUser.role } : null,
          toUser: toUser ? { name: toUser.name, role: toUser.role } : null,
        };
      })
    );

    return {
      ...batch,
      farmer: farmer ? { name: farmer.name, farmName: farmer.farmName, location: farmer.location } : null,
      transactions: transactionsWithUsers,
    };
  },
});

// Update batch status (for retailers marking as sold)
export const updateBatchStatus = mutation({
  args: {
    batchId: v.string(),
    status: batchStatusValidator,
    retailPrice: v.optional(v.number()),
    // Allow retailer to update shelf location and notes on status update
    shelfLocation: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Authentication required");
    }

    const batch = await ctx.db
      .query("batches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .unique();

    if (!batch) {
      throw new Error("Batch not found");
    }

    if (batch.currentOwnerId !== user._id) {
      throw new Error("You don't own this batch");
    }

    await ctx.db.patch(batch._id, {
      status: args.status,
      ...(args.retailPrice && { retailPrice: args.retailPrice }),
      ...(args.shelfLocation && { shelfLocation: args.shelfLocation }),
      ...(args.notes && { notes: args.notes }),
    });

    await ctx.db.insert("transactions", {
      batchId: args.batchId,
      fromUserId: user._id,
      toUserId: user._id,
      transactionType: "status_update",
      previousStatus: batch.status,
      newStatus: args.status,
      // include price/notes on the transaction for traceability
      price: args.retailPrice,
      notes: args.notes,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// Get all users by role (for transfer dropdowns)
export const getUsersByRole = query({
  args: { role: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), args.role))
      .collect();
  },
});