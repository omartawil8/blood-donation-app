import type { Server as SocketServerType } from 'socket.io';
import { BloodRequest } from '../models/BloodRequest.js';
import { Hospital } from '../models/Hospital.js';
import { User } from '../models/User.js';
import { getCompatibleDonorTypes } from '../utils/bloodCompatibility.js';
import { canDonate } from '../utils/cooldown.js';
import { config } from '../config.js';

export async function notifyMatchingDonors(
  io: SocketServerType | null,
  requestId: string,
  hospitalId: string,
  bloodTypeNeeded: string
): Promise<void> {
  if (!io) return;

  const hospital = await Hospital.findById(hospitalId).select('location').lean();
  if (!hospital?.location?.coordinates?.length) return;

  const [lng, lat] = hospital.location.coordinates;
  const maxDistanceMeters = config.defaultRadiusKm * 1000;
  const compatibleTypes = getCompatibleDonorTypes(bloodTypeNeeded as import('../types.js').BloodType);

  const donorsNear = await User.find({
    optOut: false,
    bloodType: { $in: compatibleTypes },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: maxDistanceMeters,
      },
    },
  })
    .select('_id')
    .lean();

  const eligible: string[] = [];
  for (const d of donorsNear) {
    const user = await User.findById(d._id).select('lastDonationDate').lean();
    if (user && canDonate(user.lastDonationDate ?? null)) {
      eligible.push(String(d._id));
    }
  }

  const request = await BloodRequest.findById(requestId)
    .populate('hospitalId', 'name address')
    .lean();
  if (!request) return;

  for (const userId of eligible) {
    io.to(`user:${userId}`).emit('urgent_request', {
      requestId,
      bloodTypeNeeded,
      hospital: request.hospitalId,
      message: "Urgent blood needed nearby. You're a match.",
    });
  }
}
