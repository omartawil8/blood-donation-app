import { Router } from 'express';
import { z } from 'zod';
import { Donation } from '../models/Donation.js';
import { BloodRequest } from '../models/BloodRequest.js';
import { User } from '../models/User.js';
import { config } from '../config.js';
import { isCompatible } from '../utils/bloodCompatibility.js';
import { canDonate } from '../utils/cooldown.js';

const router = Router();

const statusSchema = z.enum(['pledged', 'on_the_way', 'donated', 'cancelled']);

// Pledge: "I can donate"
router.post('/pledge', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  const requestId = req.body.requestId as string | undefined;
  if (!userId || !requestId) {
    return res.status(400).json({ error: 'userId and requestId required' });
  }

  const [user, bloodRequest] = await Promise.all([
    User.findById(userId),
    BloodRequest.findById(requestId).populate('hospitalId'),
  ]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!bloodRequest) return res.status(404).json({ error: 'Request not found' });
  if (bloodRequest.status !== 'pending') {
    return res.status(400).json({ error: 'Request is no longer pending' });
  }
  if (!isCompatible(user.bloodType, bloodRequest.bloodTypeNeeded)) {
    return res.status(400).json({ error: 'Your blood type is not compatible' });
  }
  if (!canDonate(user.lastDonationDate)) {
    return res.status(400).json({
      error: 'You must wait before donating again (cooldown period)',
    });
  }

  const existing = await Donation.findOne({ requestId, donorId: userId });
  if (existing) return res.status(200).json(existing);

  const donation = await Donation.create({
    requestId,
    donorId: userId,
    status: 'pledged',
  });
  res.status(201).json(donation);
});

// Update status: on_the_way, donated, cancelled
router.patch('/:id/status', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const status = statusSchema.parse(req.body.status);

  const donation = await Donation.findOne({
    _id: req.params.id,
    donorId: userId,
  });
  if (!donation) return res.status(404).json({ error: 'Donation not found' });

  if (status === 'donated') {
    donation.status = 'donated';
    donation.donatedAt = new Date();
    await donation.save();

    await User.findByIdAndUpdate(userId, {
      $inc: { points: config.pointsPerDonation },
      lastDonationDate: donation.donatedAt,
    });
    const request = await BloodRequest.findByIdAndUpdate(donation.requestId, {
      status: 'fulfilled',
    });
    const user = await User.findById(userId).select('points').lean();
    return res.json({
      donation,
      pointsEarned: config.pointsPerDonation,
      totalPoints: user?.points ?? 0,
    });
  }

  if (status === 'cancelled') {
    donation.status = 'cancelled';
    donation.cancelledAt = new Date();
    await donation.save();
    return res.json(donation);
  }

  donation.status = status;
  await donation.save();
  res.json(donation);
});

// Confirm donation (idempotent with PATCH status donated)
router.post('/:id/confirm', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const donation = await Donation.findOne({
    _id: req.params.id,
    donorId: userId,
  });
  if (!donation) return res.status(404).json({ error: 'Donation not found' });

  if (donation.status === 'donated') {
    const user = await User.findById(userId).select('points').lean();
    return res.json({
      donation,
      pointsEarned: config.pointsPerDonation,
      totalPoints: user?.points ?? 0,
    });
  }

  donation.status = 'donated';
  donation.donatedAt = new Date();
  await donation.save();

  await User.findByIdAndUpdate(userId, {
    $inc: { points: config.pointsPerDonation },
    lastDonationDate: donation.donatedAt,
  });
  await BloodRequest.findByIdAndUpdate(donation.requestId, { status: 'fulfilled' });

  const user = await User.findById(userId).select('points').lean();
  res.json({
    donation,
    pointsEarned: config.pointsPerDonation,
    totalPoints: user?.points ?? 0,
  });
});

// My donations for a request
router.get('/by-request/:requestId', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const donation = await Donation.findOne({
    requestId: req.params.requestId,
    donorId: userId,
  }).lean();
  res.json(donation ?? null);
});

export default router;
