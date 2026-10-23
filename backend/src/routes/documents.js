import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { col, clean, notify } from '../db.js';
import { currentUser } from './auth.js';
import { profileFor } from '../profile.js';
import { askGemini } from '../gemini.js';
import { sendMail } from '../mailer.js';

const router = express.Router();

const findDoc = (req, docType) => col('documents').findOne({ user_id: req.userId, doc_type: docType });
const saveDoc = (doc) => col('documents').replaceOne({ id: doc.id }, doc);

// The user's vault: one row per document type, with status "missing" until added.
router.get('/vault', async (req, res) => {
  const user = await currentUser(req);
  const types = await col('vault_doc_types').find().sort({ sort_order: 1 }).toArray();

  // Make sure a row exists for every document type (new types can be added to the DB at any time).
  for (const type of types) {
    await col('documents').updateOne(
      { user_id: user.id, doc_type: type.id },
      { $setOnInsert: { user_id: user.id, doc_type: type.id, label: type.label, status: 'missing', extracted_data: {}, verified: false, created_at: new Date() } },
      { upsert: true },
    );
  }

  const docs = await col('documents').find({ user_id: user.id }).toArray();
  const documents = types.map((type) => ({
    ...clean(docs.find((d) => d.doc_type === type.id)),
    hint: type.hint,
  }));

  res.json({
    total: documents.length,
    ready: documents.filter((d) => d.status !== 'missing').length,
    documents,
    profile: await profileFor(user),
  });
});

// --- DigiLocker (simulated) ---
// Step 1: find the user's DigiLocker record and "send" an OTP (printed in the server terminal).
router.post('/fetch/request-otp', async (req, res) => {
  const { doc_type } = req.body || {};
  const user = await currentUser(req);
  const profile = await col('digilocker_profiles').findOne({ $or: [{ email: user.email }, { phone: user.phone }] });
  if (!profile) return res.status(400).json({ detail: 'No DigiLocker record matches this account' });
  if (!profile.documents?.[doc_type]) return res.status(400).json({ detail: 'This document is not available in DigiLocker' });

  const otp = String(crypto.randomInt(100000, 1000000));
  const session_id = crypto.randomUUID();
  await col('digilocker_otps').insertOne({
    session_id,
    user_id: user.id,
    doc_type,
    profile_id: profile.id,
    otp,
    expires_at: new Date(Date.now() + 10 * 60 * 1000),
  });
  console.log(`DigiLocker demo OTP for ${user.email} (${doc_type}): ${otp}`);
  sendMail(user.email, `${otp} is your FillrAI verification code`, {
    heading: 'Your verification code',
    intro: 'Use this code to fetch your document from DigiLocker into your FillrAI vault.',
    details: [['One-time code', otp]],
    note: 'This code expires in 10 minutes. Never share it with anyone. FillrAI staff will never ask for it.',
  });

  res.json({ session_id, phone_masked: String(profile.phone || '').replace(/\d(?=\d{4})/g, '*') });
});

// Step 2: check the OTP, then copy the document's data into the vault.
router.post('/fetch/confirm', async (req, res) => {
  const { doc_type, session_id, otp } = req.body || {};
  const session = await col('digilocker_otps').findOne({
    session_id,
    user_id: req.userId,
    doc_type,
    expires_at: { $gt: new Date() },
  });
  if (!session || session.otp !== String(otp)) return res.status(400).json({ detail: 'Invalid or expired OTP' });

  const profile = await col('digilocker_profiles').findOne({ id: session.profile_id });
  const doc = await findDoc(req, doc_type);
  Object.assign(doc, {
    status: 'fetched',
    source: 'digilocker',
    extracted_data: profile.documents[doc_type],
    verified: true,
    updated_at: new Date(),
  });
  await saveDoc(doc);
  await col('digilocker_otps').deleteOne({ _id: session._id });
  await notify(req.userId, `${doc.label} fetched via DigiLocker`, 'OTP verified. Data saved to your vault.', 'success', 'documents');

  res.json(clean(doc));
});

// --- Upload a PDF / image ---
const upload = multer({
  dest: process.env.UPLOAD_DIR || 'uploads',
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /\.(pdf|png|jpe?g|webp)$/i.test(file.originalname)),
});

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'Upload a PDF or image file' });
  const doc = await findDoc(req, req.body.doc_type);
  if (!doc) return res.status(404).json({ detail: 'Unknown document type' });

  // Optional: ask Gemini to read the fields off the document.
  let extracted = {};
  try {
    const prompt = `Extract data from this ${doc.label} document. Return only a JSON object of visible fields such as name, dob, gender, address, aadhaar, pan, phone, email. Return {} if nothing is readable.`;
    const fileData = fs.readFileSync(req.file.path).toString('base64');
    const reply = await askGemini([{ text: prompt }, { inline_data: { mime_type: req.file.mimetype, data: fileData } }]);
    if (reply) extracted = JSON.parse(reply.replace(/```json|```/g, '').trim());
  } catch (err) {
    console.warn('Document extraction unavailable:', err.message);
  }

  Object.assign(doc, {
    status: 'uploaded',
    source: 'upload',
    file_name: req.file.originalname,
    file_path: req.file.path,
    extracted_data: extracted,
    verified: false,
    updated_at: new Date(),
  });
  await saveDoc(doc);
  res.json(clean(doc));
});

// Remove a document: back to "missing".
router.delete('/:type', async (req, res) => {
  const doc = await findDoc(req, req.params.type);
  if (!doc) return res.status(404).json({ detail: 'Document not found' });
  if (doc.file_path) fs.rmSync(doc.file_path, { force: true });
  Object.assign(doc, { status: 'missing', source: null, file_name: null, file_path: null, extracted_data: {}, verified: false });
  await saveDoc(doc);
  res.json(clean(doc));
});

export default router;

