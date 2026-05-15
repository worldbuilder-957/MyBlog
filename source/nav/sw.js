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

// ICS 订阅缓存名称（独立缓存 bucket，便于管理和清理）
const ICS_CACHE_NAME = 'nav-ics-subscriptions-v1';

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
        if (key !== CACHE_NAME && key !== ICS_CACHE_NAME) {
          console.log('[SW] Removing old cache', key);
          return caches.delete(key);
        }
        return Promise.resolve();
      }));
    })
  );
  return self.clients.claim();
});

// 3. 拦截请求：区分静态资源（Cache-First）和 ICS 订阅（Network-First）
self.addEventListener('fetch', (event) => {
  // 只拦截 http/https 请求
  const reqUrl = event.request.url;
  if (!reqUrl.startsWith('http')) return;

  // 判断是否为 ICS 订阅请求
  // 特征：URL 包含 .ics、CORS 代理、webcal 协议
  const isICSRequest =
    reqUrl.includes('.ics') ||
    reqUrl.includes('corsproxy.io') ||
    reqUrl.includes('allorigins.win') ||
    reqUrl.includes('webcal://');

  if (isICSRequest) {
    // Network-First 策略：优先从网络获取最新日历数据
    // 网络成功 → 更新 ICS 缓存（供离线降级）
    // 网络失败 → 从 ICS 缓存中读取旧数据
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const cloned = networkResponse.clone();
          caches.open(ICS_CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-First 策略：优先缓存，网络兜底（原有逻辑）
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
