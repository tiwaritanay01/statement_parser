import { parseTransaction } from "../src/services/parser.service.js";
import { TransactionRepository } from "../src/repositories/transaction.repository.js";
import { prisma } from "../src/lib/db.js";

describe("Transaction Parser Service", () => {
    test("should parse Sample 1 correctly", () => {
        const sample1 = `
Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50
`;
        const result = parseTransaction(sample1);
        expect(result.description).toBe("STARBUCKS COFFEE MUMBAI");
        expect(result.amount).toBe(-420.00);
        expect(result.balance).toBe(18420.50);
        expect(result.confidence).toBe(1.0);
        expect(result.date.getFullYear()).toBe(2025);
        expect(result.date.getMonth()).toBe(11); // December (0-indexed)
        expect(result.date.getDate()).toBe(11);
    });

    test("should parse Sample 2 correctly", () => {
        const sample2 = `
Uber Ride * Airport Drop
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50
`;
        const result = parseTransaction(sample2);
        expect(result.description).toBe("Uber Ride * Airport Drop");
        expect(result.amount).toBe(-1250.00);
        expect(result.balance).toBe(17170.50);
        expect(result.confidence).toBe(1.0);
        expect(result.date.getFullYear()).toBe(2025);
        expect(result.date.getMonth()).toBe(11); // December
        expect(result.date.getDate()).toBe(11);
    });

    test("should parse Sample 3 correctly", () => {
        const sample3 = `txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping`;
        const result = parseTransaction(sample3);
        expect(result.description).toBe("Amazon.in Order #403-1234567-8901234");
        expect(result.amount).toBe(-2999.00);
        expect(result.balance).toBe(14171.50);
        expect(result.confidence).toBe(1.0);
        expect(result.date.getFullYear()).toBe(2025);
        expect(result.date.getMonth()).toBe(11); // December
        expect(result.date.getDate()).toBe(10);
    });
});

describe("Transaction Repository Integration", () => {
    const repo = new TransactionRepository();
    let tenantAId: string;
    let tenantBId: string;
    let userAId: string;
    let userBId: string;

    beforeAll(async () => {
        // Setup mock tenants and users
        const tenantA = await prisma.tenant.create({
            data: { name: "Test Tenant A", slug: `test-tenant-a-${Date.now()}` }
        });
        tenantAId = tenantA.id;

        const tenantB = await prisma.tenant.create({
            data: { name: "Test Tenant B", slug: `test-tenant-b-${Date.now()}` }
        });
        tenantBId = tenantB.id;

        const userA = await prisma.user.create({
            data: {
                id: `usera_${Date.now()}`,
                name: "User A",
                email: `usera_${Date.now()}@test.com`,
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        userAId = userA.id;

        const userB = await prisma.user.create({
            data: {
                id: `userb_${Date.now()}`,
                name: "User B",
                email: `userb_${Date.now()}@test.com`,
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        userBId = userB.id;

        // Create Tenant Memberships
        await prisma.tenantMember.createMany({
            data: [
                { tenantId: tenantAId, userId: userAId, role: "owner" },
                { tenantId: tenantBId, userId: userBId, role: "owner" }
            ]
        });
    });

    afterAll(async () => {
        // Cleanup test data
        await prisma.transaction.deleteMany({
            where: { tenantId: { in: [tenantAId, tenantBId] } }
        });
        await prisma.tenantMember.deleteMany({
            where: { tenantId: { in: [tenantAId, tenantBId] } }
        });
        await prisma.user.deleteMany({
            where: { id: { in: [userAId, userBId] } }
        });
        await prisma.tenant.deleteMany({
            where: { id: { in: [tenantAId, tenantBId] } }
        });
    });

    test("should save a transaction successfully", async () => {
        const txData = {
            date: new Date("2025-12-11"),
            description: "Test Starbucks Coffee",
            amount: -420,
            balance: 1000,
            confidence: 1.0,
            currency: "INR"
        };

        const result = await repo.create(tenantAId, userAId, txData);
        expect(result.id).toBeDefined();
        expect(result.tenantId).toBe(tenantAId);
        expect(result.description).toBe("Test Starbucks Coffee");
        expect(result.amount).toBe(-420);
        expect(result.currency).toBe("INR");
    });

    test("should paginate transactions using cursor pagination", async () => {
        // Create 3 transactions for Tenant A
        const tx1 = await repo.create(tenantAId, userAId, {
            date: new Date(),
            description: "Tx 1",
            amount: -10,
            balance: 100,
            confidence: 1.0
        });
        // Introduce small delay to ensure distinct createdAt timestamps
        await new Promise(resolve => setTimeout(resolve, 50));
        const tx2 = await repo.create(tenantAId, userAId, {
            date: new Date(),
            description: "Tx 2",
            amount: -20,
            balance: 80,
            confidence: 1.0
        });
        await new Promise(resolve => setTimeout(resolve, 50));
        const tx3 = await repo.create(tenantAId, userAId, {
            date: new Date(),
            description: "Tx 3",
            amount: -30,
            balance: 50,
            confidence: 1.0
        });

        // Fetch page 1 (limit: 2)
        const page1 = await repo.findMany(tenantAId, { limit: 2 });
        expect(page1.data.length).toBe(2);
        expect(page1.data[0].description).toBe("Tx 3"); // Latest first (desc)
        expect(page1.data[1].description).toBe("Tx 2");
        expect(page1.meta.hasNextPage).toBe(true);
        expect(page1.meta.nextCursor).toBeDefined();

        // Fetch page 2 (limit: 2) using nextCursor
        const page2 = await repo.findMany(tenantAId, { limit: 2, cursor: page1.meta.nextCursor! });
        // Since there is Tx 1 and our first saved Starbucks tx, we should have 2 items remaining
        expect(page2.data.length).toBe(2);
        expect(page2.data[0].description).toBe("Tx 1");
    });

    test("should strictly enforce tenant isolation", async () => {
        // Create a transaction under Tenant A
        const txA = await repo.create(tenantAId, userAId, {
            date: new Date(),
            description: "Secret Transaction Tenant A",
            amount: -100,
            balance: 500,
            confidence: 1.0
        });

        // Try to query Tenant B's transactions - should NOT see Tenant A's transaction
        const resultB = await repo.findMany(tenantBId, {});
        const found = resultB.data.some(t => t.id === txA.id);
        expect(found).toBe(false);

        // Try to fetch Tenant A's transaction using Tenant B context - should return null
        const directFetch = await repo.findById(tenantBId, txA.id);
        expect(directFetch).toBeNull();
    });
});
