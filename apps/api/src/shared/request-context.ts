import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContextStore = {
  requestId: string;
  ipAddress: string | null;
  userAgent: string | null;
};

const storage = new AsyncLocalStorage<RequestContextStore>();

export const requestContext = {
  run<T>(store: RequestContextStore, callback: () => T) {
    return storage.run(store, callback);
  },
  get() {
    return storage.getStore();
  },
};
