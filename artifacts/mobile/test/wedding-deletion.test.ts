import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import test from 'node:test';
import { MutationObserver, QueryClient } from '@tanstack/react-query';
import type { Wedding } from '@workspace/api-client-react';
import { createWeddingDeletionLifecycle } from '../utils/wedding-deletion.ts';

const queryKey = ['/api/weddings'];
const wedding = (id: number): Wedding => ({
  id, names: `Couple ${id}`, currency: 'EUR', weddingDate: '2027-06-01',
  venue: 'Paris', totalBudget: 10000, guestCount: 10, createdAt: '2026-01-01',
});

function setup(selected = 1) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(queryKey, [wedding(1), wedding(2)]);
  let selection: number | null = selected;
  let errors = 0;
  const lifecycle = createWeddingDeletionLifecycle({
    queryClient: client, queryKey,
    getSelection: () => selection,
    selectWedding: (id) => { selection = id; },
    showError: () => { errors += 1; },
  });
  return {
    client, lifecycle,
    get selection() { return selection; },
    get errors() { return errors; },
    select: (id: number) => { selection = id; },
    ids: () => client.getQueryData<Wedding[]>(queryKey)?.map((entry) => entry.id),
  };
}

test('a slow deletion updates the list and active wedding before the server responds', async () => {
  const state = setup();
  let finish!: () => void;
  let started!: () => void;
  let calls = 0;
  const request = new Promise<void>((resolve) => { finish = resolve; });
  const ready = new Promise<void>((resolve) => { started = resolve; });
  const mutation = new MutationObserver(state.client, {
    ...state.lifecycle,
    mutationFn: async (_variables: { id: number }) => {
      calls += 1;
      started();
      await request;
    },
  });
  try {
    const pending = mutation.mutate({ id: 1 });
    await ready;
    assert.deepEqual(state.ids(), [2]);
    assert.equal(state.selection, 2);
    assert.equal(mutation.getCurrentResult().isPending, true);
    finish();
    await pending;
    assert.equal(calls, 1);
    assert.deepEqual(state.ids(), [2]);
    assert.equal(state.client.getQueryState(queryKey)?.isInvalidated, true);
  } finally {
    finish();
    state.client.clear();
  }
});

test('failure restores the deleted wedding and selection without losing other changes', async () => {
  const state = setup();
  try {
    const context = await state.lifecycle.onMutate({ id: 1 });
    state.client.setQueryData(queryKey, [{ ...wedding(2), names: 'Edited' }, wedding(3)]);
    state.lifecycle.onError(new Error('Offline'), { id: 1 }, context);
    assert.deepEqual(state.ids(), [1, 2, 3]);
    assert.equal(state.client.getQueryData<Wedding[]>(queryKey)?.[1]?.names, 'Edited');
    assert.equal(state.selection, 1);
    assert.equal(state.errors, 1);
    // A repeated notification must not duplicate a restored wedding.
    state.lifecycle.onError(new Error('Offline'), { id: 1 }, context);
    assert.deepEqual(state.ids(), [1, 2, 3]);
  } finally {
    state.client.clear();
  }
});

test('rollback does not overwrite a wedding manually selected while waiting', async () => {
  const state = setup();
  try {
    const context = await state.lifecycle.onMutate({ id: 1 });
    state.select(3);
    state.lifecycle.onError(new Error('Offline'), { id: 1 }, context);
    assert.equal(state.selection, 3);
  } finally {
    state.client.clear();
  }
});

test('deleting an inactive wedding preserves selection; deleting the last clears it', async () => {
  const state = setup();
  try {
    await state.lifecycle.onMutate({ id: 2 });
    assert.equal(state.selection, 1);
    const context = await state.lifecycle.onMutate({ id: 1 });
    assert.deepEqual(state.ids(), []);
    assert.equal(state.selection, 0);
    state.lifecycle.onError(new Error('Offline'), { id: 1 }, context);
    assert.deepEqual(state.ids(), [1]);
    assert.equal(state.selection, 1);
  } finally {
    state.client.clear();
  }
});

test('success only removes caches belonging to the deleted wedding', () => {
  const state = setup();
  try {
    for (const path of ['/api/weddings/1', '/api/weddings/1/guests', '/api/weddings/10/guests']) {
      state.client.setQueryData([path], ['cached']);
    }
    state.lifecycle.onSuccess(undefined, { id: 1 });
    assert.equal(state.client.getQueryData(['/api/weddings/1']), undefined);
    assert.equal(state.client.getQueryData(['/api/weddings/1/guests']), undefined);
    assert.deepEqual(state.client.getQueryData(['/api/weddings/10/guests']), ['cached']);
    assert.notEqual(state.client.getQueryData(queryKey), undefined);
  } finally {
    state.client.clear();
  }
});

test('payment cards and section titles use the same 16-point gutter as the summary', () => {
  const source = readFileSync(new URL('../app/(tabs)/paiements.tsx', import.meta.url), 'utf8');
  assert.match(source, /content:\s*\{[^}]*paddingHorizontal:\s*16/);
  assert.match(source, /sectionRow:\s*\{[^}]*marginHorizontal:\s*16/);
  assert.match(source, /card:\s*\{[^}]*marginHorizontal:\s*16/);
});

test('weddings have an immediate accessible delete action instead of a long-press delay', () => {
  const source = readFileSync(new URL('../app/(tabs)/mariages.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /delayLongPress|onLongPress/);
  assert.match(source, /handleDelete\(item\.id, item\.names\)/);
  assert.match(source, /event\.stopPropagation\(\)/);
  assert.match(source, /deleteButton:\s*\{[^}]*minWidth:\s*44[^}]*minHeight:\s*44/);
});
