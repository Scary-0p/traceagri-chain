import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const createListing = mutation({
  args: {
    batchId: v.string(),
    quantity: v.number(),
    unit: v.string(),
    expectedPrice: v.number(),
    negotiationAllowed: v.optional(v.boolean()),
    specialTerms: v.optional(v.string()),
    description: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (!identity.email) throw new Error("No email associated with this account");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email as string))
      .unique();
    if (!user) throw new Error("User not found");

    // Check if user is farmer
    if (user.role && user.role !== "farmer") {
      throw new Error("Only farmers can create listings");
    }

    // Get batch details
    const batch = await ctx.db
      .query("batches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .unique();
    if (!batch) throw new Error("Batch not found");

    // Check if user owns the batch or is the original farmer
    if (batch.farmerId !== user._id && batch.currentOwnerId !== user._id) {
      throw new Error("You can only list your own batches");
    }

    // Check for existing open listing for this batch (use composite index, no filters)
    const existingListing = await ctx.db
      .query("listings")
      .withIndex("by_batch_and_status", (q) =>
        q.eq("batchId", args.batchId).eq("status", "open"),
      )
      .first();
    if (existingListing) {
      throw new Error("This batch already has an open listing");
    }

    // Create listing
    const listingId = await ctx.db.insert("listings", {
      batchId: args.batchId,
      farmerId: user._id,
      quantity: args.quantity,
      unit: args.unit,
      expectedPrice: args.expectedPrice,
      negotiationAllowed: args.negotiationAllowed,
      specialTerms: args.specialTerms,
      description: args.description,
      images: args.images,
      status: "open",
      location: user.location,
      cropVariety: batch.cropVariety,
    });

    // Add transaction record (keep status equal to batch.status)
    await ctx.db.insert("transactions", {
      batchId: args.batchId,
      fromUserId: user._id,
      toUserId: user._id,
      transactionType: "listing_created",
      timestamp: Date.now(),
      price: args.expectedPrice,
      previousStatus: batch.status,
      newStatus: batch.status,
      notes: `Listed in marketplace: ${args.quantity} ${args.unit} at ${args.expectedPrice} per unit`,
    });

    return { listingId };
  },
});

export const listOpenListings = query({
  args: {
    cropVariety: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let listings;
    if (args.cropVariety) {
      // Use composite index for crop + status to avoid filtering
      listings = await ctx.db
        .query("listings")
        .withIndex("by_crop_variety_and_status", (q) =>
          q.eq("cropVariety", args.cropVariety as string).eq("status", "open"),
        )
        .collect();
    } else {
      listings = await ctx.db
        .query("listings")
        .withIndex("by_status", (q) => q.eq("status", "open"))
        .collect();
    }

    // Enrich with farmer details
    const enrichedListings = await Promise.all(
      listings.map(async (listing) => {
        const farmer = await ctx.db.get(listing.farmerId);
        return {
          ...listing,
          farmer: farmer
            ? {
                name: farmer.name,
                farmName: farmer.farmName,
                location: farmer.location,
              }
            : null,
        };
      }),
    );

    return enrichedListings.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getMyListings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    // Gracefully handle anonymous/guest users with no email
    if (!identity || !identity.email) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email as string))
      .unique();
    if (!user) {
      return [];
    }

    const listings = await ctx.db
      .query("listings")
      .withIndex("by_farmer", (q) => q.eq("farmerId", user._id))
      .collect();

    // Enrich with accepted bid details if any
    const enrichedListings = await Promise.all(
      listings.map(async (listing) => {
        let acceptedBid = null;
        if (listing.acceptedBidId) {
          const bid = await ctx.db.get(listing.acceptedBidId);
          if (bid) {
            const distributor = await ctx.db.get(bid.distributorId);
            acceptedBid = {
              ...bid,
              distributor: distributor ? {
                name: distributor.name,
                email: distributor.email,
              } : null,
            };
          }
        }
        return {
          ...listing,
          acceptedBid,
        };
      })
    );

    return enrichedListings.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const placeBid = mutation({
  args: {
    listingId: v.id("listings"),
    pricePerUnit: v.number(),
    minQuantity: v.optional(v.number()),
    maxQuantity: v.optional(v.number()),
    pickupProposal: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
    comments: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (!identity.email) throw new Error("No email associated with this account");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email as string))
      .unique();
    if (!user) throw new Error("User not found");

    // Check if user is distributor
    if (user.role !== "distributor") {
      throw new Error("Only distributors can place bids");
    }

    // Get listing
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing not found");

    if (listing.status !== "open") {
      throw new Error("This listing is no longer accepting bids");
    }

    // Create bid
    const bidId = await ctx.db.insert("bids", {
      listingId: args.listingId,
      distributorId: user._id,
      pricePerUnit: args.pricePerUnit,
      minQuantity: args.minQuantity,
      maxQuantity: args.maxQuantity,
      pickupProposal: args.pickupProposal,
      paymentTerms: args.paymentTerms,
      comments: args.comments,
      status: "pending",
      timestamp: Date.now(),
    });

    // Fetch batch to ensure valid statuses
    const batch = await ctx.db
      .query("batches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", listing.batchId))
      .unique();
    if (!batch) throw new Error("Batch not found");

    // Add transaction record (keep status equal to batch.status)
    await ctx.db.insert("transactions", {
      batchId: listing.batchId,
      fromUserId: user._id,
      toUserId: listing.farmerId,
      transactionType: "bid_placed",
      timestamp: Date.now(),
      price: args.pricePerUnit,
      previousStatus: batch.status,
      newStatus: batch.status,
      notes: `Bid placed: ${args.pricePerUnit} per unit${args.comments ? ` - ${args.comments}` : ""}`,
    });

    return { bidId };
  },
});

export const getMyBids = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    // Gracefully handle anonymous/guest users with no email
    if (!identity || !identity.email) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email as string))
      .unique();
    if (!user) {
      return [];
    }

    const bids = await ctx.db
      .query("bids")
      .withIndex("by_distributor", (q) => q.eq("distributorId", user._id))
      .collect();

    // Enrich with listing details
    const enrichedBids = await Promise.all(
      bids.map(async (bid) => {
        const listing = await ctx.db.get(bid.listingId);
        let farmer = null;
        if (listing) {
          farmer = await ctx.db.get(listing.farmerId);
        }
        return {
          ...bid,
          listing: listing ? {
            ...listing,
            farmer: farmer ? {
              name: farmer.name,
              farmName: farmer.farmName,
            } : null,
          } : null,
        };
      })
    );

    return enrichedBids.sort((a, b) => b.timestamp - a.timestamp);
  },
});

export const getListingDetails = query({
  args: {
    listingId: v.id("listings"),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) return null;

    // Get farmer details
    const farmer = await ctx.db.get(listing.farmerId);

    // Get batch details
    const batch = await ctx.db
      .query("batches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", listing.batchId))
      .unique();

    // Get all bids for this listing
    const bids = await ctx.db
      .query("bids")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .collect();

    // Enrich bids with distributor details
    const enrichedBids = await Promise.all(
      bids.map(async (bid) => {
        const distributor = await ctx.db.get(bid.distributorId);
        return {
          ...bid,
          distributor: distributor ? {
            name: distributor.name,
            email: distributor.email,
            role: distributor.role,
          } : null,
        };
      })
    );

    return {
      listing,
      batch,
      farmer: farmer ? {
        name: farmer.name,
        farmName: farmer.farmName,
        location: farmer.location,
      } : null,
      bids: enrichedBids.sort((a, b) => b.timestamp - a.timestamp),
    };
  },
});

export const acceptBid = mutation({
  args: {
    listingId: v.id("listings"),
    bidId: v.id("bids"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (!identity.email) throw new Error("No email associated with this account");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email as string))
      .unique();
    if (!user) throw new Error("User not found");

    // Get listing
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing not found");

    // Check if user owns the listing
    if (listing.farmerId !== user._id) {
      throw new Error("You can only accept bids on your own listings");
    }

    if (listing.status !== "open") {
      throw new Error("This listing is no longer accepting bids");
    }

    // Get the chosen bid
    const chosenBid = await ctx.db.get(args.bidId);
    if (!chosenBid || chosenBid.listingId !== args.listingId) {
      throw new Error("Invalid bid");
    }

    // Update listing
    await ctx.db.patch(args.listingId, {
      status: "locked_in",
      acceptedBidId: args.bidId,
      acceptedAt: Date.now(),
      finalPrice: chosenBid.pricePerUnit,
    });

    // Update chosen bid to accepted
    await ctx.db.patch(args.bidId, {
      status: "accepted",
    });

    // Reject all other bids for this listing
    const allBids = await ctx.db
      .query("bids")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .collect();

    for (const bid of allBids) {
      if (bid._id !== args.bidId && bid.status === "pending") {
        await ctx.db.patch(bid._id, {
          status: "rejected",
        });
      }
    }

    // Fetch batch to keep statuses valid
    const batch = await ctx.db
      .query("batches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", listing.batchId))
      .unique();
    if (!batch) throw new Error("Batch not found");

    const distributor = await ctx.db.get(chosenBid.distributorId);

    // Add transaction record (keep status equal to batch.status)
    await ctx.db.insert("transactions", {
      batchId: listing.batchId,
      fromUserId: user._id,
      toUserId: chosenBid.distributorId,
      transactionType: "order_created",
      timestamp: Date.now(),
      price: chosenBid.pricePerUnit,
      previousStatus: batch.status,
      newStatus: batch.status,
      notes: `Order confirmed: ${chosenBid.pricePerUnit} per unit to ${distributor?.name || "distributor"}${chosenBid.comments ? ` - ${chosenBid.comments}` : ""}`,
    });

    return { success: true };
  },
});

export const getPriceInsightsForCrop = query({
  args: { cropVariety: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // If not provided, return a safe default (prevents crashes if someone calls with {})
    if (!args.cropVariety) {
      return {
        cropVariety: "",
        averageAcceptedPrice: null,
        minAcceptedPriceThisWeek: null,
        maxAcceptedPriceThisWeek: null,
        recentAccepted: [],
        totalDeals: 0,
        dealsThisWeek: 0,
      };
    }

    // Narrow for TypeScript
    const cropVariety: string = args.cropVariety as string;

    // Get all listings for this cropVariety using the index
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_crop_variety", (q) => q.eq("cropVariety", cropVariety))
      .collect();

    // Consider only accepted/closed listings with finalPrice
    const accepted = listings
      .filter((l) => (l.status === "locked_in" || l.status === "sold") && typeof l.finalPrice === "number");

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const thisWeek = accepted.filter((l) => (l.acceptedAt ?? 0) >= weekAgo);

    const pricesAll = accepted.map((l) => l.finalPrice as number);
    const avg =
      pricesAll.length > 0 ? pricesAll.reduce((a, b) => a + b, 0) / pricesAll.length : null;

    const pricesWeek = thisWeek.map((l) => l.finalPrice as number);
    const minWeek = pricesWeek.length > 0 ? Math.min(...pricesWeek) : null;
    const maxWeek = pricesWeek.length > 0 ? Math.max(...pricesWeek) : null;

    // Recent accepted: last 5 by acceptedAt (fallback to _creationTime)
    const recent = [...accepted]
      .sort((a, b) => (b.acceptedAt ?? b._creationTime) - (a.acceptedAt ?? a._creationTime))
      .slice(0, 5);

    // Enrich with farmer and distributor names (from acceptedBidId)
    const recentEnriched = await Promise.all(
      recent.map(async (l) => {
        let distributorName: string | null = null;
        if (l.acceptedBidId) {
          const bid = await ctx.db.get(l.acceptedBidId);
          if (bid) {
            const distributor = await ctx.db.get(bid.distributorId);
            distributorName = distributor?.name ?? distributor?.email ?? null;
          }
        }
        const farmer = await ctx.db.get(l.farmerId);
        const farmerName = farmer?.name ?? farmer?.email ?? null;

        return {
          listingId: l._id,
          cropVariety: l.cropVariety,
          finalPrice: l.finalPrice ?? null,
          acceptedAt: l.acceptedAt ?? null,
          farmerName,
          distributorName,
          quantity: l.quantity,
          unit: l.unit,
        };
      })
    );

    return {
      cropVariety,
      averageAcceptedPrice: avg,
      minAcceptedPriceThisWeek: minWeek,
      maxAcceptedPriceThisWeek: maxWeek,
      recentAccepted: recentEnriched,
      totalDeals: accepted.length,
      dealsThisWeek: thisWeek.length,
    };
  },
});