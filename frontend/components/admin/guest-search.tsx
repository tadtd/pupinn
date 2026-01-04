"use client";

import { useState } from "react";
import { Search, User, Mail, Phone, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { type GuestResponse } from "@/lib/validators";

interface GuestSearchProps {
  onSelectGuest: (guest: GuestResponse) => void;
}

export function GuestSearch({ onSelectGuest }: GuestSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GuestResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search query");
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const { searchGuests } = await import("@/lib/api/guests");
      const response = await searchGuests(searchQuery);
      setResults(response.guests);
      if (response.guests.length === 0) {
        setError("No guests found matching your search");
      }
    } catch (err: unknown) {
      setError("Failed to search guests. Please try again.");
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by name, email, phone, ID number, or booking reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500 pl-10"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-amber-500 text-slate-900 hover:bg-amber-400"
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error}
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-slate-100 mb-3">
                Search Results ({results.length})
              </h3>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800/50">
                    <TableHead className="text-slate-300">Name</TableHead>
                    <TableHead className="text-slate-300">Email</TableHead>
                    <TableHead className="text-slate-300">Phone</TableHead>
                    <TableHead className="text-slate-300">ID Number</TableHead>
                    <TableHead className="text-slate-300 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((guest) => (
                    <TableRow
                      key={guest.id}
                      className="border-slate-700 hover:bg-slate-800/50"
                    >
                      <TableCell className="text-slate-100 font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          {guest.full_name || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {guest.email || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {guest.phone || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-slate-400" />
                          {guest.id_number || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => onSelectGuest(guest)}
                          size="sm"
                          className="bg-amber-500 text-slate-900 hover:bg-amber-400"
                        >
                          View Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

