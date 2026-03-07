import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/blood-donation',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  donationCooldownDays: parseInt(process.env.DONATION_COOLDOWN_DAYS ?? '60', 10),
  pointsPerDonation: parseInt(process.env.POINTS_PER_DONATION ?? '1000', 10),
  defaultRadiusKm: parseInt(process.env.DEFAULT_RADIUS_KM ?? '50', 10),
} as const;
