import { config } from '../config.js';

export function getDaysUntilCanDonate(lastDonationDate: Date | null): number | null {
  if (!lastDonationDate) return null;
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - lastDonationDate.getTime()) / (1000 * 60 * 60 * 24));
  const remaining = config.donationCooldownDays - elapsed;
  return remaining <= 0 ? 0 : remaining;
}

export function canDonate(lastDonationDate: Date | null): boolean {
  const days = getDaysUntilCanDonate(lastDonationDate);
  return days === null || days === 0;
}
