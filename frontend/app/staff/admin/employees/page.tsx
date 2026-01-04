"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch"; 
import { Label } from "@/components/ui/label";   
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { EmployeeList } from "@/components/admin/employee-list";
import { listEmployees, deleteEmployee } from "@/lib/api-client";
import { type EmployeeListResponse, type UserRole, type EmployeeFilters } from "@/lib/validators";
import { EmployeeForm } from "@/components/admin/employee-form";

export default function AdminEmployeesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [includeDeactivated, setIncludeDeactivated] = useState(false); // New State
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/staff/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const {
    data: employeeData,
    isLoading,
    error,
    refetch,
  } = useQuery<EmployeeListResponse>({
    // Add includeDeactivated to queryKey so it refetches when toggled
    queryKey: ["employees", page, roleFilter, searchTerm, includeDeactivated], 
    queryFn: async () => {
      const filters: EmployeeFilters = {
        page,
        per_page: 20,
        include_deactivated: includeDeactivated, // Pass to API
      };
      if (roleFilter && roleFilter !== "all") {
        filters.role = roleFilter as UserRole;
      }
      if (searchTerm) {
        filters.search = searchTerm;
      }
      return await listEmployees(filters);
    },
    enabled: isAuthenticated,
  });

  const handleEmployeeUpdated = async () => {
    // Hard reset the employee queries to clear any cached/ghost data
    queryClient.removeQueries({ 
      queryKey: ["employees"],
      exact: false,
     });
    await refetch();
    window.location.reload();
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    handleEmployeeUpdated();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const employees = employeeData?.employees || [];
  const total = employeeData?.total || 0;
  const totalPages = Math.ceil(total / 20);

  // Stats now reflect the data returned (Active vs All)
  const stats = {
    total: total,
    admin: employees.filter((e) => e.role === "admin").length,
    receptionist: employees.filter((e) => e.role === "receptionist").length,
    cleaner: employees.filter((e) => e.role === "cleaner").length,
  };

  return (
    <RouteGuard requiredRole="admin">
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Employees</h1>
              <p className="text-slate-400 mt-1">
                Manage staff accounts and permissions
              </p>
            </div>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
                <div className="text-sm text-slate-400">Total Displayed</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-purple-400">{stats.admin}</div>
                <div className="text-sm text-slate-400">Admins</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-400">{stats.receptionist}</div>
                <div className="text-sm text-slate-400">Receptionists</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-amber-400">{stats.cleaner}</div>
                <div className="text-sm text-slate-400">Cleaners</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6 bg-slate-800/80 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by username or name..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                      }}
                      className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500 pl-10"
                    />
                  </div>
                </div>
                <div className="w-[180px]">
                  <Select
                    value={roleFilter}
                    onValueChange={(value) => {
                      setRoleFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-100">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                      <SelectItem value="cleaner">Cleaner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SHOW DEACTIVATED TOGGLE */}
                <div className="flex items-center space-x-2 bg-slate-700/30 p-2 px-3 rounded-md border border-slate-600">
                  <Switch 
                    id="show-deactivated" 
                    checked={includeDeactivated}
                    onCheckedChange={(checked: boolean) => {
                      setIncludeDeactivated(checked);
                      setPage(1);
                    }}
                  />
                  <Label htmlFor="show-deactivated" className="text-slate-300 text-sm cursor-pointer whitespace-nowrap">
                    Show Deactivated
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee List */}
          <EmployeeList
            employees={employees}
            isLoading={isLoading}
            error={error as Error | null}
            onEmployeeUpdated={handleEmployeeUpdated}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Card className="mt-6 bg-slate-800/80 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    Showing {employees.length} of {total} employees
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
                      className="text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center px-4 text-slate-300">
                      Page {page} of {totalPages}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || isLoading}
                      className="text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create Employee Dialog */}
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-100">
                  Create Employee
                </DialogTitle>
              </DialogHeader>
              <EmployeeForm
                onSuccess={handleFormSuccess}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </RouteGuard>
  );
}