import type { Collection } from '@animegarden/client';

import { Store } from '@tanstack/store';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const defaultCollection: Collection<true> = {
  hash: undefined,
  name: '收藏夹',
  authorization: '',
  filters: []
};

const collectionsKey = 'animegarden:collections';
const collectionsDbVersion = 1;
const collectionsStoreName = 'key-value';
const collectionsMetaStoreName = '_meta';
const currentCollectionNameKey = 'animegarden:cur_collection_name';

type CollectionRecord = Record<string, Collection<true>>;

interface CollectionsDb extends DBSchema {
  [collectionsStoreName]: {
    key: string;
    value: Collection<true>;
  };
  [collectionsMetaStoreName]: {
    key: string;
    value: number;
  };
}

export function createCollectionStores() {
  const initialCollections = { 收藏夹: defaultCollection };
  const collectionsStore = new Store<CollectionRecord>(initialCollections);

  const currentCollectionNameStore = new Store(
    import.meta.env.SSR ? '收藏夹' : readCurrentCollectionName()
  );

  const currentCollectionStore = new Store<Collection | undefined>(
    getCurrentCollection(collectionsStore.state, currentCollectionNameStore.state)
  );

  const syncCurrentCollection = () => {
    currentCollectionStore.setState(() =>
      getCurrentCollection(collectionsStore.state, currentCollectionNameStore.state)
    );
  };

  collectionsStore.subscribe(syncCurrentCollection);
  currentCollectionNameStore.subscribe((name) => {
    if (!import.meta.env.SSR) {
      localStorage.setItem(currentCollectionNameKey, JSON.stringify(name));
    }
    syncCurrentCollection();
  });

  if (!import.meta.env.SSR) {
    const collectionsDb = openDB<CollectionsDb>(collectionsKey, collectionsDbVersion, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(collectionsStoreName)) {
          database.createObjectStore(collectionsStoreName);
        }
        if (!database.objectStoreNames.contains(collectionsMetaStoreName)) {
          database.createObjectStore(collectionsMetaStoreName);
        }
      }
    });

    void collectionsDb
      .then(async (db) => {
        const [keys, values] = await Promise.all([
          db.getAllKeys(collectionsStoreName),
          db.getAll(collectionsStoreName)
        ]);
        const collections = Object.fromEntries(
          keys
            .map((key, index) => [key, values[index]] as const)
            .filter((entry): entry is readonly [string, Collection<true>] => {
              const [key, value] = entry;
              return typeof key === 'string' && isCollection(value);
            })
        );
        const persistedCollections =
          Object.keys(collections).length > 0 ? collections : initialCollections;

        collectionsStore.setState(() => persistedCollections);
        if (Object.keys(collections).length === 0) {
          await persistCollections(db, persistedCollections);
        }
        collectionsStore.subscribe((nextCollections) => {
          void persistCollections(db, nextCollections).catch((error) =>
            console.warn('[collection-store] Failed to write IndexedDB collections', error)
          );
        });
      })
      .catch((error) => {
        console.warn('[collection-store] Failed to read IndexedDB collections', error);
        collectionsStore.setState(() => initialCollections);
      });
  }

  return {
    collectionsStore,
    currentCollectionNameStore,
    currentCollectionStore
  };
}

type CollectionStores = ReturnType<typeof createCollectionStores>;

export function setCurrentCollection(stores: CollectionStores, newCollection: Collection) {
  stores.currentCollectionNameStore.setState(() => newCollection.name);
  stores.collectionsStore.setState((collections) => ({
    ...collections,
    [newCollection.name]: newCollection as Collection<true>
  }));
}

export function addCollectionItem(
  stores: CollectionStores,
  collection: Collection<true>,
  value: Collection<true>['filters'][0]
) {
  const idx = collection.filters.findIndex((i) => i.searchParams === value.searchParams);
  if (idx !== -1) return;

  stores.collectionsStore.setState((collections) => ({
    ...collections,
    [collection.name]: {
      ...collection,
      hash: undefined,
      filters: [value, ...collection.filters]
    }
  }));
}

function readCurrentCollectionName() {
  try {
    return (JSON.parse(localStorage.getItem(currentCollectionNameKey) ?? '"收藏夹"') ??
      '收藏夹') as string;
  } catch {
    return '收藏夹';
  }
}

function getCurrentCollection(collections: CollectionRecord, currentName: string) {
  const current = currentName ? collections[currentName] : undefined;

  return (
    current ?? {
      hash: undefined,
      name: currentName,
      authorization: '',
      filters: []
    }
  );
}

async function persistCollections(db: IDBPDatabase<CollectionsDb>, collections: CollectionRecord) {
  const tx = db.transaction(collectionsStoreName, 'readwrite');

  await tx.store.clear();
  await Promise.all(
    Object.entries(collections).map(([key, collection]) => tx.store.put(collection, key))
  );
  await tx.done;
}

function isCollection(value: unknown): value is Collection<true> {
  return (
    !!value &&
    typeof value === 'object' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'filters' in value &&
    Array.isArray(value.filters)
  );
}

export function updateCollection(
  stores: CollectionStores,
  collection: Collection<true>,
  value: Partial<Collection<true>>
) {
  stores.collectionsStore.setState((collections) => ({
    ...collections,
    [collection.name]: { ...collection, ...value }
  }));
}

export function updateCollectionItem(
  stores: CollectionStores,
  collection: Collection<true>,
  value: Collection<true>['filters'][0]
) {
  const idx = collection.filters.findIndex((i) => i.searchParams === value.searchParams);
  if (idx === -1) return;

  stores.collectionsStore.setState((collections) => ({
    ...collections,
    [collection.name]: {
      ...collection,
      hash: undefined,
      filters: [...collection.filters.slice(0, idx), value, ...collection.filters.slice(idx + 1)]
    }
  }));
}

export function deleteCollectionItem(
  stores: CollectionStores,
  collection: Collection<true>,
  value: Collection<true>['filters'][0]
) {
  const idx = collection.filters.findIndex((i) => i.searchParams === value.searchParams);
  if (idx === -1) return;

  stores.collectionsStore.setState((collections) => ({
    ...collections,
    [collection.name]: {
      ...collection,
      hash: undefined,
      filters: [...collection.filters.slice(0, idx), ...collection.filters.slice(idx + 1)]
    }
  }));
}
