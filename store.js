/* Tiny IndexedDB key-value store. The page mirrors its state here so the
   service worker can read it when a push arrives. */
(function (root) {
  let dbp;
  function open() {
    dbp = dbp || new Promise((resolve, reject) => {
      const req = indexedDB.open('hanma', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction('kv', mode);
      const req = fn(t.objectStore('kv'));
      t.oncomplete = () => resolve(req.result);
      t.onerror = () => reject(t.error);
    });
  }
  root.Store = {
    get: (key) => tx('readonly', (s) => s.get(key)),
    set: (key, value) => tx('readwrite', (s) => s.put(value, key)),
  };
})(self);
