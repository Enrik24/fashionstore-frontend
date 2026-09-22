// Service Worker para Firebase Cloud Messaging (Web Push Notifications)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Configuración básica para inicializar en el Service Worker
firebase.initializeApp({
  apiKey: "AIzaSy_FashionStorePlaceholderKey",
  authDomain: "fashionstore.firebaseapp.com",
  projectId: "fashionstore-app",
  storageBucket: "fashionstore.appspot.com",
  messagingSenderId: "100000000000",
  appId: "1:100000000000:web:fashionstore"
});

const messaging = firebase.messaging();

// Manejador de notificaciones push en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano:', payload);

  const title = payload.notification?.title || payload.data?.title || 'FashionStore Notificación';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'Tienes una actualización sobre tus reservas.',
    icon: payload.notification?.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: payload.data?.url || '/profile/reservations',
      reserva_id: payload.data?.reserva_id
    }
  };

  return self.registration.showNotification(title, options);
});

// Acción al hacer clic en la notificación del sistema operativo
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/profile/reservations';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
