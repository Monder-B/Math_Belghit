    const CACHE_VERSION = 'v1.0.8';
    const CACHE_NAME = `math-belghit-${CACHE_VERSION}`;

    // الملفات التي سيتم تخزينها في الكاش
    const STATIC_ASSETS = [
    '/Math_Belghit/index.html',
    '/Math_Belghit/card.html',
    '/Math_Belghit/scan.html',
    '/Math_Belghit/style.css',
    '/Math_Belghit/card.css',
    '/Math_Belghit/scan.css',
    '/Math_Belghit/script.js',
    '/Math_Belghit/card.js',
    '/Math_Belghit/scan.js',
    '/Math_Belghit/install.js',
    '/Math_Belghit/logo.jpg',
    '/Math_Belghit/manifest.json',
    '/Math_Belghit/icons/icon-192.png',
    '/Math_Belghit/icons/icon-512.png',
    '/Math_Belghit/beep.mp3',
    '/Math_Belghit/dashboard.html',
    '/Math_Belghit/dashboard.js',

];
    // التثبيت - تخزين الملفات الأساسية
    self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
        .then(() => self.skipWaiting())
        .catch((error) => {
            console.error('[SW] Cache installation failed:', error);
        })
    );
    });

    // التفعيل - حذف الكاش القديم
    self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    
    event.waitUntil(
        caches.keys()
        .then((cacheNames) => {
            return Promise.all(
            cacheNames
                .filter((name) => name !== CACHE_NAME)
                .map((name) => {
                console.log('[SW] Deleting old cache:', name);
                return caches.delete(name);
                })
            );
        })
        .then(() => self.clients.claim())
    );
    });

    // معالجة الطلبات
    self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // تجاهل طلبات غير HTTP/HTTPS
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // تجاهل طلبات الـ API (workers.dev) - عدم تخزينها
    if (url.hostname.includes('workers.dev')) {
        event.respondWith(fetch(request));
        return;
    }

    // استراتيجية Cache First للملفات الثابتة
        const isStaticFile =
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.json');

    if (isStaticFile) {
    event.respondWith(
        caches.match(request)
        .then((cached) => {
            if (cached) return cached;

            return fetch(request).then((response) => {
            if (response && response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
            });
        })
        .catch(() => {
            if (request.mode === 'navigate') {
            return caches.match('index.html');
            }
        })
    );
    return;
    }

    // استراتيجية Network First للصفحات والطلبات الديناميكية
    event.respondWith(
        fetch(request)
        .then((response) => {
            // تخزين نسخة في الكاش للاستخدام في حالة عدم الاتصال
            if (response && response.status === 200 && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
                .then((cache) => cache.put(request, responseClone));
            }
            return response;
        })
        .catch(() => {
            // محاولة الحصول من الكاش في حالة الفشل
            return caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                return cachedResponse;
                }
                
                // Fallback للصفحة الرئيسية
                if (request.mode === 'navigate') {
                return caches.match('index.html');
                }
            });
        })
    );
    });

    // معالجة رسائل من الصفحات
    self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
            cacheNames.map((name) => caches.delete(name))
            );
        })
        );
    }
    });

    // دعم إشعارات الـ Push (اختياري للمستقبل)
    self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
        body: data.body || 'إشعار جديد من MATH BELGHIT',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        vibrate: [200, 100, 200],
        data: data.data || {}
        };
        
        event.waitUntil(
        self.registration.showNotification(data.title || 'MATH BELGHIT', options)
        );
    }
    });

    // معالجة النقر على الإشعارات
    self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data.url || 'index.html')
    );
    });