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

test('web profile currency persistence keeps metadata and becomes the new-wedding default', () => {
  const metadata = { theme: 'jardin-parisien', preferredCurrency: 'EUR' };
  const updatedMetadata = withPreferredCurrency(metadata, 'GBP');

  assert.deepEqual(updatedMetadata, {
    theme: 'jardin-parisien',
    preferredCurrency: 'GBP',
  });
  assert.equal(getNewWeddingCurrency(updatedMetadata), 'GBP');
});

test('web new-wedding defaults accept every supported currency without falling back to EUR', () => {
  for (const currency of supportedCurrencies) {
    assert.equal(getNewWeddingCurrency({ preferredCurrency: currency }), currency);
    assert.equal(CURRENCIES.some((item) => item.code === currency), true);
  }
  assert.equal(getNewWeddingCurrency({ preferredCurrency: 'CAD' }), DEFAULT_CURRENCY);
});