import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import type { Guest, Payment } from '@workspace/api-client-react';
import { organizePayments } from '../utils/payment-list.ts';
import { isPremiumTabDataEnabled } from '../utils/tab-access.ts';

const WEDDING_ID = 42;
const STALE_TIME = 5 * 60 * 1000;
const guestQueryKey = [`/api/weddings/${WEDDING_ID}/guests`];
const paymentQueryKey = [`/api/weddings/${WEDDING_ID}/payments`];

function makeGuests(count: number): Guest[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    weddingId: WEDDING_ID,
    name: `Guest ${index + 1}`,
    email: null,
    tableNumber: `Table ${Math.floor(index / 10) + 1}`,
    dietaryRequirements: null,
    rsvpStatus: (['confirmed', 'pending', 'declined'] as const)[index % 3]!,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }));
}

function makePayments(count: number): Payment[] {
  const statuses = ['overdue', 'pending', 'scheduled', 'paid'] as const;
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    weddingId: WEDDING_ID,
    vendorName: `Vendor ${index + 1}`,
    description: `Payment ${index + 1}`,
    amountCents: 10_000 + index,
    dueDate: `2026-${String((index % 12) + 1).padStart(2, '0')}-15`,
    status: statuses[index % statuses.length]!,
    paidDate: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  }));
}

test('large guest and payment caches share one request on first open and reuse data on revisit', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const guests = makeGuests(5_000);
  const payments = makePayments(5_000);
  const requests = { guests: 0, payments: 0 };
  const guestQuery = {
    queryKey: guestQueryKey,
    staleTime: STALE_TIME,
    queryFn: async () => {
      requests.guests += 1;
      return guests;
    },
  };
  const paymentQuery = {
    queryKey: paymentQueryKey,
    staleTime: STALE_TIME,
    queryFn: async () => {
      requests.payments += 1;
      return payments;
    },
  };

  await Promise.all([
    client.prefetchQuery(guestQuery),
    client.fetchQuery(guestQuery),
    client.prefetchQuery(paymentQuery),
    client.fetchQuery(paymentQuery),
  ]);

  assert.deepEqual(requests, { guests: 1, payments: 1 });
  assert.equal((await client.fetchQuery(guestQuery)).length, 5_000);
  assert.equal((await client.fetchQuery(paymentQuery)).length, 5_000);
  assert.deepEqual(requests, { guests: 1, payments: 1 });
  client.clear();
});

test('large payment lists remain completely grouped and priority-sorted', () => {
  const payments = makePayments(5_000).reverse();
  const { sorted, sections } = organizePayments(payments);

  assert.equal(sorted.length, 5_000);
  assert.deepEqual(sections.map(({ key, data }) => [key, data.length]), [
    ['overdue', 1_250],
    ['due', 2_500],
    ['paid', 1_250],
  ]);
  assert.deepEqual(
    sections.flatMap((section) => section.data.map((payment) => payment.id)).sort((a, b) => a - b),
    payments.map((payment) => payment.id).sort((a, b) => a - b),
  );
  assert.equal(sorted[0]?.status, 'overdue');
  assert.equal(sorted.at(-1)?.status, 'paid');
});

test('Premium tab data is disabled for free planners and invalid wedding IDs', () => {
  assert.equal(isPremiumTabDataEnabled(0, true), false);
  assert.equal(isPremiumTabDataEnabled(null, true), false);
  assert.equal(isPremiumTabDataEnabled(WEDDING_ID, false), false);
  assert.equal(isPremiumTabDataEnabled(WEDDING_ID, true), true);
});
