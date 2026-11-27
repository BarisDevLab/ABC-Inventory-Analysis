const DATABASE = 'abc-inventory-user-history';
const STORE = 'analyses';
export const HISTORY_MAX = 10;
export type HistoryKey = [savedAt: string, id: string, name: string];

async function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, result: (value: T) => void, reject: (error: Error) => void) => void,
): Promise<T> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      let result: T;
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(transaction.error ?? new Error('Geçmiş işlemi tamamlanamadı.'));
      operation(transaction.objectStore(STORE), value => { result = value; }, error => {
        reject(error);
        transaction.abort();
      });
    });
  } finally {
    database.close();
  }
}

export async function listHistory(): Promise<HistoryKey[]> {
  if (typeof indexedDB.databases === 'function' &&
      !(await indexedDB.databases()).some(database => database.name === DATABASE)) return [];
  return transact('readonly', (store, done) => {
    const request = store.getAllKeys();
    request.onsuccess = () => done((request.result as HistoryKey[]).reverse());
  });
}

export function addHistory(name: string, bytes: ArrayBuffer): Promise<void> {
  return transact('readwrite', (store, done, reject) => {
    const count = store.count();
    count.onsuccess = () => {
      if (count.result >= HISTORY_MAX) {
        reject(new Error('Yerel geçmiş dolu. Yeni analiz kaydetmek için bir kaydı silin.'));
        return;
      }
      const key: HistoryKey = [new Date().toISOString(), crypto.randomUUID(), name];
      store.add(bytes, key).onsuccess = () => done(undefined);
    };
  });
}

export function readHistory(key: HistoryKey): Promise<ArrayBuffer> {
  return transact('readonly', (store, done, reject) => {
    const request = store.get(key);
    request.onsuccess = () => {
      if (!(request.result instanceof ArrayBuffer)) reject(new Error('Kayıt bulunamadı.'));
      else done(request.result);
    };
  });
}

export function deleteHistory(key?: HistoryKey): Promise<void> {
  return transact('readwrite', (store, done) => {
    const request = key ? store.delete(key) : store.clear();
    request.onsuccess = () => done(undefined);
  });
}
