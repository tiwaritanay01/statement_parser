export interface ParsedTransaction {
    date: Date;
    description: string;
    amount: number;
    balance: number | null;
    confidence: number;
}

function calculateConfidence(
    date: Date, 
    description: string, 
    amountFound: boolean, 
    balanceFound: boolean
): number {
    const dateFound = date && !isNaN(date.getTime());
    const descriptionFound = typeof description === 'string' && description.trim().length > 0 && description !== "Unknown Transaction" && description !== "Parsed Transaction";

    const score = 
        (dateFound ? 25 : 0) +
        (descriptionFound ? 25 : 0) +
        (amountFound ? 25 : 0) +
        (balanceFound ? 25 : 0);

    const rawConfidence = score / 100;

    return Number.isFinite(rawConfidence)
        ? Math.max(0, Math.min(1, rawConfidence))
        : 0;
}

export function parseTransaction(text: string): ParsedTransaction {
    const trimmed = text.trim();

    // 1. Try Sample Pattern 1:
    // Date: 11 Dec 2025
    // Description: STARBUCKS COFFEE MUMBAI
    // Amount: -420.00
    // Balance after transaction: 18,420.50
    const match1 = trimmed.match(
        /Date:\s*([^\r\n]+)\r?\nDescription:\s*([^\r\n]+)\r?\nAmount:\s*([^\r\n]+)\r?\nBalance after transaction:\s*([^\r\n]+)/i
    );
    if (match1) {
        const rawDate = match1[1].trim();
        const rawDesc = match1[2].trim();
        const rawAmount = match1[3].trim().replace(/[^\d.-]/g, "");
        const rawBalance = match1[4].trim().replace(/[^\d.-]/g, "");

        const date = new Date(rawDate);
        const amount = parseFloat(rawAmount);
        const balance = parseFloat(rawBalance);

        if (!isNaN(date.getTime()) && !isNaN(amount) && !isNaN(balance)) {
            return {
                date,
                description: rawDesc,
                amount,
                balance,
                confidence: calculateConfidence(date, rawDesc, true, true),
            };
        }
    }

    // 2. Try Sample Pattern 2:
    // Uber Ride * Airport Drop
    // 12/11/2025 → ₹1,250.00 debited
    // Available Balance → ₹17,170.50
    const match2 = trimmed.match(
        /^([^\r\n]+)\r?\n(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\s*→\s*(?:[^\d]*)\s*([\d,.]+)\s*(debited|credited)\r?\nAvailable Balance\s*→\s*(?:[^\d]*)\s*([\d,.]+)/i
    );
    if (match2) {
        const rawDesc = match2[1].trim();
        const rawDate = match2[2].trim();
        const rawAmount = match2[3].trim().replace(/[^\d.]/g, "");
        const direction = match2[4].toLowerCase();
        const rawBalance = match2[5].trim().replace(/[^\d.]/g, "");

        const dateParts = rawDate.split(/[\/-]/);
        const date = new Date(
            parseInt(dateParts[2], 10),
            parseInt(dateParts[0], 10) - 1,
            parseInt(dateParts[1], 10)
        );

        let amount = parseFloat(rawAmount);
        if (direction === "debited") {
            amount = -Math.abs(amount);
        } else {
            amount = Math.abs(amount);
        }

        const balance = parseFloat(rawBalance);

        if (!isNaN(date.getTime()) && !isNaN(amount) && !isNaN(balance)) {
            return {
                date,
                description: rawDesc,
                amount,
                balance,
                confidence: calculateConfidence(date, rawDesc, true, true),
            };
        }
    }

    // 3. Try Sample Pattern 3:
    // txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping
    const match3 = trimmed.match(
        /^txn\d+\s+(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(?:[^\d]*)\s*([\d,.]+)\s+(Dr|Cr)\s+Bal\s+([\d,.]+)(?:\s+\w+)?$/i
    );
    if (match3) {
        const rawDate = match3[1].trim();
        const rawDesc = match3[2].trim();
        const rawAmount = match3[3].trim().replace(/[^\d.]/g, "");
        const type = match3[4].toLowerCase();
        const rawBalance = match3[5].trim().replace(/[^\d.]/g, "");

        const date = new Date(rawDate);
        let amount = parseFloat(rawAmount);
        if (type === "dr") {
            amount = -Math.abs(amount);
        } else {
            amount = Math.abs(amount);
        }
        const balance = parseFloat(rawBalance);

        if (!isNaN(date.getTime()) && !isNaN(amount) && !isNaN(balance)) {
            return {
                date,
                description: rawDesc,
                amount,
                balance,
                confidence: calculateConfidence(date, rawDesc, true, true),
            };
        }
    }

    // 4. Heuristic Fallback (Defensive Parsing)
    const dateMatch = trimmed.match(
        /(\d{1,2}\s+[a-zA-Z]{3}\s+\d{4})|(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})|(\d{4}-\d{2}-\d{2})/
    );
    const amountMatches = [...trimmed.matchAll(/(?:-|₹|\bRs\.?|\bAmt:?)\s*([\d,]+\.\d{2})/gi)];
    
    let date = new Date(NaN); // Use invalid date as default to avoid false positives
    if (dateMatch) {
        const tempDate = new Date(dateMatch[0]);
        if (!isNaN(tempDate.getTime())) {
            date = tempDate;
        }
    }

    let amount = 0; // Default safe fallback
    let balance: number | null = null;
    let amountFound = false;
    let balanceFound = false;

    if (amountMatches.length > 0) {
        const val1 = parseFloat(amountMatches[0][1].replace(/,/g, ""));
        if (!isNaN(val1)) {
            amount = val1;
            amountFound = true;
        }
        if (amountMatches.length > 1) {
            const val2 = parseFloat(amountMatches[1][1].replace(/,/g, ""));
            if (!isNaN(val2)) {
                balance = val2;
                balanceFound = true;
            }
        }
    }

    // Attempt to derive description
    let description = trimmed.split("\n")[0] || "";
    if (dateMatch) {
        description = description.replace(dateMatch[0], "");
    }
    description = description.replace(/[^\w\s\-\*#\.\/]/g, "").trim() || "";

    const confidence = calculateConfidence(date, description, amountFound, balanceFound);

    // If date is invalid, we still must supply a valid date to the DB schema
    if (isNaN(date.getTime())) {
        date = new Date(); // fallback to current date so Prisma doesn't crash
    }

    return {
        date,
        description: description || "Unknown Transaction",
        amount,
        balance,
        confidence,
    };
}
