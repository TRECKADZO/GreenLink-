/* Service Worker - GreenLink Push Notifications */
/* eslint-disable no-restricted-globals */

self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nouveau message',
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: data.tag || 'greenlink-notification',
      data: { url: data.url || '/messages' },
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'GreenLink', options)
    );
  } catch (e) {
    console.error('Push event error:', e);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/messages';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.includes(self.location.origin)) {
          clients[i].navigate(url);
          return clients[i].focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
