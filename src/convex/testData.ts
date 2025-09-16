import { mutation } from "./_generated/server";
import { ROLES, BATCH_STATUS } from "./schema";

export const seedTestData = mutation({
  args: {},
  handler: async (ctx) => {
    // Create test users for each role
    const farmer = await ctx.db.insert("users", {
      name: "John Smith",
      email: "farmer@test.com",
      role: ROLES.FARMER,
      farmName: "Green Valley Farm",
      location: "California, USA",
      phone: "+1-555-0123",
      verified: true,
    });

    const distributor = await ctx.db.insert("users", {
      name: "Sarah Johnson",
      email: "distributor@test.com", 
      role: ROLES.DISTRIBUTOR,
      location: "Los Angeles, CA",
      phone: "+1-555-0456",
      licenseNumber: "DIST-2024-001",
      verified: true,
    });

    const retailer = await ctx.db.insert("users", {
      name: "Mike Chen",
      email: "retailer@test.com",
      role: ROLES.RETAILER,
      location: "San Francisco, CA", 
      phone: "+1-555-0789",
      licenseNumber: "RET-2024-001",
      verified: true,
    });

    const government = await ctx.db.insert("users", {
      name: "Dr. Lisa Rodriguez",
      email: "gov@test.com",
      role: ROLES.GOVERNMENT,
      location: "Sacramento, CA",
      phone: "+1-555-0999",
      licenseNumber: "GOV-AGRI-001",
      verified: true,
    });

    // Create sample batches
    const batch1Id = "BATCH_" + Date.now().toString(36) + "_SAMPLE1";
    const batch2Id = "BATCH_" + Date.now().toString(36) + "_SAMPLE2";

    await ctx.db.insert("batches", {
      batchId: batch1Id,
      farmerId: farmer,
      cropVariety: "Organic Tomatoes",
      quantity: 500,
      unit: "kg",
      qualityGrade: "Grade A",
      harvestDate: Date.now() - 86400000, // Yesterday
      expectedPrice: 3.50,
      status: BATCH_STATUS.CREATED,
      currentOwnerId: farmer,
      qrCode: `http://localhost:5173/trace/${batch1Id}`,
    });

    await ctx.db.insert("batches", {
      batchId: batch2Id,
      farmerId: farmer,
      cropVariety: "Fresh Lettuce",
      quantity: 200,
      unit: "kg", 
      qualityGrade: "Premium",
      harvestDate: Date.now() - 172800000, // 2 days ago
      expectedPrice: 2.25,
      status: BATCH_STATUS.WITH_DISTRIBUTOR,
      currentOwnerId: distributor,
      farmerPrice: 2.25,
      qrCode: `http://localhost:5173/trace/${batch2Id}`,
    });

    // Create transaction records
    await ctx.db.insert("transactions", {
      batchId: batch1Id,
      fromUserId: farmer,
      toUserId: farmer,
      transactionType: "creation",
      newStatus: BATCH_STATUS.CREATED,
      timestamp: Date.now() - 86400000,
    });

    await ctx.db.insert("transactions", {
      batchId: batch2Id,
      fromUserId: farmer,
      toUserId: farmer,
      transactionType: "creation", 
      newStatus: BATCH_STATUS.CREATED,
      timestamp: Date.now() - 172800000,
    });

    await ctx.db.insert("transactions", {
      batchId: batch2Id,
      fromUserId: farmer,
      toUserId: distributor,
      transactionType: "transfer",
      previousStatus: BATCH_STATUS.CREATED,
      newStatus: BATCH_STATUS.WITH_DISTRIBUTOR,
      price: 2.25,
      notes: "Fresh harvest, handle with care",
      timestamp: Date.now() - 86400000,
    });

    return {
      message: "Test data created successfully",
      users: { farmer, distributor, retailer, government },
      batches: [batch1Id, batch2Id],
    };
  },
});