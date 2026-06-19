import { encodeCursor, decodeCursor } from "../../src/utils/cursor.js";

describe("Cursor Utilities", () => {
    it("should correctly encode and decode a cursor", () => {
        const payload = { id: "123", createdAt: new Date("2026-06-19").toISOString() };
        const cursor = encodeCursor(payload);
        const decoded = decodeCursor(cursor);
        expect(decoded).toEqual(payload);
    });
});
