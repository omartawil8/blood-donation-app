/**
 * Standalone demo server: no MongoDB required. In-memory store + seed data.
 * Run: npm run dev:demo (from repo root) or npm run dev:demo:backend (from backend).
 */
import express from 'express';
import cors from 'cors';
import { config } from './config.js';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
const COMPAT: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'], 'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'], 'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], 'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'], 'O-': ['O-'],
};

let id = 1;
function nextId() { return String(id++); }

type User = {
  _id: string; username: string; bloodType: string; location?: { type: 'Point'; coordinates: [number, number] };
  lastDonationDate: Date | null; points: number; optOut: boolean; createdAt: Date; updatedAt: Date;
};
type Hospital = { _id: string; name: string; address: string; location: { type: 'Point'; coordinates: [number, number] }; createdAt: Date; updatedAt: Date };
type BloodRequest = {
  _id: string; patientName: string; patientAge?: number; hospitalId: string; bloodTypeNeeded: string; unitsNeeded?: number; notes?: string;
  status: string; requestedByUserId: string; createdAt: Date; updatedAt: Date;
};
type Donation = { _id: string; requestId: string; donorId: string; status: string; pledgedAt: Date; donatedAt?: Date; createdAt: Date; updatedAt: Date };

const users: User[] = [];
const hospitals: Hospital[] = [];
const bloodRequests: BloodRequest[] = [];
const donations: Donation[] = [];

function getDaysUntilCanDonate(last: Date | null): number | null {
  if (!last) return null;
  const elapsed = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
  const remaining = config.donationCooldownDays - elapsed;
  return remaining <= 0 ? 0 : remaining;
}
function canDonate(last: Date | null): boolean {
  const d = getDaysUntilCanDonate(last);
  return d === null || d === 0;
}
function compatibleTypes(need: string): string[] {
  return COMPAT[need] ?? [];
}

// Seed data
function seed() {
  if (hospitals.length > 0) return;
  const now = new Date();
  [
    { name: 'American University of Beirut Medical Center', address: 'Riad El Solh, Beirut, Lebanon', coordinates: [35.4878, 33.9008] as [number, number] },
    { name: 'Rafik Hariri University Hospital', address: 'Bir Hassan, Beirut, Lebanon', coordinates: [35.4889, 33.8674] as [number, number] },
    { name: 'Hotel-Dieu de France Hospital', address: 'Alfred Naccache Blvd, Achrafieh, Beirut, Lebanon', coordinates: [35.5108, 33.8952] as [number, number] },
    { name: 'Saint George Hospital', address: 'Museum Square, Achrafieh, Beirut, Lebanon', coordinates: [35.5149, 33.8889] as [number, number] },
    { name: 'Clemenceau Medical Center', address: 'Clemenceau Street, Beirut, Lebanon', coordinates: [35.4876, 33.8932] as [number, number] },
    { name: 'Middle East Institute of Health', address: 'Bsalim, Mount Lebanon, Lebanon', coordinates: [35.5662, 33.9012] as [number, number] },
    { name: 'Lebanese American University Medical Center', address: 'Rizk Hospital, Achrafieh, Beirut, Lebanon', coordinates: [35.5134, 33.8901] as [number, number] },
    { name: 'Hammoud Hospital University Medical Center', address: 'Saida, South Lebanon', coordinates: [35.3717, 33.5571] as [number, number] },
    { name: 'Nini Hospital', address: 'Tripoli, North Lebanon', coordinates: [35.6499, 34.4367] as [number, number] },
    { name: 'Balamand University Hospital', address: 'Koura, North Lebanon', coordinates: [35.6731, 34.3789] as [number, number] },
  ].forEach(({ name, address, coordinates }) => {
    hospitals.push({
      _id: nextId(), name, address,
      location: { type: 'Point', coordinates },
      createdAt: now, updatedAt: now,
    });
  });
  const u1: User = {
    _id: nextId(), username: 'Demo Donor', bloodType: 'O-',
    lastDonationDate: null, points: 0, optOut: false, createdAt: now, updatedAt: now,
  };
  users.push(u1);
  const u2: User = {
    _id: nextId(), username: 'Nour K.', bloodType: 'A+',
    lastDonationDate: null, points: 0, optOut: false, createdAt: now, updatedAt: now,
  };
  users.push(u2);
  const u3: User = {
    _id: nextId(), username: 'Samir H.', bloodType: 'O+',
    lastDonationDate: null, points: 0, optOut: false, createdAt: now, updatedAt: now,
  };
  users.push(u3);

  const requestsSeed: Array<{
    patientName: string; patientAge: number; hospitalIdx: number; bloodTypeNeeded: string;
    notes: string; userId: string; minsAgo: number;
  }> = [
    {
      patientName: 'Nour K.', patientAge: 34, hospitalIdx: 0, bloodTypeNeeded: 'B-',
      notes: 'Urgent request for surgery scheduled tomorrow morning. Patient has a rare B- type — please come as soon as possible. Contact the hospital reception on arrival and ask for the blood bank unit.',
      userId: u2._id, minsAgo: 24,
    },
    {
      patientName: 'Samir H.', patientAge: 52, hospitalIdx: 1, bloodTypeNeeded: 'O+',
      notes: 'Patient is recovering from a road accident and requires O+ blood urgently. Please bring a valid ID and inform the nurse at the entrance you are here to donate.',
      userId: u3._id, minsAgo: 60,
    },
    {
      patientName: 'Lara N.', patientAge: 28, hospitalIdx: 2, bloodTypeNeeded: 'AB+',
      notes: 'Patient undergoing chemotherapy and in critical need of AB+ blood. Any compatible donor is welcome. Please call ahead to confirm your visit with the oncology ward.',
      userId: u2._id, minsAgo: 30,
    },
    {
      patientName: 'Walid F.', patientAge: 61, hospitalIdx: 3, bloodTypeNeeded: 'A+',
      notes: 'Post-operative patient in need of A+ blood following cardiac surgery. Please contact the blood bank on the 3rd floor upon arrival.',
      userId: u3._id, minsAgo: 90,
    },
    {
      patientName: 'Rana S.', patientAge: 19, hospitalIdx: 4, bloodTypeNeeded: 'O-',
      notes: 'Emergency case — O- universal donor blood needed immediately. Patient is in the ICU. Ask for the on-call coordinator at the main entrance.',
      userId: u2._id, minsAgo: 15,
    },
    {
      patientName: 'Charbel A.', patientAge: 45, hospitalIdx: 5, bloodTypeNeeded: 'B+',
      notes: 'Patient admitted with severe anaemia and urgently needs B+ donations. Visiting hours for donors are 8am–8pm daily.',
      userId: u3._id, minsAgo: 120,
    },
    {
      patientName: 'Maya K.', patientAge: 38, hospitalIdx: 6, bloodTypeNeeded: 'A-',
      notes: 'Planned transfusion needed for dialysis patient with A- blood type. Please call the hospital\'s blood bank unit in advance to schedule your donation.',
      userId: u2._id, minsAgo: 200,
    },
  ];

  for (const r of requestsSeed) {
    bloodRequests.push({
      _id: nextId(),
      patientName: r.patientName,
      patientAge: r.patientAge,
      hospitalId: hospitals[r.hospitalIdx]._id,
      bloodTypeNeeded: r.bloodTypeNeeded,
      notes: r.notes,
      status: 'pending',
      requestedByUserId: r.userId,
      createdAt: new Date(Date.now() - r.minsAgo * 60 * 1000),
      updatedAt: now,
    });
  }

  // Seed leaderboard users with donations so Top Donors is populated
  const leaderboardSeed: Array<{ name: string; bloodType: string; donations: number }> = [
    { name: 'Karim M.',   bloodType: 'O+', donations: 12 },
    { name: 'Nadia K.',   bloodType: 'A+', donations: 11 },
    { name: 'Ziad R.',    bloodType: 'B+', donations: 9  },
    { name: 'Lara N.',    bloodType: 'O-', donations: 9  },
    { name: 'Tarek B.',   bloodType: 'A-', donations: 7  },
    { name: 'Maya F.',    bloodType: 'AB+', donations: 6 },
    { name: 'Jad S.',     bloodType: 'B-', donations: 5  },
    { name: 'Rima D.',    bloodType: 'O+', donations: 4  },
    { name: 'Elie M.',    bloodType: 'A+', donations: 3  },
  ];
  for (const entry of leaderboardSeed) {
    const u: User = {
      _id: nextId(), username: entry.name, bloodType: entry.bloodType as typeof BLOOD_TYPES[number],
      lastDonationDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), points: entry.donations * 100,
      optOut: false, createdAt: now, updatedAt: now,
    };
    users.push(u);
    for (let i = 0; i < entry.donations; i++) {
      const donatedAt = new Date(now.getFullYear(), 0, 10 + i);
      donations.push({
        _id: nextId(), requestId: bloodRequests[0]._id, donorId: u._id,
        status: 'donated', pledgedAt: donatedAt, donatedAt, createdAt: donatedAt, updatedAt: donatedAt,
      });
    }
  }
}

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/reset', (_req, res) => {
  users.length = 0;
  hospitals.length = 0;
  bloodRequests.length = 0;
  donations.length = 0;
  id = 1;
  seed();
  res.json({ ok: true });
});

// Users
app.post('/api/users', (req, res) => {
  seed();
  const { username, bloodType, email, location } = req.body || {};
  if (!username || !bloodType) return res.status(400).json({ error: 'username and bloodType required' });
  if (users.some(u => u.username === username)) return res.status(409).json({ error: 'Username already taken' });
  if (!BLOOD_TYPES.includes(bloodType)) return res.status(400).json({ error: 'Invalid blood type' });
  const now = new Date();
  const user: User = {
    _id: nextId(), username, bloodType, location,
    lastDonationDate: null, points: 0, optOut: false, createdAt: now, updatedAt: now,
  };
  users.push(user);
  res.status(201).json({ _id: user._id, username: user.username, bloodType: user.bloodType, points: user.points });
});

app.get('/api/users/me', (req, res) => {
  seed();
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const user = users.find(u => u._id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const daysUntilCanDonate = getDaysUntilCanDonate(user.lastDonationDate);
  res.json({ ...user, daysUntilCanDonate: daysUntilCanDonate ?? null });
});

app.patch('/api/users/me/username', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const user = users.find(u => u._id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { username } = req.body || {};
  if (!username || typeof username !== 'string' || !username.trim()) return res.status(400).json({ error: 'Username required' });
  const trimmed = username.trim();
  if (users.some(u => u._id !== userId && u.username === trimmed)) return res.status(409).json({ error: 'Username already taken' });
  user.username = trimmed;
  user.updatedAt = new Date();
  res.json({ username: user.username });
});

app.patch('/api/users/me/blood-type', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const user = users.find(u => u._id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { bloodType } = req.body || {};
  if (!bloodType || !BLOOD_TYPES.includes(bloodType)) return res.status(400).json({ error: 'Invalid blood type' });
  user.bloodType = bloodType;
  user.updatedAt = new Date();
  res.json(user);
});

app.patch('/api/users/me/location', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const user = users.find(u => u._id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { location } = req.body || {};
  if (location?.type === 'Point' && Array.isArray(location?.coordinates)) {
    user.location = location;
    user.updatedAt = new Date();
  }
  res.json(user);
});

app.patch('/api/users/me/opt-out', (req, res) => {
  const userId = req.query.userId as string;
  const user = users.find(u => u._id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.optOut = true;
  res.json(user);
});

app.patch('/api/users/me/opt-in', (req, res) => {
  const userId = req.query.userId as string;
  const user = users.find(u => u._id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.optOut = false;
  res.json(user);
});

app.get('/api/users/stats', (_req, res) => {
  seed();
  const BASE_DONORS = 4829;
  const activeDonors = BASE_DONORS + users.filter(u => !u.optOut && canDonate(u.lastDonationDate)).length;
  res.json({ activeDonors });
});

app.get('/api/users/leaderboard', (req, res) => {
  seed();
  const period = (req.query.period as string) || 'all';
  const startDate = period === 'year' ? new Date(new Date().getFullYear(), 0, 1) : null;
  const donated = donations.filter(d => d.status === 'donated');
  const byDonor = new Map<string, { count: number; lastDonation: Date }>();
  for (const d of donated) {
    const at = d.donatedAt!;
    if (startDate && at < startDate) continue;
    const cur = byDonor.get(d.donorId);
    if (!cur || at > cur.lastDonation) {
      byDonor.set(d.donorId, { count: (cur?.count ?? 0) + 1, lastDonation: at });
    } else {
      cur.count += 1;
    }
  }
  const sorted = [...byDonor.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].lastDonation.getTime() - a[1].lastDonation.getTime())
    .slice(0, 50)
    .map(([donorId, { count }], i) => {
      const u = users.find(x => x._id === donorId);
      return { rank: i + 1, donorId, username: u?.username ?? 'Unknown', donations: count, points: u?.points ?? 0 };
    });
  res.json({ leaderboard: sorted, period });
});

// Hospitals
app.get('/api/hospitals', (req, res) => {
  seed();
  const q = ((req.query.q as string) || '').trim().toLowerCase();
  let list = hospitals;
  if (q) {
    list = hospitals.filter(h => h.name.toLowerCase().includes(q) || h.address.toLowerCase().includes(q));
  }
  res.json({ hospitals: list.slice(0, 100) });
});

app.get('/api/hospitals/:id', (req, res) => {
  seed();
  const h = hospitals.find(x => x._id === req.params.id);
  if (!h) return res.status(404).json({ error: 'Hospital not found' });
  res.json(h);
});

// Requests
app.post('/api/requests', (req, res) => {
  seed();
  const userId = req.query.userId as string;
  const body = req.body || {};
  const { patientName, patientAge, hospitalId, bloodTypeNeeded, unitsNeeded, notes } = body;
  if (!hospitalId || !bloodTypeNeeded) return res.status(400).json({ error: 'Missing fields' });
  const requestedBy = userId || users[0]?._id;
  if (bloodRequests.some(r => r.requestedByUserId === requestedBy && r.status === 'pending')) {
    return res.status(400).json({ errors: ['User already has pending request'] });
  }
  const now = new Date();
  const reqEnt: BloodRequest = {
    _id: nextId(), patientName: patientName?.trim() || 'Anonymous', patientAge: patientAge ? Number(patientAge) : undefined,
    hospitalId, bloodTypeNeeded, unitsNeeded, notes,
    status: 'pending', requestedByUserId: requestedBy, createdAt: now, updatedAt: now,
  };
  bloodRequests.push(reqEnt);
  const hospital = hospitals.find(h => h._id === hospitalId);
  res.status(201).json({
    ...reqEnt,
    hospitalId: hospital ? { name: hospital.name, address: hospital.address, location: hospital.location } : { name: '', address: '' },
  });
});

app.get('/api/requests/active', (req, res) => {
  seed();
  const lng = parseFloat(String(req.query.lng));
  const lat = parseFloat(String(req.query.lat));
  const sort = (req.query.sort as string) || 'distance';
  if (Number.isNaN(lng) || Number.isNaN(lat)) return res.status(400).json({ error: 'lng and lat required' });
  const pending = bloodRequests.filter(r => r.status === 'pending');
  const withDistance = pending.map(r => {
    const h = hospitals.find(x => x._id === r.hospitalId);
    const dist = h?.location?.coordinates
      ? Math.round((Math.random() * 15 + 0.5) * 10) / 10
      : null;
    return {
      ...r,
      hospitalId: h ? { name: h.name, address: h.address } : { name: '', address: '' },
      distanceKm: dist,
    };
  });
  if (sort === 'bloodType') withDistance.sort((a, b) => a.bloodTypeNeeded.localeCompare(b.bloodTypeNeeded));
  else if (sort === 'distance') withDistance.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
  res.json({ requests: withDistance });
});

app.get('/api/requests/my-past', (req, res) => {
  seed();
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const list = bloodRequests
    .filter(r => r.requestedByUserId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(r => {
      const h = hospitals.find(x => x._id === r.hospitalId);
      const activeDonation = r.status === 'pending'
        ? donations
            .filter(d => d.requestId === r._id && (d.status === 'pledged' || d.status === 'on_the_way'))
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
        : null;
      return {
        _id: r._id,
        patientName: r.patientName ?? 'Anonymous',
        bloodTypeNeeded: r.bloodTypeNeeded,
        hospitalName: h?.name ?? '',
        status: r.status,
        createdAt: r.createdAt,
        activeDonationStatus: activeDonation?.status ?? null,
      };
    });
  res.json({ requests: list });
});

app.get('/api/requests/:id', (req, res) => {
  seed();
  const r = bloodRequests.find(x => x._id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Request not found' });
  const h = hospitals.find(x => x._id === r.hospitalId);
  const activeDonation = r.status === 'pending'
    ? donations
        .filter(d => d.requestId === r._id && (d.status === 'pledged' || d.status === 'on_the_way'))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    : null;
  const lng = req.query.lng != null ? parseFloat(String(req.query.lng)) : NaN;
  const lat = req.query.lat != null ? parseFloat(String(req.query.lat)) : NaN;
  let distanceKm: number | undefined;
  if (!Number.isNaN(lng) && !Number.isNaN(lat)) distanceKm = Math.round((Math.random() * 10 + 0.5) * 10) / 10;
  res.json({
    ...r,
    hospitalId: h ? { name: h.name, address: h.address } : { name: '', address: '' },
    distanceKm,
    activeDonationStatus: activeDonation?.status ?? null,
  });
});

// Donations
app.post('/api/donations/pledge', (req, res) => {
  seed();
  const userId = req.query.userId as string;
  const requestId = req.body?.requestId;
  if (!userId || !requestId) return res.status(400).json({ error: 'userId and requestId required' });
  const user = users.find(u => u._id === userId);
  const br = bloodRequests.find(r => r._id === requestId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!br || br.status !== 'pending') return res.status(404).json({ error: 'Request not found or not pending' });
  const compatible = (COMPAT[br.bloodTypeNeeded] || []).includes(user.bloodType);
  if (!compatible) return res.status(400).json({ error: 'Your blood type is not compatible' });
  if (!canDonate(user.lastDonationDate)) return res.status(400).json({ error: 'Cooldown period' });
  let don = donations.find(d => d.requestId === requestId && d.donorId === userId);
  if (don) return res.status(200).json(don);
  const now = new Date();
  don = { _id: nextId(), requestId, donorId: userId, status: 'pledged', pledgedAt: now, createdAt: now, updatedAt: now };
  donations.push(don);
  res.status(201).json(don);
});

app.patch('/api/donations/:id/status', (req, res) => {
  const userId = req.query.userId as string;
  const status = req.body?.status;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const don = donations.find(d => d._id === req.params.id && d.donorId === userId);
  if (!don) return res.status(404).json({ error: 'Donation not found' });
  if (status === 'donated') {
    don.status = 'donated';
    don.donatedAt = new Date();
    const user = users.find(u => u._id === userId);
    if (user) {
      user.points += config.pointsPerDonation;
      user.lastDonationDate = don.donatedAt;
    }
    const br = bloodRequests.find(r => r._id === don.requestId);
    if (br) br.status = 'fulfilled';
    const u = users.find(x => x._id === userId);
    return res.json({ donation: don, pointsEarned: config.pointsPerDonation, totalPoints: u?.points ?? 0 });
  }
  if (status === 'cancelled') {
    don.status = 'cancelled';
    return res.json(don);
  }
  don.status = status;
  don.updatedAt = new Date();
  res.json(don);
});

app.post('/api/donations/:id/confirm', (req, res) => {
  const userId = req.query.userId as string;
  const don = donations.find(d => d._id === req.params.id && d.donorId === userId);
  if (!don) return res.status(404).json({ error: 'Donation not found' });
  if (don.status !== 'donated') {
    don.status = 'donated';
    don.donatedAt = new Date();
    const user = users.find(u => u._id === userId);
    if (user) {
      user.points += config.pointsPerDonation;
      user.lastDonationDate = don.donatedAt;
    }
    const br = bloodRequests.find(r => r._id === don.requestId);
    if (br) br.status = 'fulfilled';
  }
  const u = users.find(x => x._id === userId);
  res.json({ pointsEarned: config.pointsPerDonation, totalPoints: u?.points ?? 0 });
});

app.get('/api/donations/by-request/:requestId', (req, res) => {
  const userId = req.query.userId as string;
  const don = donations.find(d => d.requestId === req.params.requestId && d.donorId === userId);
  res.json(don ?? null);
});

app.get('/api/donations/my-active', (req, res) => {
  seed();
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const active = donations
    .filter(d => d.donorId === userId && d.status !== 'cancelled' && d.status !== 'donated')
    .map(d => {
      const req2 = bloodRequests.find(r => r._id === d.requestId);
      const h = req2 ? hospitals.find(h => h._id === req2.hospitalId) : null;
      return {
        _id: d._id,
        status: d.status,
        requestId: d.requestId,
        patientName: req2?.patientName ?? 'Unknown',
        bloodTypeNeeded: req2?.bloodTypeNeeded ?? '',
        hospitalName: h?.name ?? '',
        pledgedAt: d.pledgedAt,
      };
    });
  res.json({ donations: active });
});

app.get('/api/donations/my-past', (req, res) => {
  seed();
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const past = donations
    .filter(d => d.donorId === userId && d.status === 'donated')
    .sort((a, b) => new Date(b.donatedAt!).getTime() - new Date(a.donatedAt!).getTime())
    .map(d => {
      const req2 = bloodRequests.find(r => r._id === d.requestId);
      const h = req2 ? hospitals.find(h => h._id === req2.hospitalId) : null;
      return {
        _id: d._id,
        requestId: d.requestId,
        patientName: req2?.patientName ?? 'Unknown',
        bloodTypeNeeded: req2?.bloodTypeNeeded ?? '',
        hospitalName: h?.name ?? '',
        donatedAt: d.donatedAt,
      };
    });
  res.json({ donations: past });
});

seed();
const port = config.port;
app.listen(port, () => {
  console.log(`Demo server (no DB) at http://localhost:${port}`);
});
