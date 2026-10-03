// 푸시 알림을 받아 표시하고, 누르면 앱을 여는 서비스 워커
self.addEventListener("push", (event) => {
  let data = { title: "나만의 정통주역운세", body: "오늘의 괘가 도착했어요.", url: "./", tag: "daily-hexagram" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // 본문이 JSON이 아니면 기본 문구를 쓴다
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "icon-v2-192.png",
      badge: "icon-v2-192.png",
      data: { url: data.url },
      tag: data.tag,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./", self.location.href).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.startsWith(self.registration.scope));
      if (existing) return existing.focus();
      return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
