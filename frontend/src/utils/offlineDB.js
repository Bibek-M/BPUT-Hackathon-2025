// IndexedDB utility for offline document storage

const DB_NAME = 'AILearningAssistantDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  DOCUMENTS: 'documents',
  COURSES: 'courses',
  QUIZZES: 'quizzes',
  SYNC_QUEUE: 'syncQueue'
};

class OfflineDB {
  constructor() {
    this.db = null;
  }

  // Initialize database
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create documents store
        if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
          const documentsStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: '_id' });
          documentsStore.createIndex('courseId', 'courseId', { unique: false });
          documentsStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        // Create courses store
        if (!db.objectStoreNames.contains(STORES.COURSES)) {
          const coursesStore = db.createObjectStore(STORES.COURSES, { keyPath: '_id' });
          coursesStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        // Create quizzes store
        if (!db.objectStoreNames.contains(STORES.QUIZZES)) {
          const quizzesStore = db.createObjectStore(STORES.QUIZZES, { keyPath: '_id' });
          quizzesStore.createIndex('courseId', 'courseId', { unique: false });
          quizzesStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        console.log('IndexedDB stores created');
      };
    });
  }

  // Generic get operation
  async get(storeName, key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic getAll operation
  async getAll(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic put operation
  async put(storeName, data) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put({
        ...data,
        lastAccessed: Date.now()
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic delete operation
  async delete(storeName, key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get by index
  async getByIndex(storeName, indexName, value) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Document-specific methods
  async saveDocument(document) {
    return this.put(STORES.DOCUMENTS, document);
  }

  async getDocument(documentId) {
    return this.get(STORES.DOCUMENTS, documentId);
  }

  async getDocumentsByCourse(courseId) {
    return this.getByIndex(STORES.DOCUMENTS, 'courseId', courseId);
  }

  async getAllDocuments() {
    return this.getAll(STORES.DOCUMENTS);
  }

  async deleteDocument(documentId) {
    return this.delete(STORES.DOCUMENTS, documentId);
  }

  // Course-specific methods
  async saveCourse(course) {
    return this.put(STORES.COURSES, course);
  }

  async getCourse(courseId) {
    return this.get(STORES.COURSES, courseId);
  }

  async getAllCourses() {
    return this.getAll(STORES.COURSES);
  }

  async deleteCourse(courseId) {
    return this.delete(STORES.COURSES, courseId);
  }

  // Quiz-specific methods
  async saveQuiz(quiz) {
    return this.put(STORES.QUIZZES, quiz);
  }

  async getQuiz(quizId) {
    return this.get(STORES.QUIZZES, quizId);
  }

  async getQuizzesByCourse(courseId) {
    return this.getByIndex(STORES.QUIZZES, 'courseId', courseId);
  }

  async getAllQuizzes() {
    return this.getAll(STORES.QUIZZES);
  }

  async deleteQuiz(quizId) {
    return this.delete(STORES.QUIZZES, quizId);
  }

  // Sync queue methods
  async addToSyncQueue(action) {
    return this.put(STORES.SYNC_QUEUE, {
      ...action,
      timestamp: Date.now(),
      synced: false
    });
  }

  async getSyncQueue() {
    return this.getAll(STORES.SYNC_QUEUE);
  }

  async clearSyncQueue() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Cleanup old data
  async cleanupOldData(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
    const now = Date.now();
    const cutoff = now - maxAge;

    const stores = [STORES.DOCUMENTS, STORES.COURSES, STORES.QUIZZES];

    for (const storeName of stores) {
      await this.init();
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index('lastAccessed');
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.lastAccessed < cutoff) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    }
  }

  // Get database size estimate
  async getStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      return await navigator.storage.estimate();
    }
    return null;
  }

  // Clear all data
  async clearAllData() {
    await this.init();
    const stores = [STORES.DOCUMENTS, STORES.COURSES, STORES.QUIZZES, STORES.SYNC_QUEUE];
    
    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

// Export singleton instance
const offlineDB = new OfflineDB();
export default offlineDB;
