import mongoose, { Schema } from 'mongoose';
import type { BloodType, GeoPoint } from '../types.js';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  email?: string;
  bloodType: BloodType;
  location?: GeoPoint;
  lastDonationDate: Date | null;
  points: number;
  optOut: boolean;
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

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String },
    bloodType: { type: String, required: true, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    location: { type: geoPointSchema },
    lastDonationDate: { type: Date, default: null },
    points: { type: Number, default: 0 },
    optOut: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ location: '2dsphere' });

export const User = mongoose.model<IUser>('User', userSchema);
