import express from 'express';
import { col, clean, insert } from '../db.js';
import { currentUser } from './auth.js';
import { profileFor } from '../profile.js';
import { askGemini } from '../gemini.js';

const router = express.Router();

const FALLBACK_REPLY =
  'I can help you explore schemes, prepare applications, and organise your document vault. ' +
  '(The AI assistant needs a GEMINI_API_KEY to give real answers.)';

router.get('/history', async (req, res) => {
  const messages = await col('chat_messages').find({ user_id: req.userId }).sort({ id: -1 }).limit(40).toArray();
  res.json(messages.reverse().map(clean));
});

router.delete('/history', async (req, res) => {
  await col('chat_messages').deleteMany({ user_id: req.userId });
  res.json({ ok: true });
});

router.post('/', async (req, res) => {
  const message = String(req.body?.message || '').trim();
  await insert('chat_messages', { user_id: req.userId, role: 'user', content: message, created_at: new Date() });

  // Give Gemini the user's profile and the scheme list so it can answer about eligibility.
  const profile = await profileFor(await currentUser(req));
  const schemes = await col('schemes')
    .find({ is_active: { $ne: false } }, { projection: { _id: 0, name: 1, category: 1, description: 1, fields: 1, eligibility_rules: 1 } })
    .toArray();
  const prompt =
    'You are FillrAI, a concise assistant for Indian government documents and schemes. ' +
    'Only use the profile and scheme list below when talking about eligibility. ' +
    'Do not claim to submit applications. If details are missing, ask the user.\n' +
    `Profile: ${JSON.stringify(profile)}\n` +
    `Schemes: ${JSON.stringify(schemes)}\n` +
    `User: ${message}`;

  let reply = FALLBACK_REPLY;
  try {
    reply = (await askGemini([{ text: prompt }])) || FALLBACK_REPLY;
  } catch (err) {
    console.warn('Gemini chat unavailable:', err.message);
  }

  await insert('chat_messages', { user_id: req.userId, role: 'assistant', content: reply, created_at: new Date() });
  res.json({ reply });
});

export default router;

