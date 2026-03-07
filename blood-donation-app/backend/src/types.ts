export const BLOOD_TYPES = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export type GeoPoint = {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
};

export type RequestStatus = 'pending' | 'fulfilled' | 'cancelled';
export type DonationStatus = 'pledged' | 'on_the_way' | 'donated' | 'cancelled';
