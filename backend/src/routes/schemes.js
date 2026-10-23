import express from 'express';
import { col } from '../db.js';
import { currentUser } from './auth.js';
import { profileFor, schemeForUser } from '../profile.js';

const router = express.Router();

// Labels and input types for every form field (name, dob, pan, ...).
router.get('/fields', async (_req, res) => {
  res.json(await col('field_defs').find({}, { projection: { _id: 0 } }).sort({ sort_order: 1 }).toArray());
});

// All active schemes, each marked eligible / not eligible for this user.
router.get('/', async (req, res) => {
  const profile = await profileFor(await currentUser(req));
  const schemes = await col('schemes').find({ is_active: { $ne: false } }).sort({ name: 1 }).toArray();
  res.json(schemes.map((s) => schemeForUser(s, profile)));
});

router.get('/:id', async (req, res) => {
  const scheme = await col('schemes').findOne({ id: req.params.id, is_active: { $ne: false } });
  if (!scheme) return res.status(404).json({ detail: 'Scheme not found' });
  const profile = await profileFor(await currentUser(req));
  res.json(schemeForUser(scheme, profile));
});

export default router;

