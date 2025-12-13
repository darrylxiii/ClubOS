import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define the database schema
interface TQCOfflineDB extends DBSchema {
  userProfile: {
    key: string;
    value: {
      id: string;
      data: any;
      syncedAt: number;
    };
  };
  jobs: {
    key: string;
    value: {
      id: string;
      data: any;
      syncedAt: number;
    };
    indexes: { 'by-synced': number };
  };
  applications: {
    key: string;
    value: {
      id: string;
      data: any;
      syncedAt: number;
    };
    indexes: { 'by-synced': number };
  };
  messages: {
    key: string;
    value: {
      id: string;
      conversationId: string;
      data: any;
      syncedAt: number;
    };
    indexes: { 'by-conversation': string; 'by-synced': number };
  };
  offlineActions: {
    key: string;
    value: {
      id: string;
      type: 'create' | 'update' | 'delete';
      entity: string;
      payload: any;
      createdAt: number;
      retryCount: number;
    };
    indexes: { 'by-created': number };
  };
  syncStatus: {
    key: string;
    value: {
      entity: string;
      lastSyncAt: number;
      status: 'idle' | 'syncing' | 'error';
      errorMessage?: string;
    };
  };
}

const DB_NAME = 'tqc-offline-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TQCOfflineDB>> | null = null;

async function getDB(): Promise<IDBPDatabase<TQCOfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TQCOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // User profile store
        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'id' });
        }

        // Jobs store
        if (!db.objectStoreNames.contains('jobs')) {
          const jobsStore = db.createObjectStore('jobs', { keyPath: 'id' });
          jobsStore.createIndex('by-synced', 'syncedAt');
        }

        // Applications store
        if (!db.objectStoreNames.contains('applications')) {
          const appsStore = db.createObjectStore('applications', { keyPath: 'id' });
          appsStore.createIndex('by-synced', 'syncedAt');
        }

        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
          messagesStore.createIndex('by-conversation', 'conversationId');
          messagesStore.createIndex('by-synced', 'syncedAt');
        }

        // Offline actions queue
        if (!db.objectStoreNames.contains('offlineActions')) {
          const actionsStore = db.createObjectStore('offlineActions', { keyPath: 'id' });
          actionsStore.createIndex('by-created', 'createdAt');
        }

        // Sync status store
        if (!db.objectStoreNames.contains('syncStatus')) {
          db.createObjectStore('syncStatus', { keyPath: 'entity' });
        }
      },
    });
  }
  return dbPromise;
}

// User Profile
export async function saveUserProfile(userId: string, data: any): Promise<void> {
  const db = await getDB();
  await db.put('userProfile', {
    id: userId,
    data,
    syncedAt: Date.now(),
  });
}

export async function getUserProfile(userId: string): Promise<any | null> {
  const db = await getDB();
  const record = await db.get('userProfile', userId);
  return record?.data || null;
}

// Jobs
export async function saveJobs(jobs: any[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('jobs', 'readwrite');
  const now = Date.now();
  
  await Promise.all([
    ...jobs.map(job => tx.store.put({
      id: job.id,
      data: job,
      syncedAt: now,
    })),
    tx.done,
  ]);
}

export async function getJobs(): Promise<any[]> {
  const db = await getDB();
  const records = await db.getAll('jobs');
  return records.map(r => r.data);
}

export async function getJob(id: string): Promise<any | null> {
  const db = await getDB();
  const record = await db.get('jobs', id);
  return record?.data || null;
}

// Applications
export async function saveApplications(applications: any[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('applications', 'readwrite');
  const now = Date.now();
  
  await Promise.all([
    ...applications.map(app => tx.store.put({
      id: app.id,
      data: app,
      syncedAt: now,
    })),
    tx.done,
  ]);
}

export async function getApplications(): Promise<any[]> {
  const db = await getDB();
  const records = await db.getAll('applications');
  return records.map(r => r.data);
}

export async function getApplication(id: string): Promise<any | null> {
  const db = await getDB();
  const record = await db.get('applications', id);
  return record?.data || null;
}

// Messages
export async function saveMessages(messages: any[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('messages', 'readwrite');
  const now = Date.now();
  
  await Promise.all([
    ...messages.map(msg => tx.store.put({
      id: msg.id,
      conversationId: msg.conversation_id,
      data: msg,
      syncedAt: now,
    })),
    tx.done,
  ]);
}

export async function getMessagesByConversation(conversationId: string): Promise<any[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex('messages', 'by-conversation', conversationId);
  return records.map(r => r.data);
}

// Offline Actions Queue
export async function queueOfflineAction(
  type: 'create' | 'update' | 'delete',
  entity: string,
  payload: any
): Promise<string> {
  const db = await getDB();
  const id = `${entity}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await db.put('offlineActions', {
    id,
    type,
    entity,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
  });
  
  return id;
}

export async function getOfflineActions(): Promise<any[]> {
  const db = await getDB();
  return db.getAllFromIndex('offlineActions', 'by-created');
}

export async function removeOfflineAction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('offlineActions', id);
}

export async function incrementRetryCount(id: string): Promise<void> {
  const db = await getDB();
  const action = await db.get('offlineActions', id);
  if (action) {
    action.retryCount += 1;
    await db.put('offlineActions', action);
  }
}

// Sync Status
export async function updateSyncStatus(
  entity: string,
  status: 'idle' | 'syncing' | 'error',
  errorMessage?: string
): Promise<void> {
  const db = await getDB();
  await db.put('syncStatus', {
    entity,
    lastSyncAt: Date.now(),
    status,
    errorMessage,
  });
}

export async function getSyncStatus(entity: string): Promise<any | null> {
  const db = await getDB();
  return db.get('syncStatus', entity);
}

// Clear all data (for logout)
export async function clearAllOfflineData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['userProfile', 'jobs', 'applications', 'messages', 'offlineActions', 'syncStatus'],
    'readwrite'
  );
  
  await Promise.all([
    tx.objectStore('userProfile').clear(),
    tx.objectStore('jobs').clear(),
    tx.objectStore('applications').clear(),
    tx.objectStore('messages').clear(),
    tx.objectStore('offlineActions').clear(),
    tx.objectStore('syncStatus').clear(),
    tx.done,
  ]);
}

// Check if database has data
export async function hasOfflineData(): Promise<boolean> {
  const db = await getDB();
  const count = await db.count('userProfile');
  return count > 0;
}
