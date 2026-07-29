export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface ApiResponse {
  statusCode: number;
  responseTime: number;
  headers: Record<string, string>;
  body: any;
}