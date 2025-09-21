class StorageService {
  constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorage();
    this.isSessionStorageAvailable = this.checkSessionStorage();
  }

  checkLocalStorage() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  checkSessionStorage() {
    try {
      const test = '__sessionStorage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Local Storage methods
  setLocal(key, value) {
    if (!this.isLocalStorageAvailable) {
      console.warn('localStorage is not available');
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.error('Error setting localStorage item:', error);
      return false;
    }
  }

  getLocal(key, defaultValue = null) {
    if (!this.isLocalStorageAvailable) {
      return defaultValue;
    }

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error getting localStorage item:', error);
      return defaultValue;
    }
  }

  removeLocal(key) {
    if (!this.isLocalStorageAvailable) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing localStorage item:', error);
      return false;
    }
  }

  clearLocal() {
    if (!this.isLocalStorageAvailable) {
      return false;
    }

    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  // Session Storage methods
  setSession(key, value) {
    if (!this.isSessionStorageAvailable) {
      console.warn('sessionStorage is not available');
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      sessionStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.error('Error setting sessionStorage item:', error);
      return false;
    }
  }

  getSession(key, defaultValue = null) {
    if (!this.isSessionStorageAvailable) {
      return defaultValue;
    }

    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error getting sessionStorage item:', error);
      return defaultValue;
    }
  }

  removeSession(key) {
    if (!this.isSessionStorageAvailable) {
      return false;
    }

    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing sessionStorage item:', error);
      return false;
    }
  }

  clearSession() {
    if (!this.isSessionStorageAvailable) {
      return false;
    }

    try {
      sessionStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing sessionStorage:', error);
      return false;
    }
  }

  // Cookie methods (fallback)
  setCookie(name, value, days = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${JSON.stringify(value)};expires=${expires.toUTCString()};path=/`;
  }

  getCookie(name, defaultValue = null) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');

    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        try {
          return JSON.parse(c.substring(nameEQ.length, c.length));
        } catch (error) {
          return c.substring(nameEQ.length, c.length);
        }
      }
    }
    return defaultValue;
  }

  removeCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  // Utility methods
  getStorageInfo() {
    return {
      localStorage: {
        available: this.isLocalStorageAvailable,
        used: this.getStorageUsage('localStorage'),
      },
      sessionStorage: {
        available: this.isSessionStorageAvailable,
        used: this.getStorageUsage('sessionStorage'),
      },
    };
  }

  getStorageUsage(storageType) {
    if (storageType === 'localStorage' && !this.isLocalStorageAvailable) {
      return { used: 0, total: 0 };
    }
    if (storageType === 'sessionStorage' && !this.isSessionStorageAvailable) {
      return { used: 0, total: 0 };
    }

    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    let total = 0;

    for (let key in storage) {
      if (storage.hasOwnProperty(key)) {
        total += storage[key].length + key.length;
      }
    }

    return {
      used: total,
      total: 5 * 1024 * 1024, // Approximate 5MB limit
      percentage: Math.round((total / (5 * 1024 * 1024)) * 100),
    };
  }
}

const storageService = new StorageService();

export default storageService;