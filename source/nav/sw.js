const CACHE_NAME = 'nav-command-center-v3'; // 升个版本号

const ASSETS_TO_CACHE = [
  '/nav/',
  '/nav/index.html',
  '/nav/style.css',      // 👈 修正：指向 /nav/ 下的文件
  '/nav/script.js',      // 👈 修正：指向 /nav/ 下的文件
  '/nav/manifest.json',
  '/images/CatIcon192.png', // 确保这些图片在 source/images/ 下存在
  '/images/CatIcon512.png',
  // 如果你有用到的其他图片，比如 banner.webp，也要加进来
  '/nav/banner.webp'
];

// 1. 安装：缓存资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // 强制立即接管，不用等下次刷新
  self.skipWaiting(); 
});

// 2. 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// 3. 拦截请求：优先缓存，网络兜底
self.addEventListener('fetch', (event) => {
  // 只拦截 http/https 请求
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // 缓存中有，直接返回
      if (response) {
        return response;
      }
      // 缓存没有，去网络拉取
      return fetch(event.request);
    })
  );
});