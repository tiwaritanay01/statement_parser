"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, LogOut, FileText, Plus, Database, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { Transaction, PaginatedResponse } from "@/lib/types";

export default function TransactionDashboard({ user }: { user: any }) {
  const router = useRouter();
  
  // Input State
  const [statementText, setStatementText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  
  // List State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchTransactions = async (cursor?: string | null, append = false) => {
    try {
      const query = cursor ? `?cursor=${cursor}&limit=10` : "?limit=10";
      const { data, error } = await api<PaginatedResponse<Transaction>>(`/transactions${query}`, {
        method: "GET"
      });
      
      if (error) throw error;
      
      if (data) {
        if (append) {
          setTransactions((prev) => [...prev, ...data.data]);
        } else {
          setTransactions(data.data);
        }
        setNextCursor(data.meta.nextCursor);
      }
    } catch (err) {
      toast.error("Failed to load transactions.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const handleExtract = async () => {
    if (!statementText.trim()) {
      toast.error("Please enter a transaction statement.");
      return;
    }

    setIsExtracting(true);
    try {
      const { data, error } = await api<Transaction>("/transactions/extract", {
        method: "POST",
        body: {
          text: statementText
        }
      });

      if (error) {
        toast.error((error as any).error || "Invalid transaction format or extraction failed.");
      } else if (data) {
        toast.success("Transaction extracted and saved successfully!");
        setStatementText("");
        // Reload from top to show the newest transaction
        setIsLoading(true);
        await fetchTransactions();
      }
    } catch (err) {
      toast.error("An unexpected error occurred during extraction.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleLoadMore = () => {
    if (nextCursor) {
      setIsLoadingMore(true);
      fetchTransactions(nextCursor, true);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              Vessify Extraction
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-sm text-zinc-400">
              <span className="font-medium text-zinc-300">{user.name}</span> ({user.email})
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Input Form */}
        <div className="lg:col-span-1">
          <Card className="bg-zinc-900 border-zinc-800 shadow-xl sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Parse Statement
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Paste raw bank or credit card transaction text below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="Date: 11 Dec 2025&#10;Description: STARBUCKS COFFEE...&#10;Amount: -420.00"
                value={statementText}
                onChange={(e) => setStatementText(e.target.value)}
                className="min-h-[200px] font-mono text-sm bg-zinc-950 border-zinc-800 text-zinc-300 resize-y focus-visible:ring-blue-500"
                disabled={isExtracting}
              />
              <Button 
                onClick={handleExtract} 
                disabled={isExtracting || !statementText.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Parse & Save
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Transaction List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Transactions</h2>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/50">
              <Database className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-zinc-300 font-medium">No transactions found</h3>
              <p className="text-zinc-500 text-sm mt-1">Paste a statement on the left to extract your first transaction.</p>
            </div>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-950/50">
                    <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableHead className="text-zinc-400 font-medium whitespace-nowrap">Date</TableHead>
                      <TableHead className="text-zinc-400 font-medium min-w-[200px]">Description</TableHead>
                      <TableHead className="text-zinc-400 font-medium text-right">Amount</TableHead>
                      <TableHead className="text-zinc-400 font-medium text-right">Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id} className="border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                        <TableCell className="text-zinc-300 whitespace-nowrap">
                          {format(new Date(t.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-zinc-100 font-medium">
                          {t.description}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${t.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {typeof t.confidence === 'number' && t.confidence >= 0.9 ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                            )}
                            <span className={typeof t.confidence === 'number' && t.confidence >= 0.9 ? 'text-emerald-400' : 'text-amber-400'}>
                              {Math.round((t.confidence ?? 0) * 100)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Pagination */}
          {!isLoading && nextCursor && (
            <div className="flex justify-center pt-4 pb-8">
              <Button 
                variant="outline" 
                onClick={handleLoadMore} 
                disabled={isLoadingMore}
                className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
