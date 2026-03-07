import { Router } from 'express';
import { Hospital } from '../models/Hospital.js';

const router = Router();

router.get('/', async (req, res) => {
  const q = (req.query.q as string) || '';
  const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
  let query: Record<string, unknown> = {};
  if (q.trim()) {
    const search = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ],
    };
  }
  const hospitals = await Hospital.find(query).limit(limit).lean();
  res.json({ hospitals });
});

router.get('/:id', async (req, res) => {
  const hospital = await Hospital.findById(req.params.id).lean();
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
  res.json(hospital);
});

export default router;
