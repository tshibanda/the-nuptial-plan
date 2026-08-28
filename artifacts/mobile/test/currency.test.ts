import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  getNewWeddingCurrency,
  getPreferredCurrency,
  withPreferredCurrency,
  type SupportedCurrency,
} from '../../../lib/api-client-react/src/currency.ts';

const supportedCurrencies: SupportedCurrency[] = ['EUR', 'GBP', 'USD', 'CHF'];

test('mobile profile currency persistence keeps existing metadata', () => {
  const metadata = { onboardingComplete: true };
  const updatedMetadata = withPreferredCurrency(metadata, 'CHF');

  assert.deepEqual(updatedMetadata, {
    onboardingComplete: true,
    preferredCurrency: 'CHF',
  });
  assert.equal(getPreferredCurrency(updatedMetadata), 'CHF');
});

test('mobile new-wedding defaults retain GBP, USD, and CHF', () => {
  for (const currency of supportedCurrencies) {
    assert.equal(getNewWeddingCurrency({ preferredCurrency: currency }), currency);
    assert.equal(CURRENCIES.find((item) => item.code === currency)?.code, currency);
  }
  assert.equal(getNewWeddingCurrency({ preferredCurrency: 'CAD' }), DEFAULT_CURRENCY);
});