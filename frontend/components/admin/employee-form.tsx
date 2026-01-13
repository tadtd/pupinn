"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  createEmployee,
  updateEmployee,
  getErrorMessage,
  listEmployees,
} from "@/lib/api-client";
import {
  type Employee,
  type CreateEmployeeRequest,
  type UpdateEmployeeRequest,
  CreateEmployeeRequestSchema,
  UpdateEmployeeRequestSchema,
} from "@/lib/validators";

interface EmployeeFormProps {
  employee?: Employee;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function EmployeeForm({
  employee,
  onSuccess,
  onCancel,
}: EmployeeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = !!employee;

  // Check if an admin already exists
  const { data: adminCheck } = useQuery({
    queryKey: ["employees", "admin-check"],
    queryFn: async () => {
      const result = await listEmployees({ role: "admin", page: 1, per_page: 1 });
      return result.total > 0;
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  const adminExists = adminCheck ?? false;

  const createForm = useForm<CreateEmployeeRequest>({
    resolver: zodResolver(CreateEmployeeRequestSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "receptionist",
      email: null,
      full_name: null,
    },
  });

  const updateForm = useForm<UpdateEmployeeRequest>({
    resolver: zodResolver(UpdateEmployeeRequestSchema),
    defaultValues: employee
      ? {
          username: employee.username || null,
          role: employee.role === "guest" ? null : employee.role,
          email: employee.email || null,
          full_name: employee.full_name || null,
        }
      : {},
  });

  const selectedRole = isEditMode 
    ? updateForm.watch("role")
    : createForm.watch("role");

  useEffect(() => {
    if (employee && isEditMode) {
      updateForm.setValue("username", employee.username || null);
      updateForm.setValue("role", employee.role === "guest" ? null : employee.role);
      updateForm.setValue("email", employee.email || null);
      updateForm.setValue("full_name", employee.full_name || null);
    }
  }, [employee, isEditMode, updateForm]);

  const onSubmit = async (
    data: CreateEmployeeRequest | UpdateEmployeeRequest
  ) => {
    setIsLoading(true);
    setError(null);

    // Additional client-side validation: prevent creating/updating to admin if one exists
    const role = "role" in data ? data.role : (data as UpdateEmployeeRequest).role;
    if (role === "admin" && adminExists) {
      const isChangingToAdmin = isEditMode && employee?.role !== "admin";
      if (isChangingToAdmin || !isEditMode) {
        setError(
          "Only one admin account is allowed in the system. An admin account already exists."
        );
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isEditMode && employee) {
        await updateEmployee(employee.id, data as UpdateEmployeeRequest);
      } else {
        await createEmployee(data as CreateEmployeeRequest);
      }
      onSuccess();
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      // Ensure constraint violation errors are clearly displayed
      if (
        errorMessage.includes("admin") ||
        errorMessage.includes("Only one admin")
      ) {
        setError(errorMessage);
      } else {
        setError(
          errorMessage ||
            `Failed to ${isEditMode ? "update" : "create"} employee`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={isEditMode ? updateForm.handleSubmit(onSubmit) : createForm.handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
          {error}
        </div>
      )}

      {/* Username */}
      <div className="space-y-2">
        <Label htmlFor="username" className="text-slate-300">
          Username {!isEditMode && <span className="text-red-400">*</span>}
        </Label>
        <Input
          id="username"
          placeholder="e.g., jdoe"
          className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
          {...(isEditMode ? updateForm.register("username") : createForm.register("username"))}
          disabled={isLoading}
        />
        {(isEditMode ? updateForm.formState.errors.username : createForm.formState.errors.username) && (
          <p className="text-sm text-red-400">
            {(isEditMode ? updateForm.formState.errors.username : createForm.formState.errors.username)?.message as string}
          </p>
        )}
      </div>

      {/* Password (only for create mode) */}
      {!isEditMode && (
        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-300">
            Password <span className="text-red-400">*</span>
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
            {...createForm.register("password")}
            disabled={isLoading}
          />
          {createForm.formState.errors.password && (
            <p className="text-sm text-red-400">
              {createForm.formState.errors.password?.message as string}
            </p>
          )}
        </div>
      )}

      {/* Role */}
      <div className="space-y-2">
        <Label className="text-slate-300">
          Role <span className="text-red-400">*</span>
        </Label>
        <Select
          value={selectedRole || undefined}
          onValueChange={(value) => {
            if (isEditMode) {
              updateForm.setValue("role", value as "admin" | "receptionist" | "cleaner");
            } else {
              createForm.setValue("role", value as "admin" | "receptionist" | "cleaner");
            }
          }}
          disabled={isLoading}
        >
          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-100">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {(!adminExists || (isEditMode && employee?.role === "admin")) && (
              <SelectItem value="admin" className="text-slate-100">
                Admin
              </SelectItem>
            )}
            <SelectItem value="receptionist" className="text-slate-100">
              Receptionist
            </SelectItem>
            <SelectItem value="cleaner" className="text-slate-100">
              Cleaner
            </SelectItem>
          </SelectContent>
        </Select>
        {adminExists && !isEditMode && (
          <p className="text-sm text-amber-400">
            Only one admin account is allowed. An admin account already exists.
          </p>
        )}
        {adminExists && isEditMode && employee?.role !== "admin" && (
          <p className="text-sm text-amber-400">
            Only one admin account is allowed. An admin account already exists.
          </p>
        )}
        {(isEditMode ? updateForm.formState.errors.role : createForm.formState.errors.role) && (
          <p className="text-sm text-red-400">
            {(isEditMode ? updateForm.formState.errors.role : createForm.formState.errors.role)?.message as string}
          </p>
        )}
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="full_name" className="text-slate-300">
          Full Name
        </Label>
        <Input
          id="full_name"
          placeholder="e.g., John Doe"
          className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
          {...(isEditMode ? updateForm.register("full_name") : createForm.register("full_name"))}
          disabled={isLoading}
        />
        {(isEditMode ? updateForm.formState.errors.full_name : createForm.formState.errors.full_name) && (
          <p className="text-sm text-red-400">
            {(isEditMode ? updateForm.formState.errors.full_name : createForm.formState.errors.full_name)?.message as string}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-300">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="e.g., john.doe@example.com"
          className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
          {...(isEditMode ? updateForm.register("email") : createForm.register("email"))}
          disabled={isLoading}
        />
        {(isEditMode ? updateForm.formState.errors.email : createForm.formState.errors.email) && (
          <p className="text-sm text-red-400">
            {(isEditMode ? updateForm.formState.errors.email : createForm.formState.errors.email)?.message as string}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className="text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-500 text-slate-900 hover:bg-amber-400 font-semibold"
        >
          {isLoading
            ? isEditMode
              ? "Updating..."
              : "Creating..."
            : isEditMode
            ? "Update Employee"
            : "Create Employee"}
        </Button>
      </div>
    </form>
  );
}

