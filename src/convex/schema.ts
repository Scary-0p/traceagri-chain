import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// User roles for different stakeholders
export const ROLES = {
  ADMIN: "admin",
  FARMER: "farmer",
  DISTRIBUTOR: "distributor", 
  RETAILER: "retailer",
  GOVERNMENT: "government",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.FARMER),
  v.literal(ROLES.DISTRIBUTOR),
  v.literal(ROLES.RETAILER),
  v.literal(ROLES.GOVERNMENT),
);
export type Role = Infer<typeof roleValidator>;

// Batch status tracking
export const BATCH_STATUS = {
  CREATED: "created",
  IN_TRANSIT_TO_DISTRIBUTOR: "in_transit_to_distributor",
  WITH_DISTRIBUTOR: "with_distributor",
  IN_TRANSIT_TO_RETAILER: "in_transit_to_retailer", 
  WITH_RETAILER: "with_retailer",
  SOLD: "sold",
} as const;

export const batchStatusValidator = v.union(
  v.literal(BATCH_STATUS.CREATED),
  v.literal(BATCH_STATUS.IN_TRANSIT_TO_DISTRIBUTOR),
  v.literal(BATCH_STATUS.WITH_DISTRIBUTOR),
  v.literal(BATCH_STATUS.IN_TRANSIT_TO_RETAILER),
  v.literal(BATCH_STATUS.WITH_RETAILER),
  v.literal(BATCH_STATUS.SOLD),
);
export type BatchStatus = Infer<typeof batchStatusValidator>;

const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
      
      // Stakeholder specific fields
      farmName: v.optional(v.string()),
      location: v.optional(v.string()),
      phone: v.optional(v.string()),
      licenseNumber: v.optional(v.string()),
      verified: v.optional(v.boolean()),
    }).index("email", ["email"]),

    // Crop batches - core of the supply chain
    batches: defineTable({
      batchId: v.string(), // Unique blockchain-style ID
      farmerId: v.id("users"),
      
      // Crop details
      cropVariety: v.string(),
      quantity: v.number(),
      unit: v.string(), // kg, tons, etc
      qualityGrade: v.string(),
      harvestDate: v.number(),
      expectedPrice: v.number(),
      // Add optional location and notes captured from the farmer
      farmLocation: v.optional(v.string()),
      notes: v.optional(v.string()),
      // Add shelf location for retailer storage (optional)
      shelfLocation: v.optional(v.string()),
      // Intended recipient for retailer acceptance
      pendingOwnerId: v.optional(v.id("users")),
      
      // Current status
      status: batchStatusValidator,
      currentOwnerId: v.id("users"),
      
      // Pricing history
      farmerPrice: v.optional(v.number()),
      distributorPrice: v.optional(v.number()),
      retailPrice: v.optional(v.number()),
      
      // QR code data
      qrCode: v.string(),
    })
    .index("by_batch_id", ["batchId"])
    .index("by_farmer", ["farmerId"])
    .index("by_current_owner", ["currentOwnerId"])
    .index("by_status", ["status"])
    .index("by_pending_owner", ["pendingOwnerId"]),

    // Transaction history for full traceability
    transactions: defineTable({
      batchId: v.string(),
      fromUserId: v.id("users"),
      toUserId: v.id("users"),
      transactionType: v.string(), // "transfer", "quality_update", "status_change"
      previousStatus: v.optional(batchStatusValidator),
      newStatus: batchStatusValidator,
      price: v.optional(v.number()),
      notes: v.optional(v.string()),
      timestamp: v.number(),
      // Add optional logistics fields for distributor events
      transportMode: v.optional(v.string()),
      storageInfo: v.optional(v.string()),
      destination: v.optional(v.string()),
    })
    .index("by_batch", ["batchId"])
    .index("by_from_user", ["fromUserId"])
    .index("by_to_user", ["toUserId"]),

    // Quality updates and certifications
    qualityUpdates: defineTable({
      batchId: v.string(),
      updatedBy: v.id("users"),
      qualityGrade: v.string(),
      certifications: v.optional(v.array(v.string())),
      testResults: v.optional(v.string()),
      notes: v.optional(v.string()),
      timestamp: v.number(),
    })
    .index("by_batch", ["batchId"])
    .index("by_updated_by", ["updatedBy"]),

    listings: defineTable({
      batchId: v.string(),
      farmerId: v.id("users"),
      quantity: v.number(),
      unit: v.string(),
      expectedPrice: v.number(),
      negotiationAllowed: v.optional(v.boolean()),
      specialTerms: v.optional(v.string()),
      description: v.optional(v.string()),
      images: v.optional(v.array(v.string())),
      status: v.union(v.literal("open"), v.literal("locked_in"), v.literal("sold")),
      acceptedBidId: v.optional(v.id("bids")),
      acceptedAt: v.optional(v.number()),
      finalPrice: v.optional(v.number()),
      location: v.optional(v.string()),
      cropVariety: v.string(),
    })
    .index("by_status", ["status"])
    .index("by_farmer", ["farmerId"])
    .index("by_batch", ["batchId"])
    .index("by_crop_variety", ["cropVariety"])
    .index("by_batch_and_status", ["batchId", "status"])
    .index("by_crop_variety_and_status", ["cropVariety", "status"]),

    bids: defineTable({
      listingId: v.id("listings"),
      distributorId: v.id("users"),
      pricePerUnit: v.number(),
      minQuantity: v.optional(v.number()),
      maxQuantity: v.optional(v.number()),
      pickupProposal: v.optional(v.string()),
      paymentTerms: v.optional(v.string()),
      comments: v.optional(v.string()),
      status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
      timestamp: v.number(),
    })
    .index("by_listing", ["listingId"])
    .index("by_distributor", ["distributorId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;