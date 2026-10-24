import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { test } from 'node:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';

const tabs = ['budget', 'invites', 'paiements', 'contrats', 'prestataires', 'documents'];

for (const tab of tabs) {
  for (const empty of [false, true]) {
    test(`${tab}: failed refresh preserves ${empty ? 'empty' : 'populated'} cache and retry recovers`, async () => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const queryKey = [tab, 42];
      const cached = empty ? [] : [{ id: 1 }];
      client.setQueryData(queryKey, cached);
      let fail = true;
      const observer = new QueryObserver(client, {
        queryKey,
        enabled: false,
        queryFn: async () => {
          if (fail) throw new Error('Network unavailable');
          return [{ id: 2 }];
        },
      });
      const unsubscribe = observer.subscribe(() => {});
      try {
        const failed = await observer.refetch();
        assert.equal(failed.isError, true);
        assert.equal(failed.isRefetchError, true);
        assert.deepEqual(failed.data, cached);
        assert.equal(failed.isLoading, false);
        fail = false;
        const retry = observer.refetch();
        assert.equal(observer.getCurrentResult().isFetching, true);
        assert.deepEqual(observer.getCurrentResult().data, cached);
        const recovered = await retry;
        assert.equal(recovered.isError, false);
        assert.deepEqual(recovered.data, [{ id: 2 }]);
      } finally {
        unsubscribe();
        client.clear();
      }
    });
  }

  test(`${tab}: exposes a compact retry independently of the empty state`, () => {
    const source = readFileSync(new URL(`../app/(tabs)/${tab}.tsx`, import.meta.url), 'utf8');
    const banner = source.indexOf('<QueryErrorState compact');
    assert.ok(banner >= 0);
    assert.ok(source.lastIndexOf('!== undefined', banner) > source.lastIndexOf('ListEmptyComponent=', banner));
    assert.match(source.slice(banner, banner + 110), /onRetry=\{/);
    assert.match(source.slice(banner, banner + 110), /retrying=\{/);
  });
}

test('uncached failure remains distinct from a successful empty list', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    await assert.rejects(client.fetchQuery({
      queryKey: ['uncached'],
      queryFn: async () => { throw new Error('Offline'); },
    }));
    assert.equal(client.getQueryState(['uncached'])?.status, 'error');
    assert.equal(client.getQueryData(['uncached']), undefined);
    await client.fetchQuery({ queryKey: ['uncached'], queryFn: async () => [] });
    assert.equal(client.getQueryState(['uncached'])?.status, 'success');
    assert.deepEqual(client.getQueryData(['uncached']), []);
  } finally {
    client.clear();
  }
});
