import { apiClient } from "../api-client";
import type {
  RoomFinancialSummary,
  RoomFinancialsResponse,
  CompareRoomsRequest,
  CompareRoomsResponse,
} from "../validators";

/**
 * List all rooms with financial summary
 */
export async function listRoomsWithFinancials(
  startDate?: string,
  endDate?: string
): Promise<RoomFinancialSummary[]> {
  const params: Record<string, string> = {};
  if (startDate) {
    params.start_date = startDate;
  }
  if (endDate) {
    params.end_date = endDate;
  }
  const response = await apiClient.get<RoomFinancialSummary[]>(
    "/admin/financial/rooms",
    { params }
  );
  return response.data;
}

/**
 * Get detailed financial report for a specific room
 */
export async function getRoomFinancials(
  roomId: string,
  startDate?: string,
  endDate?: string
): Promise<RoomFinancialSummary> {
  const params: Record<string, string> = {};
  if (startDate) {
    params.start_date = startDate;
  }
  if (endDate) {
    params.end_date = endDate;
  }
  const response = await apiClient.get<RoomFinancialSummary>(
    `/admin/financial/rooms/${roomId}`,
    { params }
  );
  return response.data;
}

/**
 * Compare multiple rooms
 */
export async function compareRooms(
  request: CompareRoomsRequest
): Promise<CompareRoomsResponse> {
  const response = await apiClient.post<CompareRoomsResponse>(
    "/admin/financial/rooms/compare",
    request
  );
  return response.data;
}

