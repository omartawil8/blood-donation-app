import mongoose, { Schema } from 'mongoose';
import type { BloodType, RequestStatus } from '../types.js';

export interface IBloodRequest {
  _id: mongoose.Types.ObjectId;
  patientUsername?: string;
  patientName: string;
  hospitalId: mongoose.Types.ObjectId;
  bloodTypeNeeded: BloodType;
  unitsNeeded?: number;
  notes?: string;
  status: RequestStatus;
  requestedByUserId: mongoose.Types.ObjectId;
  requiredBy?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bloodRequestSchema = new Schema<IBloodRequest>(
  {
    patientUsername: { type: String },
    patientName: { type: String, required: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true },
    bloodTypeNeeded: { type: String, required: true, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    unitsNeeded: { type: Number },
    notes: { type: String },
    status: { type: String, enum: ['pending', 'fulfilled', 'cancelled'], default: 'pending' },
    requestedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requiredBy: { type: Date },
  },
  { timestamps: true }
);

export const BloodRequest = mongoose.model<IBloodRequest>('BloodRequest', bloodRequestSchema);
