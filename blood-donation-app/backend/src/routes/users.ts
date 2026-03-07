import { Router } from 'express';
import type { PipelineStage } from 'mongoose';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Donation } from '../models/Donation.js';
import { BLOOD_TYPES, type BloodType } from '../types.js';
import { getDaysUntilCanDonate } from '../utils/cooldown.js';

const router = Router();

const createUserSchema = z.object({
  username: z.string().min(1).max(100),
  email: z.string().email().optional(),
  bloodType: z.enum(BLOOD_TYPES as unknown as [string, ...string[]]),
  location: z
    .object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]),
    })
    .optional(),
});

const updateBloodTypeSchema = z.object({
  bloodType: z.enum(BLOOD_TYPES as unknown as [string, ...string[]]),
});

const updateLocationSchema = z.object({
  location: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
});

// In a real app you'd use auth; for now we use ?userId= for demo
router.post('/', async (req, res) => {
  try {
    const body = createUserSchema.parse(req.body);
    const user = await User.create(body);
    res.status(201).json(user);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ errors: e.errors });
    if ((e as { code?: number })?.code === 11000)
      return res.status(409).json({ error: 'Username already taken' });
    throw e;
  }
});

router.get('/me', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const daysUntilCanDonate = getDaysUntilCanDonate(user.lastDonationDate);
  res.json({
    ...user.toObject(),
    daysUntilCanDonate: daysUntilCanDonate ?? null,
  });
});

router.patch('/me/blood-type', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const body = updateBloodTypeSchema.parse(req.body);
  const user = await User.findByIdAndUpdate(
    userId,
    { bloodType: body.bloodType as BloodType },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.patch('/me/location', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const body = updateLocationSchema.parse(req.body);
  const user = await User.findByIdAndUpdate(userId, body, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.patch('/me/opt-out', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const user = await User.findByIdAndUpdate(
    userId,
    { optOut: true },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.patch('/me/opt-in', async (req, res) => {
  const userId = req.query.userId as string | undefined;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const user = await User.findByIdAndUpdate(
    userId,
    { optOut: false },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.get('/stats', async (_req, res) => {
  const activeDonors = await User.countDocuments({ optOut: false });
  res.json({ activeDonors });
});

router.get('/leaderboard', async (req, res) => {
  const period = (req.query.period as string) || 'all'; // 'year' | 'all'
  const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 100);

  const startDate = period === 'year' ? new Date(new Date().getFullYear(), 0, 1) : null;

  const pipeline: PipelineStage[] = [
    { $match: { status: 'donated' } },
    ...(startDate ? [{ $match: { donatedAt: { $gte: startDate } } }] : []),
    { $group: { _id: '$donorId', donations: { $sum: 1 }, lastDonation: { $max: '$donatedAt' } } },
    { $sort: { donations: -1, lastDonation: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        rank: { $literal: 0 },
        donorId: '$_id',
        username: '$user.username',
        donations: 1,
        points: '$user.points',
      },
    },
  ];

  const results = await Donation.aggregate(pipeline);
  const withRank = results.map((r, i) => ({ ...r, rank: i + 1 }));

  res.json({ leaderboard: withRank, period });
});

export default router;
