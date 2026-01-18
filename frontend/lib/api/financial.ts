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
  endDate?: string,
  usePayments?: boolean
): Promise<RoomFinancialSummary[]> {
  const params: Record<string, string> = {};
  if (startDate) {
    params.start_date = startDate;
  }
  if (endDate) {
    params.end_date = endDate;
  }
  if (usePayments !== undefined) {
    params.use_payments = usePayments.toString();
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
  endDate?: string,
  usePayments?: boolean
): Promise<RoomFinancialSummary> {
  const params: Record<string, string> = {};
  if (startDate) {
    params.start_date = startDate;
  }
  if (endDate) {
    params.end_date = endDate;
  }
  if (usePayments !== undefined) {
    params.use_payments = usePayments.toString();
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

/**
 * Revenue data point
 */
export interface RevenueDataPoint {
  date: string;
  revenue: string;
}

/**
 * Revenue time-series response
 */
export interface RevenueTimeSeriesResponse {
  data: RevenueDataPoint[];
}

/**
 * Get revenue time-series data
 */
export async function getRevenueTimeSeries(
  startDate?: string,
  endDate?: string
): Promise<RevenueTimeSeriesResponse> {
  const params: Record<string, string> = {};
  if (startDate) {
    params.start_date = startDate;
  }
  if (endDate) {
    params.end_date = endDate;
  }
  const response = await apiClient.get<RevenueTimeSeriesResponse>(
    "/admin/financial/revenue/time-series",
    { params }
  );
  return response.data;
}

/**
 * Get revenue time-series data for a specific room
 */
export async function getRoomRevenueTimeSeries(
  roomId: string,
  startDate?: string,
  endDate?: string
): Promise<RevenueTimeSeriesResponse> {
  const params: Record<string, string> = {};
  if (startDate) {
    params.start_date = startDate;
  }
  if (endDate) {
    params.end_date = endDate;
  }
  const response = await apiClient.get<RevenueTimeSeriesResponse>(
    `/admin/financial/rooms/${roomId}/revenue/time-series`,
    { params }
  );
  return response.data;
}

/**
 * Booking with room details
 */
export interface BookingWithRoom {
  id: string;
  reference: string;
  guest_name: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  creation_source: string;
  price: string;
  room: {
    id: string;
    number: string;
    room_type: string;
    status: string;
  } | null;
}

/**
 * Get booking history for a specific room
 */
export async function getRoomBookingHistory(
  roomId: string,
  startDate?: string,
  endDate?: string
): Promise<BookingWithRoom[]> {
  const params: Record<string, string> = {};
  if (startDate) {
    params.start_date = startDate;
  }
  if (endDate) {
    params.end_date = endDate;
  }
  const response = await apiClient.get<BookingWithRoom[]>(
    `/admin/financial/rooms/${roomId}/bookings`,
    { params }
  );
  return response.data;
}
