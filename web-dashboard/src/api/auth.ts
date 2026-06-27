import apiClient from './client';

export interface LoginRequest {
  email:    string;
  org_name: string;
}

export interface LoginResponse {
  token:      string;
  expires_in: string;
  org: {
    id:             string;
    name:           string;
    risk_tolerance: number;
  };
}

export const login = async (payload: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', payload);
  return response.data;
};

export const getStoredToken = (): string | null =>
  sessionStorage.getItem('pmcs_token');

export const storeToken = (token: string): void =>
  sessionStorage.setItem('pmcs_token', token);

export const clearToken = (): void =>
  sessionStorage.removeItem('pmcs_token');
