const TOKEN_KEY = 'hms_token';
const USER_KEY = 'hms_user';

/**
 * Routes that should not display any sidebar or navigation
 */
export const AUTH_ROUTES = ['/login', '/register', '/staff/login'] as const;

/**
 * Check if a given pathname is an auth route
 */
export function isAuthRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return AUTH_ROUTES.includes(pathname as typeof AUTH_ROUTES[number]);
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'receptionist' | 'cleaner';
}

export interface LoginResponse {
  token: string;
  user: User;
}

/**
 * Get the stored JWT token
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store the JWT token
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove the stored JWT token
 */
export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Get the stored user info
 */
export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
}

/**
 * Store user info
 */
export function setStoredUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Remove stored user info
 */
export function removeStoredUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * Login and store credentials
 */
export function login(response: LoginResponse): void {
  setAuthToken(response.token);
  setStoredUser(response.user);
}

/**
 * Logout and clear credentials
 */
export function logout(): void {
  removeAuthToken();
  removeStoredUser();
}

/**
 * Check if user has admin role
 */
export function isAdmin(): boolean {
  const user = getStoredUser();
  return user?.role === 'admin';
}

/**
 * Check if user has receptionist role
 */
export function isReceptionist(): boolean {
  const user = getStoredUser();
  return user?.role === 'receptionist';
}

