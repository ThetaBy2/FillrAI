import express from 'express';
import crypto from 'node:crypto';
import { col, clean, insert, notify } from '../db.js';
import { currentUser } from './auth.js';
import { sendMail } from '../mailer.js';
import { profileFor, checkEligibility } from '../profile.js';

const router = express.Router();

const STATUS_ORDER = ['submitted', 'verified', 'under_review', 'approved', 'issued'];

router.get('/', async (req, res) => {
  const apps = await col('applications').find({ user_id: req.userId }).sort({ submitted_at: -1 }).toArray();
  res.json(apps.map(clean));
});

// Submit an application.
// mode "direct"   = FillrAI submits it (only schemes with has_direct_api)
// mode "redirect" = user filled it on the official portal, we just track it
router.post('/', async (req, res) => {
  const { scheme_id, mode, form_data } = req.body || {};
  const scheme = await col('schemes').findOne({ id: scheme_id, is_active: { $ne: false } });
  if (!scheme) return res.status(404).json({ detail: 'Scheme not found' });
  if (mode === 'direct' && !scheme.has_direct_api) {
    return res.status(400).json({ detail: 'This scheme can only be submitted on its official portal' });
  }

  const user = await currentUser(req);
  const profile = await profileFor(user);
  if (!checkEligibility(scheme.eligibility_rules, profile).eligible) {
    return res.status(400).json({ detail: 'You are not eligible for this scheme' });
  }

  // Form = values from the profile, overridden by whatever the user typed.
  const form = {};
  for (const key of scheme.fields) form[key] = profile[key];
  Object.assign(form, form_data);
  const missing = scheme.fields.filter((key) => !form[key]);
  if (missing.length) return res.status(400).json({ detail: `Missing fields: ${missing.join(', ')}` });

  const now = new Date();
  const ref = `FILLR-${crypto.randomInt(10000, 100000)}-${crypto.randomInt(100, 1000)}`;
  const app = await insert('applications', {
    user_id: req.userId,
    scheme_id: scheme.id,
    ref_number: ref,
    name: scheme.name,
    mode: mode === 'direct' ? 'direct' : 'redirect',
    status: 'submitted',
    form_data: form,
    status_history: [{ status: 'submitted', detail: `Submitted via FillrAI (${mode})`, at: now }],
    portal: scheme.portal,
    submitted_at: now,
  });
  await notify(req.userId, `Application filed: ${scheme.name}`, `Ref ${ref}.`, 'success', 'track');
  sendMail(user.email, `Application submitted: ${scheme.name}`, {
    heading: 'Application submitted',
    intro: `Hi ${user.full_name}, your application for ${scheme.name} has been submitted. Keep the reference number below for your records.`,
    details: [
      ['Scheme', scheme.name],
      ['Reference number', ref],
      ['Submitted on', now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
      ['Status', 'Submitted'],
    ],
    button: { text: 'Track application', page: 'track.html' },
    note: 'We will email you whenever the status of this application changes.',
  });

  res.json(clean(app));
});

// Demo helper: move an application to the next status.
router.post('/:id/advance', async (req, res) => {
  const app = await col('applications').findOne({ id: Number(req.params.id), user_id: req.userId });
  if (!app) return res.status(404).json({ detail: 'Application not found' });

  const position = STATUS_ORDER.indexOf(app.status); // -1 for "rejected": stays as is
  const next = position >= 0 ? STATUS_ORDER[position + 1] : undefined;
  if (next) {
    app.status = next;
    app.status_history.push({ status: next, detail: `Advanced to ${next}`, at: new Date() });
    await col('applications').replaceOne({ id: app.id }, app);
    await notify(req.userId, `${app.name}: ${next}`, `Ref ${app.ref_number} updated.`, 'info', 'track');
    const user = await currentUser(req);
    const label = next.replace('_', ' ').replace(/^./, (c) => c.toUpperCase());
    sendMail(user.email, `Status update: ${app.name} is now ${label}`, {
      heading: `Your application is ${label.toLowerCase()}`,
      intro: `Hi ${user.full_name}, there is an update on your application for ${app.name}.`,
      details: [
        ['Reference number', app.ref_number],
        ['New status', label],
      ],
      button: { text: 'View details', page: 'track.html' },
    });
  }
  res.json(clean(app));
});

export default router;

