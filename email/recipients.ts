import { adminEmails } from '../lib/admins';

/**
 * Who receives internal mail.
 *
 * Previously the admin list was hardcoded inside the order email function, so
 * adding a colleague meant editing code and redeploying, and the list silently
 * disagreed with lib/admins.ts (which drives who can log in). One source now.
 */
export function adminRecipients(): string[] {
  return adminEmails.map(email => email.trim().toLowerCase()).filter(Boolean);
}
