import test from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility } from './profile.js';

test('eligibility rules', () => {
  const rules = { max_income: 300000, category_in: ['SC'], reason: 'SC, income under 3L' };

  assert.equal(checkEligibility(rules, { annualIncome: '200000', category: 'SC' }).eligible, true);
  assert.equal(checkEligibility(rules, { annualIncome: '400000', category: 'SC' }).eligible, false);
  assert.equal(checkEligibility(rules, { annualIncome: '200000', category: 'OBC' }).reason, 'SC, income under 3L');
  assert.equal(checkEligibility(rules, { category: 'SC' }).eligible, false); // unknown income

  assert.equal(checkEligibility({ requires_fields: ['pan'] }, { pan: 'ABCDE1234F' }).eligible, true);
  assert.equal(checkEligibility({ requires_fields: ['pan'] }, {}).eligible, false);
  assert.equal(checkEligibility({}, {}).eligible, true);
});

