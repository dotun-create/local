class PushNotificationService {
  constructor() {
    this.registration = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.permission = Notification.permission;
    this.subscribed = false;
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');

      // Check if already subscribed
      const existingSubscription = await this.registration.pushManager.getSubscription();
      this.subscribed = !!existingSubscription;

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  async requestPermission() {
    if (!this.isSupported) {
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      console.warn('Push notifications are blocked. Please enable them in browser settings.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  async subscribe() {
    if (!this.isSupported || !this.registration) {
      return null;
    }

    const permissionGranted = await this.requestPermission();
    if (!permissionGranted) {
      return null;
    }

    try {
      // Generate VAPID public key (in production, this should come from server)
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM-9Q25_GWr_YIxZsO_qhSIFJtUUkMwi5QD5VnfwlpK4Jk7IgX8zQQ';

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      this.subscribed = true;
      console.log('Push notification subscription successful');

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  async unsubscribe() {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        this.subscribed = false;
        console.log('Push notification subscription removed');

        // Remove subscription from server
        await this.removeSubscriptionFromServer(subscription);

        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  async sendSubscriptionToServer(subscription) {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription to server');
      }

      console.log('Subscription saved to server');
    } catch (error) {
      console.error('Error sending subscription to server:', error);
    }
  }

  async removeSubscriptionFromServer(subscription) {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/push-subscriptions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server');
      }

      console.log('Subscription removed from server');
    } catch (error) {
      console.error('Error removing subscription from server:', error);
    }
  }

  async showLocalNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'tutor-academy-notification',
        renotify: true,
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  getPermissionStatus() {
    return this.permission;
  }

  isSubscribed() {
    return this.subscribed;
  }

  isSupported() {
    return this.isSupported;
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;