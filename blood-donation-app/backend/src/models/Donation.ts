import mongoose, { Schema } from 'mongoose';
import type { DonationStatus } from '../types.js';

export interface IDonation {
  _id: mongoose.Types.ObjectId;
  requestId: mongoose.Types.ObjectId;
  donorId: mongoose.Types.ObjectId;
  status: DonationStatus;
  pledgedAt: Date;
  donatedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const donationSchema = new Schema<IDonation>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'BloodRequest', required: true },
    donorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pledged', 'on_the_way', 'donated', 'cancelled'],
      default: 'pledged',
    },
    pledgedAt: { type: Date, default: Date.now },
    donatedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

donationSchema.index({ requestId: 1, donorId: 1 }, { unique: true });
donationSchema.index({ donorId: 1, donatedAt: -1 });

export const Donation = mongoose.model<IDonation>('Donation', donationSchema);
