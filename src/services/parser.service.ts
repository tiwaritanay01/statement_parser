export interface ParsedTransaction {
    date: Date;
    description: string;
    amount: number;
    balance: number | null;
    confidence: number;
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
        const rawAmount = match1[3].trim().replace(/[^\d.-]/g, ""); // Allow negative and decimals
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
                confidence: 1.0,
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

        // Determine correct Date parsing for MM/DD/YYYY vs DD/MM/YYYY
        // For Sample 2: 12/11/2025 (Dec 11, 2025)
        const dateParts = rawDate.split(/[\/-]/);
        // Treat as MM/DD/YYYY (US format)
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
                confidence: 1.0,
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
                confidence: 1.0,
            };
        }
    }

    // 4. Heuristic Fallback (Defensive Parsing)
    // Try to extract date
    const dateMatch = trimmed.match(
        /(\d{1,2}\s+[a-zA-Z]{3}\s+\d{4})|(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})|(\d{4}-\d{2}-\d{2})/
    );
    // Try to extract amounts/balance
    const amountMatches = [...trimmed.matchAll(/(?:-|₹|\bRs\.?|\bAmt:?)\s*([\d,]+\.\d{2})/gi)];
    
    let date = new Date();
    if (dateMatch) {
        const tempDate = new Date(dateMatch[0]);
        if (!isNaN(tempDate.getTime())) {
            date = tempDate;
        }
    }

    let amount = 0;
    let balance: number | null = null;
    let confidence = 0.2;

    if (amountMatches.length > 0) {
        // Assume first amount found is the transaction amount, second is balance
        const val1 = parseFloat(amountMatches[0][1].replace(/,/g, ""));
        if (!isNaN(val1)) {
            amount = val1;
            confidence = 0.5;
        }
        if (amountMatches.length > 1) {
            const val2 = parseFloat(amountMatches[1][1].replace(/,/g, ""));
            if (!isNaN(val2)) {
                balance = val2;
                confidence = 0.7;
            }
        }
    }

    // Try to derive description by taking the first line, removing dates and amounts
    let description = trimmed.split("\n")[0] || "Unknown Transaction";
    if (dateMatch) {
        description = description.replace(dateMatch[0], "");
    }
    description = description.replace(/[^\w\s\-\*#\.\/]/g, "").trim() || "Parsed Transaction";

    return {
        date,
        description,
        amount,
        balance,
        confidence,
    };
}
