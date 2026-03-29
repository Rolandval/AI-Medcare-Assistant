/**
 * React Query AsyncStorage persister for offline support.
 * Caches query results so the app works without internet.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/react-query-persist-client";

const STORAGE_KEY = "MEDCARE_QUERY_CACHE";

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: STORAGE_KEY,
  // Throttle writes to every 2 seconds to avoid performance issues
  throttleTime: 2000,
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});
