
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAJP5UwvnQi9e2eUggbaUqZCU15kEFj4vM",
  authDomain: "global-intercessors.firebaseapp.com",
  projectId: "global-intercessors",
  storageBucket: "global-intercessors.firebasestorage.app",
  messagingSenderId: "938573366582",
  appId: "1:938573366582:web:812a695f3a47b712691f97",
  measurementId: "G-PDJ0EEEDE5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = getMessaging(app);

export { messaging };

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: 'BEpk99Vng919Ris6k3GXiNDU5BuXbh1Gp_7FaK3GHsWca8PoaBHR2-Q3eGKOGT0L_TJBtwHYlVT6wC8hM0j7_N4'
      });
      
      if (token) {
        console.log('FCM Token:', token);
        return token;
      } else {
        console.log('No registration token available.');
        return null;
      }
    } else {
      console.log('Unable to get permission to notify.');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      resolve(payload);
    });
  });
