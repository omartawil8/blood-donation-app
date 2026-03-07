import { Router } from 'express';
import { z } from 'zod';
import { BloodRequest } from '../models/BloodRequest.js';
import { Hospital } from '../models/Hospital.js';
import { User } from '../models/User.js';
import { BLOOD_TYPES } from '../types.js';
import { getCompatibleDonorTypes } from '../utils/bloodCompatibility.js';
import { config } from '../config.js';
import { notifyMatchingDonors } from '../services/notifyDonors.js';

const router = Router();

const createRequestSchema = z.object({
  patientUsername: z.string().optional(),
  patientName: z.string().min(1),
  hospitalId: z.string().min(1),
  bloodTypeNeeded: z.enum(BLOOD_TYPES as unknown as [string, ...string[]]),
  unitsNeeded: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
  requiredBy: z.string().datetime().optional(),
});

// Create blood request (one pending per user)
router.post('/', async (req, res) => {
  try {
    const body = createRequestSchema.parse(req.body);
    const requestedByUserId = body.patientUsername
      ? (await User.findOne({ username: body.patientUsername }))?._id
      : (req.query.userId as string);
    if (!requestedByUserId) return res.status(400).json({ error: 'User not found or userId required' });

    const existing = await BloodRequest.findOne({
      requestedByUserId,
      status: 'pending',
    });
    if (existing)
      return res.status(400).json({ errors: ['User already has pending request'] });

    const request = await BloodRequest.create({
      ...body,
      requiredBy: body.requiredBy ? new Date(body.requiredBy) : undefined,
      requestedByUserId,
    });
    const populated = await BloodRequest.findById(request._id)
      .populate('hospitalId', 'name address location')
      .lean();
    const io = req.app.get('io') as import('socket.io').Server | undefined;
    notifyMatchingDonors(io ?? null, String(request._id), body.hospitalId, body.bloodTypeNeeded).catch(() => {});
    res.status(201).json(populated);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ errors: e.errors });
    throw e;
  }
});

// Active requests near a point (for donor dashboard). Sort by blood type or distance.
router.get('/active', async (req, res) => {
  const lng = parseFloat(String(req.query.lng));
  const lat = parseFloat(String(req.query.lat));
  const radiusKm = parseFloat(String(req.query.radiusKm ?? config.defaultRadiusKm)) || config.defaultRadiusKm;
  const bloodType = req.query.bloodType as string | undefined; // filter by compatibility
  const sort = (req.query.sort as string) || 'distance'; // distance | bloodType

  if (Number.isNaN(lng) || Number.isNaN(lat)) {
    return res.status(400).json({ error: 'lng and lat required' });
  }

  const maxDistanceMeters = radiusKm * 1000;
  const hospitalsNear = await Hospital.find({
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
    .select('_id name address location')
    .lean();

  const hospitalIds = hospitalsNear.map((h) => h._id);
  const match: Record<string, unknown> = {
    status: 'pending',
    hospitalId: { $in: hospitalIds },
  };
  if (bloodType) {
    const compatible = getCompatibleDonorTypes(bloodType as import('../types.js').BloodType);
    match.bloodTypeNeeded = { $in: compatible };
  }

  let requests = await BloodRequest.find(match)
    .populate('hospitalId', 'name address location')
    .sort({ createdAt: -1 })
    .lean();

  // Attach distance from (lng, lat) using hospital location
  const toRad = (x: number) => (x * Math.PI) / 180;
  const haversineKm = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const hospitalMap = new Map(hospitalsNear.map((h) => [h._id.toString(), h]));
  const withDistance = requests.map((r) => {
    const hospital = hospitalMap.get((r.hospitalId as { _id: unknown })._id?.toString?.() ?? '');
    const loc = hospital?.location as { coordinates: [number, number] } | undefined;
    const distanceKm =
      loc?.coordinates?.length === 2
        ? haversineKm(lat, lng, loc.coordinates[1], loc.coordinates[0])
        : null;
    return { ...r, distanceKm };
  });

  if (sort === 'distance') {
    withDistance.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  } else if (sort === 'bloodType') {
    withDistance.sort((a, b) =>
      String(a.bloodTypeNeeded).localeCompare(String(b.bloodTypeNeeded))
    );
  }

  res.json({ requests: withDistance });
});

router.get('/:id', async (req, res) => {
  const request = await BloodRequest.findById(req.params.id)
    .populate('hospitalId', 'name address location')
    .lean();
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const hospital = request.hospitalId as { location?: { coordinates: [number, number] } };
  const lng = req.query.lng != null ? parseFloat(String(req.query.lng)) : null;
  const lat = req.query.lat != null ? parseFloat(String(req.query.lat)) : null;
  let distanceKm: number | null = null;
  if (
    hospital?.location?.coordinates?.length === 2 &&
    typeof lng === 'number' &&
    !Number.isNaN(lng) &&
    typeof lat === 'number' &&
    !Number.isNaN(lat)
  ) {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371;
    const [hlng, hlat] = hospital.location.coordinates;
    const dLat = toRad(hlat - lat);
    const dLon = toRad(hlng - lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(hlat)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distanceKm = R * c;
  }

  res.json({ ...request, distanceKm });
});

export default router;
