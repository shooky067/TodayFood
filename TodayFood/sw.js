/* 나의 식단표 서비스 워커
 * 파일(index.html, 아이콘 등)을 수정해서 다시 올릴 때는 아래 CACHE_VERSION의 숫자를 올려 주세요.
 * 예: 'meal-planner-v1' → 'meal-planner-v2'
 */
const CACHE_VERSION = 'meal-planner-v1';
const FONT_CACHE = 'meal-planner-fonts-v1';   // 폰트는 버전이 바뀌어도 유지

const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION && k !== FONT_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 폰트 CDN(Pretendard): 캐시 우선, 없으면 받아서 저장 → 한 번 접속 후 오프라인에서도 같은 폰트
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then((hit) => hit || fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        }))
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 앱 파일: 캐시 우선 (새 버전은 CACHE_VERSION을 올리면 반영)
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).catch(() => {
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
