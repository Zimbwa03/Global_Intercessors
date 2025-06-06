
// Import and configure the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAJP5UwvnQi9e2eUggbaUqZCU15kEFj4vM",
  authDomain: "global-intercessors.firebaseapp.com",
  projectId: "global-intercessors",
  storageBucket: "global-intercessors.firebasestorage.app",
  messagingSenderId: "938573366582",
  appId: "1:938573366582:web:812a695f3a47b712691f97",
  measurementId: "G-PDJ0EEEDE5"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/generated-icon.png',
    badge: '/generated-icon.png',
    data: payload.data,
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Prayer Slot'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app and navigate to prayer slot management
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});
