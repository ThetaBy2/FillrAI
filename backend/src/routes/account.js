import express from 'express';
import { col, clean } from '../db.js';
import { currentUser } from './auth.js';
import { profileFor, schemeForUser } from '../profile.js';

const router = express.Router();

// Save a field the user typed in (e.g. course name). It becomes part of their profile,
// so the next form that needs it is pre-filled too.
router.put('/checklist', async (req, res) => {
  const { field_key, value } = req.body || {};
  if (!field_key) return res.status(400).json({ detail: 'field_key is required' });
  await col('checklist_items').updateOne(
    { user_id: req.userId, field_key },
    { $set: { value, updated_at: new Date() } },
    { upsert: true },
  );
  res.json({ field_key, value });
});

router.get('/notifications', async (req, res) => {
  const list = await col('notifications').find({ user_id: req.userId }).sort({ created_at: -1 }).limit(50).toArray();
  res.json(list.map(clean));
});

router.post('/notifications/read-all', async (req, res) => {
  await col('notifications').updateMany({ user_id: req.userId }, { $set: { is_read: true } });
  res.json({ ok: true });
});

router.post('/notifications/:id/read', async (req, res) => {
  await col('notifications').updateOne({ id: Number(req.params.id), user_id: req.userId }, { $set: { is_read: true } });
  res.json({ ok: true });
});

router.get('/dashboard', async (req, res) => {
  const user = await currentUser(req);
  const profile = await profileFor(user);

  const docs = await col('documents').find({ user_id: user.id }).toArray();
  const schemes = (await col('schemes').find({ is_active: { $ne: false } }).toArray()).map((s) => schemeForUser(s, profile));
  const eligible = schemes.filter((s) => s.eligible);
  const apps = await col('applications').find({ user_id: user.id }).sort({ submitted_at: -1 }).toArray();

  const fields = await col('field_defs').find().toArray();
  const filledCount = fields.filter((f) => profile[f.key]).length;

  res.json({
    user: { full_name: user.full_name },
    docs_ready: docs.filter((d) => d.status !== 'missing').length,
    docs_total: docs.length,
    eligible_count: eligible.length,
    applications_count: apps.length,
    profile_completeness: Math.round((filledCount / fields.length) * 100),
    recommended: eligible.slice(0, 4),
    recent_applications: apps.slice(0, 5).map(clean),
  });
});

export default router;

