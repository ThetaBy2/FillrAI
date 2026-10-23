import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { col, insert, notify } from '../db.js';
import { sendMail } from '../mailer.js';

const secret = () => process.env.SECRET_KEY || 'fillrai-secret-change-me';

function makeToken(user) {
  const minutes = Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 10080);
  return jwt.sign({ sub: String(user.id) }, secret(), { expiresIn: `${minutes}m` });
}

const userOut = (u) => ({ id: u.id, email: u.email, full_name: u.full_name, phone: u.phone });

// Middleware: every protected route needs "Authorization: Bearer <token>".
// On success, req.userId is the logged-in user's id.
export function requireLogin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ detail: 'Not authenticated' });
  try {
    req.userId = Number(jwt.verify(token, secret()).sub);
    next();
  } catch {
    res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

export const currentUser = (req) => col('users').findOne({ id: req.userId });

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, full_name, phone } = req.body || {};
  if (!email || !password || !full_name) {
    return res.status(400).json({ detail: 'Email, password and name are required' });
  }
  const cleanEmail = email.toLowerCase().trim();
  if (await col('users').findOne({ email: cleanEmail })) {
    return res.status(400).json({ detail: 'Email already registered' });
  }

  const user = await insert('users', {
    email: cleanEmail,
    full_name: full_name.trim(),
    phone: phone || null,
    hashed_password: await bcrypt.hash(password, 10),
    created_at: new Date(),
  });
  await notify(user.id, 'Welcome to FillrAI', 'Add Aadhaar or PAN to your vault to speed up applications.', 'info', 'documents');
  sendMail(user.email, 'Welcome to FillrAI', {
    heading: `Welcome, ${user.full_name}`,
    intro: 'Your FillrAI account is ready. Add your Aadhaar or PAN to the document vault and we will fill government scheme applications for you automatically.',
    button: { text: 'Set up your vault', page: 'documents.html' },
  });

  res.json({ access_token: makeToken(user), user: userOut(user) });
});

router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase().trim();
  const user = await col('users').findOne({ email });
  if (!user || !(await bcrypt.compare(req.body?.password || '', user.hashed_password))) {
    return res.status(401).json({ detail: 'Invalid email or password' });
  }
  sendMail(user.email, 'New sign-in to your FillrAI account', {
    heading: 'New sign-in detected',
    intro: `Hi ${user.full_name}, your FillrAI account was just signed in to.`,
    details: [
      ['Time', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'],
      ['IP address', req.ip],
      ['Device', req.get('user-agent') || 'Unknown'],
    ],
    note: 'If this was you, no action is needed. If not, change your password immediately.',
  });
  res.json({ access_token: makeToken(user), user: userOut(user) });
});

router.get('/me', requireLogin, async (req, res) => {
  res.json(userOut(await currentUser(req)));
});

router.patch('/me', requireLogin, async (req, res) => {
  const { full_name, phone } = req.body || {};
  await col('users').updateOne(
    { id: req.userId },
    { $set: { full_name: String(full_name || '').trim(), phone: phone || null } },
  );
  res.json(userOut(await currentUser(req)));
});

export default router;

