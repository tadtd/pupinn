"use client";

import { useState } from "react";
import { format } from "date-fns";
import { User, Edit, Shield, UserCog, Brush, AlertCircle } from "lucide-react"; // <--- REMOVED Trash2

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { type Employee, type UserRole } from "@/lib/validators";
import { deleteEmployee, reactivateEmployee, getErrorMessage } from "@/lib/api-client";
import { EmployeeForm } from "./employee-form";

interface EmployeeListProps {
  employees: Employee[];
  isLoading: boolean;
  error: Error | null;
  onEmployeeUpdated: () => void | Promise<void>;
}

export function EmployeeList({
  employees,
  isLoading,
  error,
  onEmployeeUpdated,
}: EmployeeListProps) {
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  // Check if employee is the last admin
  const isLastAdmin = (employee: Employee): boolean => {
    if (employee.role !== "admin" || employee.deactivated_at) {
      return false;
    }
    const activeAdmins = employees.filter(
      (e) => e.role === "admin" && !e.deactivated_at
    );
    return activeAdmins.length === 1;
  };

  const getRoleBadge = (role: UserRole) => {
    const variants: Record<
      UserRole,
      { className: string; label: string; icon: React.ReactNode }
    > = {
      admin: {
        className: "bg-purple-500 hover:bg-purple-600",
        label: "Admin",
        icon: <Shield className="h-3 w-3 mr-1" />,
      },
      receptionist: {
        className: "bg-blue-500 hover:bg-blue-600",
        label: "Receptionist",
        icon: <UserCog className="h-3 w-3 mr-1" />,
      },
      cleaner: {
        className: "bg-amber-500 hover:bg-amber-600",
        label: "Cleaner",
        icon: <Brush className="h-3 w-3 mr-1" />,
      },
      guest: {
        className: "bg-slate-500 hover:bg-slate-600",
        label: "Guest",
        icon: <User className="h-3 w-3 mr-1" />,
      },
    };
    const variant = variants[role] || {
      className: "bg-slate-500 hover:bg-slate-600",
      label: role || "Unknown",
      icon: <User className="h-3 w-3 mr-1" />,
    };
    return (
      <Badge className={variant.className}>
        {variant.icon}
        {variant.label}
      </Badge>
    );
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingEmployee(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    onEmployeeUpdated();
  };

  // <--- RENAMED FUNCTION to handleDeactivate for clarity
  const handleDeactivate = async (employee: Employee) => {
    if (isLastAdmin(employee)) {
      setDeleteError(
        "Cannot deactivate the last admin account. The system must have at least one active admin account."
      );
      return;
    }
    console.log("1. Deactivate button clicked for:", employee.username);

    // <--- CHANGED confirmation text to say "Deactivate" instead of "Delete"
    if (
      !confirm(
        `Are you sure you want to deactivate ${employee.username || employee.full_name || "this employee"}? They will no longer be able to log in.`
      )
    ) {
      return;
    }

    setDeletingId(employee.id);
    console.log("3. Sending DELETE request...");
    setDeleteError(null);

    try {
      await deleteEmployee(employee.id);
      console.log("4. DELETE Success!");
      // Wait a bit to ensure the backend has processed the deletion
      await new Promise(resolve => setTimeout(resolve, 500));
      // Await the update to prevent UI re-rendering before new data is fetched
      await onEmployeeUpdated();
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      console.error("5. DELETE Failed:", err);
      if (
        errorMessage.includes("last admin") ||
        errorMessage.includes("Cannot delete")
      ) {
        setDeleteError(errorMessage);
      } else {
        setDeleteError(`Failed to deactivate employee: ${errorMessage}`);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleReactivate = async (employee: Employee) => {
    if (
      !confirm(
        `Are you sure you want to reactivate ${employee.username || employee.full_name || "this employee"}? They will be able to log in again.`
      )
    ) {
      return;
    }

    setReactivatingId(employee.id);
    setDeleteError(null);

    try {
      await reactivateEmployee(employee.id);
      // Wait a bit to ensure the backend has processed the reactivation
      await new Promise(resolve => setTimeout(resolve, 500));
      // Await the update to prevent UI re-rendering before new data is fetched
      await onEmployeeUpdated();
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      console.error("Reactivate Failed:", err);
      setDeleteError(`Failed to reactivate employee: ${errorMessage}`);
    } finally {
      setReactivatingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="p-8 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
          Loading employees...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="p-8 text-center text-red-400">
          <AlertCircle className="h-8 w-8 mx-auto mb-4" />
          Failed to load employees. Please try again.
        </CardContent>
      </Card>
    );
  }

  if (employees.length === 0) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="p-8 text-center text-slate-400">
          <User className="h-12 w-12 mx-auto mb-4 text-slate-500" />
          <p className="text-lg font-semibold mb-2">No employees found</p>
          <p className="text-sm">Create your first employee to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {deleteError && (
        <Card className="bg-slate-800/80 border-slate-700 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{deleteError}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteError(null)}
                className="ml-auto text-slate-400 hover:text-slate-200"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-800/50">
                <TableHead className="text-slate-300">Username</TableHead>
                <TableHead className="text-slate-300">Full Name</TableHead>
                <TableHead className="text-slate-300">Email</TableHead>
                <TableHead className="text-slate-300">Role</TableHead>
                <TableHead className="text-slate-300">Created</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="border-slate-700 hover:bg-slate-800/50"
                >
                  <TableCell className="text-slate-100 font-medium">
                    {employee.username || "—"}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {employee.full_name || "—"}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {employee.email || "—"}
                  </TableCell>
                  <TableCell>{getRoleBadge(employee.role)}</TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {format(new Date(employee.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {employee.deactivated_at ? (
                      <Badge className="bg-red-500 hover:bg-red-600">
                        Deactivated
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(employee)}
                        className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {/* <--- CHANGED: Replaced Trash Icon with explicit Deactivate Button */}
                      {!employee.deactivated_at && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeactivate(employee)}
                                  disabled={
                                    isLastAdmin(employee) ||
                                    deletingId === employee.id
                                  }
                                  className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
                                >
                                  {deletingId === employee.id ? "..." : "Deactivate"}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            
                            {isLastAdmin(employee) && (
                              <TooltipContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-xs">
                                <p className="text-sm">
                                  Cannot deactivate the last admin account.
                                </p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {/* Reactivate button for deactivated employees */}
                      {employee.deactivated_at && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleReactivate(employee)}
                          disabled={reactivatingId === employee.id}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {reactivatingId === employee.id ? "..." : "Reactivate"}
                        </Button>
                      )}

                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-100">
              {editingEmployee ? "Edit Employee" : "Create Employee"}
            </DialogTitle>
          </DialogHeader>
          <EmployeeForm
            employee={editingEmployee || undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}