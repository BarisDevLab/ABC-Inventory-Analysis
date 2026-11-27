import { FILE_LIMITS } from './limits';
import { UserInputError } from '../core/user-error';

const DATABASE = 'abc-inventory-user-history';
const STORE = 'analyses';
export const HISTORY_MAX = 10;
export type HistoryKey = [savedAt: string, id: string, name: string];

function openHistory(create: boolean): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    let missing = false;
    request.onupgradeneeded = () => {
      if (create) request.result.createObjectStore(STORE);
      else {
        missing = true;
        request.transaction!.abort();
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => {
      if (missing) resolve(null);
      else reject(request.error);
    };
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, result: (value: T) => void, reject: (error: Error) => void) => void,
  create = false,
): Promise<T | undefined> {
  const database = await openHistory(create);
  if (!database) return;
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
  return await transact<HistoryKey[]>('readonly', (store, done) => {
    const request = store.getAllKeys();
    request.onsuccess = () => done((request.result as HistoryKey[]).reverse());
  }) ?? [];
}

export async function addHistory(name: string, bytes: ArrayBuffer): Promise<void> {
  if (!name.trim() || name.length > 1024 || !bytes.byteLength || bytes.byteLength > FILE_LIMITS.bytes) {
    throw new UserInputError('Geçersiz ABC analiz paketi.');
  }
  await transact<void>('readwrite', (store, done, reject) => {
    const count = store.count();
    count.onsuccess = () => {
      if (count.result >= HISTORY_MAX) {
        reject(new UserInputError('Yerel geçmiş dolu. Yeni analiz kaydetmek için bir kaydı silin.'));
        return;
      }
      const key: HistoryKey = [new Date().toISOString(), crypto.randomUUID(), name];
      store.add(bytes, key).onsuccess = () => done(undefined);
    };
  }, true);
}

export async function readHistory(key: HistoryKey): Promise<ArrayBuffer> {
  const bytes = await transact<ArrayBuffer>('readonly', (store, done, reject) => {
    const request = store.get(key);
    request.onsuccess = () => {
      if (!(request.result instanceof ArrayBuffer)) reject(new UserInputError('Kayıt bulunamadı.'));
      else done(request.result);
    };
  });
  if (!bytes) throw new UserInputError('Kayıt bulunamadı.');
  return bytes;
}

export async function deleteHistory(key?: HistoryKey): Promise<void> {
  if (key) {
    await transact<void>('readwrite', (store, done) => {
      store.delete(key).onsuccess = () => done(undefined);
    });
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
