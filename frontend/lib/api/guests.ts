import { apiClient } from "../api-client";
import type {
  GuestSearchResponse,
  GuestProfileResponse,
  GuestNoteResponse,
  GuestResponse,
  UpdateGuestRequest,
  AddGuestNoteRequest,
} from "../validators";

/**
 * Search for guests
 */
export async function searchGuests(query: string): Promise<GuestSearchResponse> {
  const response = await apiClient.get<GuestSearchResponse>("/admin/guests/search", {
    params: { q: query },
  });
  return response.data;
}

/**
 * Get full guest profile with PII and booking history
 */
export async function getGuestProfile(guestId: string): Promise<GuestProfileResponse> {
  const response = await apiClient.get<GuestProfileResponse>(
    `/admin/guests/${guestId}`
  );
  return response.data;
}

/**
 * Update guest information
 */
export async function updateGuest(
  guestId: string,
  request: UpdateGuestRequest
): Promise<GuestResponse> {
  const response = await apiClient.patch<GuestResponse>(
    `/admin/guests/${guestId}`,
    request
  );
  return response.data;
}

/**
 * Get all interaction notes for a guest
 */
export async function getGuestNotes(guestId: string): Promise<GuestNoteResponse[]> {
  const response = await apiClient.get<GuestNoteResponse[]>(
    `/admin/guests/${guestId}/notes`
  );
  return response.data;
}

/**
 * Add an interaction note for a guest
 */
export async function addGuestNote(
  guestId: string,
  request: AddGuestNoteRequest
): Promise<GuestNoteResponse> {
  const response = await apiClient.post<GuestNoteResponse>(
    `/admin/guests/${guestId}/notes`,
    request
  );
  return response.data;
}

/**
 * Get error message from error object
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}

// Re-export types for convenience
export type {
  GuestSearchResponse,
  GuestProfileResponse,
  GuestNoteResponse,
  UpdateGuestRequest,
  AddGuestNoteRequest,
} from "../validators";

