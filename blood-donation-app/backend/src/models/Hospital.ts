import mongoose, { Schema } from 'mongoose';
import type { GeoPoint } from '../types.js';

export interface IHospital {
  _id: mongoose.Types.ObjectId;
  name: string;
  address: string;
  location: GeoPoint;
  createdAt: Date;
  updatedAt: Date;
}

const geoPointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  { _id: false }
);

const hospitalSchema = new Schema<IHospital>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    location: { type: geoPointSchema, required: true },
  },
  { timestamps: true }
);

hospitalSchema.index({ location: '2dsphere' });
hospitalSchema.index({ name: 'text', address: 'text' });

export const Hospital = mongoose.model<IHospital>('Hospital', hospitalSchema);
