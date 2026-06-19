export function encodeCursor(payload: Record<string, any>): string {
    return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function decodeCursor<T>(cursor: string): T {
    return JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
}
