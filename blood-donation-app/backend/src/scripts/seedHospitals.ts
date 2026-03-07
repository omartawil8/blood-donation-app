/**
 * Seed a few sample hospitals with GeoJSON points. Run: npx tsx src/scripts/seedHospitals.ts
 * Coordinates are [longitude, latitude].
 */
import mongoose from 'mongoose';
import { Hospital } from '../models/Hospital.js';
import { config } from '../config.js';

const samples = [
  { name: 'City General Hospital', address: 'Downtown Beirut', coordinates: [35.5018, 33.8938] as [number, number] },
  { name: 'Saint George Hospital', address: '2218 Baker Street, London NW1 6XE United Kingdom', coordinates: [-0.1575, 51.5204] as [number, number] },
  { name: 'Worthing General Hospital', address: 'Marine Parade, Worthing', coordinates: [-0.3752, 50.8105] as [number, number] },
  { name: 'St George Hospital', address: 'Sydney, NSW', coordinates: [151.1722, -33.8234] as [number, number] },
];

async function main() {
  await mongoose.connect(config.mongoUri);
  for (const s of samples) {
    await Hospital.findOneAndUpdate(
      { name: s.name },
      {
        name: s.name,
        address: s.address,
        location: { type: 'Point' as const, coordinates: s.coordinates },
      },
      { upsert: true }
    );
  }
  console.log('Seeded', samples.length, 'hospitals');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
