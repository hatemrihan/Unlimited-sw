import { contactRepository } from '@/repositories/contactRepository';

/**
 * Domain Logic layer bridging Repositories and generic UI Hooks.
 */
export const contactService = {
  getContacts: async (signal?: AbortSignal, page = 1, limit = 20, search = "") => {
    try {
      const data = await contactRepository.fetchContacts(signal, page, limit, search);
      return data; // Return full pagination payload structure mapped natively
    } catch (error: any) {
      // Preserve AbortError identity so callers can filter it — never wrap it
      if (error?.name === 'AbortError') throw error;
      console.error('[ContactService] Error mapping UI structs:', error.message);
      throw new Error('Failed to resolve Contact models from the upstream server.');
    }
  }
};
