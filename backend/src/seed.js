import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { col, insert } from './db.js';

const daysAgo = (days) => new Date(Date.now() - Number(days || 0) * 86400000);

// On first start (no users yet) load the catalog and 50 demo users from the seed file.
export async function seedDatabase(seedFile) {
  await col('users').createIndex({ email: 1 }, { unique: true });
  if ((await col('users').countDocuments()) > 0) return;

  const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));

  await col('vault_doc_types').insertMany(seed.vault_doc_types);
  await col('field_defs').insertMany(seed.field_defs);
  await col('schemes').insertMany(seed.schemes.map((s) => ({ ...s, is_active: true })));
  await col('digilocker_profiles').insertMany(seed.digilocker_profiles);

  const password = await bcrypt.hash('fillrai1234', 10);
  const labels = Object.fromEntries(seed.vault_doc_types.map((t) => [t.id, t.label]));

  for (const s of seed.users) {
    const user = await insert('users', {
      email: s.email.toLowerCase(),
      full_name: s.full_name,
      phone: s.phone || null,
      hashed_password: password,
      created_at: daysAgo(140),
    });

    for (const [docType, d] of Object.entries(s.documents)) {
      await insert('documents', {
        user_id: user.id,
        doc_type: docType,
        label: labels[docType] || docType,
        status: d.status,
        source: d.source,
        extracted_data: d.extracted_data || {},
        verified: !!d.verified,
        created_at: daysAgo(d.days_ago),
      });
    }

    for (const a of s.checklist || []) {
      await insert('checklist_items', { user_id: user.id, field_key: a.field_key, value: a.value });
    }

    for (const a of s.applications || []) {
      const submitted = daysAgo(a.submitted_days_ago);
      await insert('applications', {
        user_id: user.id,
        scheme_id: a.scheme_id,
        ref_number: a.ref_number,
        name: a.name,
        mode: a.mode,
        status: a.status,
        form_data: a.form_data || {},
        status_history: (a.status_history || []).map((h) => ({
          status: h.status,
          detail: h.detail,
          at: new Date(submitted.getTime() + Number(h.hours_after || 0) * 3600000),
        })),
        portal: a.portal,
        submitted_at: submitted,
      });
    }

    for (const n of s.notifications || []) {
      await insert('notifications', {
        user_id: user.id,
        title: n.title,
        body: n.body,
        kind: n.kind || 'info',
        link: n.link,
        is_read: !!n.is_read,
        created_at: daysAgo(n.days_ago),
      });
    }

    for (const m of s.chat_messages || []) {
      await insert('chat_messages', {
        user_id: user.id,
        role: m.role,
        content: m.content,
        created_at: daysAgo(m.days_ago),
      });
    }
  }
  console.log(`Seeded ${seed.users.length} demo users.`);
}

