"use client";

import { Search, Calendar, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface BookingFiltersState {
  status: string;
  guestName: string;
  fromDate: string;
  toDate: string;
}

interface BookingFiltersProps {
  filters: BookingFiltersState;
  onFiltersChange: (filters: BookingFiltersState) => void;
  onClearFilters: () => void;
}

export function BookingFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: BookingFiltersProps) {
  const hasActiveFilters =
    filters.status !== "all" ||
    filters.guestName !== "" ||
    filters.fromDate !== "" ||
    filters.toDate !== "";

  const updateFilter = <K extends keyof BookingFiltersState>(
    key: K,
    value: BookingFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card className="mb-6 bg-slate-800/80 border-slate-700">
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Guest Name Search */}
          <div className="flex-1 min-w-[200px]">
            <Label className="text-slate-400 text-xs mb-1.5 block">
              Guest Name
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by guest name..."
                value={filters.guestName}
                onChange={(e) => updateFilter("guestName", e.target.value)}
                className="pl-10 bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-[180px]">
            <Label className="text-slate-400 text-xs mb-1.5 block">
              Status
            </Label>
            <Select
              value={filters.status}
              onValueChange={(value) => updateFilter("status", value)}
            >
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-100">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-100">
                  All Statuses
                </SelectItem>
                <SelectItem value="upcoming" className="text-slate-100">
                  Upcoming
                </SelectItem>
                <SelectItem value="checked_in" className="text-slate-100">
                  Checked In
                </SelectItem>
                <SelectItem value="checked_out" className="text-slate-100">
                  Checked Out
                </SelectItem>
                <SelectItem value="cancelled" className="text-slate-100">
                  Cancelled
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range - From */}
          <div className="w-[160px]">
            <Label className="text-slate-400 text-xs mb-1.5 block">
              From Date
            </Label>
            <div className="relative">
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => updateFilter("fromDate", e.target.value)}
                className="pr-10 bg-slate-700/50 border-slate-600 text-slate-100 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Date Range - To */}
          <div className="w-[160px]">
            <Label className="text-slate-400 text-xs mb-1.5 block">
              To Date
            </Label>
            <div className="relative">
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => updateFilter("toDate", e.target.value)}
                className="pr-10 bg-slate-700/50 border-slate-600 text-slate-100 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-slate-400 hover:text-slate-100"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
