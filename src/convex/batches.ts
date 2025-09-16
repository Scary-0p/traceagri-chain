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
        newStatus = BATCH_STATUS.WITH_RETAILER;
        break;
      default:
        throw new Error("Invalid recipient role");
    }

    // Update batch
    await ctx.db.patch(batch._id, {
      status: newStatus,
      currentOwnerId: args.toUserId,
      ...(args.price && toUser.role === "distributor" && { farmerPrice: args.price }),
      ...(args.price && toUser.role === "retailer" && { distributorPrice: args.price }),
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