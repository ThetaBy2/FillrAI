import { col } from './db.js';

// A user's "profile" is every known field value, merged from:
//   1. data extracted from the documents in their vault
//   2. answers they typed in manually (checklist_items)
// This is what pre-fills every application form.
export async function profileFor(user) {
  const profile = {};

  const documents = await col('documents')
    .find({ user_id: user.id, status: { $ne: 'missing' } })
    .toArray();
  for (const doc of documents) Object.assign(profile, doc.extracted_data);

  const answers = await col('checklist_items').find({ user_id: user.id }).toArray();
  for (const answer of answers) profile[answer.field_key] = answer.value;

  profile.name ||= user.full_name;
  profile.email ||= user.email;
  if (user.phone) profile.phone ||= user.phone;
  return profile;
}

// Rules live on each scheme, e.g. { max_income: 300000, category_in: ['SC'], reason: '...' }.
// Every rule present must pass.
export function checkEligibility(rules = {}, profile) {
  const eligible =
    (rules.max_income == null || Number(profile.annualIncome) <= rules.max_income) &&
    (!rules.category_in || rules.category_in.includes(profile.category)) &&
    (!rules.requires_fields || rules.requires_fields.every((key) => profile[key]));

  return { eligible, reason: eligible ? '' : rules.reason || 'Not eligible' };
}

// Add the user-specific bits to a scheme: are they eligible, which fields are filled / missing.
export function schemeForUser(scheme, profile) {
  const { eligible, reason } = checkEligibility(scheme.eligibility_rules, profile);
  const filled_fields = {};
  const missing_fields = [];
  for (const key of scheme.fields || []) {
    if (profile[key]) filled_fields[key] = profile[key];
    else missing_fields.push(key);
  }
  const { _id, ...rest } = scheme;
  return { ...rest, eligible, eligibility_reason: reason, filled_fields, missing_fields };
}

