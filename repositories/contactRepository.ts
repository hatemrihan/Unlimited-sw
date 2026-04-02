import { fetchWithRetry } from '@/utils/fetchWithRetry';

/**
 * Pure HTTP transport layer.
 * Strips all React, Toast, and Business Logic constraints heavily.
 */
export const contactRepository = {
  fetchContacts: async (signal?: AbortSignal, page = 1, limit = 20, search = "") => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });
    if (search) params.append('search', search);

    const response = await fetchWithRetry(`/api/contacts?${params.toString()}`, { signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: HTTP ${response.status}`);
    }
    return response.json();
  }
};
