import { API_BASE } from './apiConfig';
import { CustomProductRequest } from '../types';

export interface CreateCustomRequestData {
  artisan_id: number;
  product_id?: number | null;
  customization_details: string;
  quantity: number;
  preferred_color?: string;
  preferred_size?: string;
  reference_image_url?: string;
  additional_note?: string;
}

export const customRequestsApi = {
  async createCustomRequest(data: CreateCustomRequestData): Promise<CustomProductRequest> {
    const response = await fetch(`${API_BASE}/api/custom-requests`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to submit custom product request');
    }
    return result.data;
  },

  async getCustomerCustomRequests(): Promise<CustomProductRequest[]> {
    const response = await fetch(`${API_BASE}/api/customer/custom-requests`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to fetch your custom requests');
    }
    return result.data || [];
  },

  async getCustomerCustomRequestDetails(requestId: number): Promise<CustomProductRequest> {
    const response = await fetch(`${API_BASE}/api/customer/custom-requests/${requestId}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to fetch request details');
    }
    return result.data;
  },

  async acceptQuote(requestId: number): Promise<CustomProductRequest> {
    const response = await fetch(`${API_BASE}/api/customer/custom-requests/${requestId}/accept`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to accept quote');
    }
    return result.data;
  },

  async getArtisanCustomRequests(): Promise<CustomProductRequest[]> {
    const response = await fetch(`${API_BASE}/api/artisan/custom-requests`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to fetch artisan custom requests');
    }
    return result.data || [];
  },

  async quoteCustomRequest(
    requestId: number,
    quotedPrice: number,
    artisanMessage?: string
  ): Promise<CustomProductRequest> {
    const response = await fetch(`${API_BASE}/api/artisan/custom-requests/${requestId}/quote`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        quoted_price: quotedPrice,
        artisan_message: artisanMessage,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to send price quote');
    }
    return result.data;
  },

  async rejectCustomRequest(
    requestId: number,
    artisanMessage?: string
  ): Promise<CustomProductRequest> {
    const response = await fetch(`${API_BASE}/api/artisan/custom-requests/${requestId}/reject`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        artisan_message: artisanMessage,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to reject request');
    }
    return result.data;
  },
};
