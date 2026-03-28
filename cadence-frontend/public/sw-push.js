// Push notification service worker for Cadence
// Separate from the PWA service worker to avoid conflicts

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "Time to check in!",
      icon: data.icon || "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: data.tag || "cadence-reminder",
      renotify: true,
      data: { url: "/" },
    };

    event.waitUntil(self.registration.showNotification(data.title || "Cadence", options));
  } catch {
    // Fallback for non-JSON payloads
    event.waitUntil(
      self.registration.showNotification("Cadence", {
        body: "Have you logged your habits today?",
        icon: "/icons/icon-192x192.png",
        tag: "cadence-reminder",
      })
    );
  }
});

// Open app when notification is clicked
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes("/") && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      return self.clients.openWindow("/");
    })
  );
});
