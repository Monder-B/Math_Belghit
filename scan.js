    // =====================================================
    // scan.js (FAST + ACCURATE) - MATH_BELGHIT
    // يعتمد على QRToken مباشرة (أسرع: /scan فقط)
    // =====================================================

    // =====================
    // خلفية الرموز الرياضية
    // =====================
    const mathSymbols = ['π','∑','∫','√','∞','α','β','θ','≈','≠','≤','≥','Δ','φ','λ','Ω'];
    const mathBg = document.getElementById('mathBg');

    (function createMathSymbols(){
    if (!mathBg) return;
    for (let i = 0; i < 22; i++) {
        const symbol = document.createElement('div');
        symbol.className = 'math-symbol';
        symbol.textContent = mathSymbols[Math.floor(Math.random() * mathSymbols.length)];
        symbol.style.left = Math.random() * 100 + '%';
        symbol.style.top = Math.random() * 100 + '%';
        symbol.style.animationDelay = Math.random() * 10 + 's';
        symbol.style.fontSize = (Math.random() * 1.6 + 1.1) + 'rem';
        mathBg.appendChild(symbol);
    }
    })();

    // =====================
    // إعدادات عامة
    // =====================
    const WORKER_BASE = "https://long-mud-24f2.mmondeer346.workers.dev";

    const PIN_STORAGE_KEY = "teacher_pin";
    const PIN_EXPIRY_KEY  = "teacher_pin_expiry";
    const PIN_EXPIRY_HOURS = 8;

    // Performance / Accuracy knobs
    const SCAN_FPS = 15;                 // أسرع من 10 بدون ما يثقل بزاف
    const QRBOX_SIZE = 240;              // حجم مناسب لمعظم الكاميرات
    const LOCKOUT_MS = 900;              // قفل عام بعد نجاح scan
    const SAME_TOKEN_COOLDOWN_MS = 3500; // منع نفس الطالب من التكرار بسرعة
    const NETWORK_TIMEOUT_MS = 6500;     // timeout للـ fetch

    let html5QrCode = null;
    let currentPin = null;
    let isScanning = false;
    let scanLockout = false;

    // token cooldown map
    const recentTokens = new Map(); // token -> lastTime

    // =====================
    // عناصر DOM
    // =====================
    const pinSection = document.getElementById('pinSection');
    const scannerSection = document.getElementById('scannerSection');
    const pinInput = document.getElementById('pinInput');
    const pinSubmitBtn = document.getElementById('pinSubmitBtn');
    const pinError = document.getElementById('pinError');

    const startScanBtn = document.getElementById('startScanBtn');
    const stopScanBtn  = document.getElementById('stopScanBtn');
    const logoutBtn    = document.getElementById('logoutBtn');

    const resultBox     = document.getElementById('resultBox');
    const resultIcon    = document.getElementById('resultIcon');
    const resultTitle   = document.getElementById('resultTitle');
    const resultDetails = document.getElementById('resultDetails');
    const scanError     = document.getElementById('scanError');

    // =====================
    // 🔊 صوت + تأثير ضوئي
    // =====================
    const scannerBeep = new Audio('/Math_Belghit/beep.mp3');
    scannerBeep.preload = "auto";
    scannerBeep.volume = 1.0;

    function flashEffect() {
    document.body.classList.add('scan-flash');
    setTimeout(() => document.body.classList.remove('scan-flash'), 120);
    }

    async function torchBlink(durationMs = 120) {
    try {
        if (!html5QrCode) return;

        const track = (typeof html5QrCode.getRunningTrack === "function")
        ? html5QrCode.getRunningTrack()
        : null;

        if (!track) return;
        const cap = track.getCapabilities?.();
        if (!cap || !cap.torch) return;

        await track.applyConstraints({ advanced: [{ torch: true }] });
        setTimeout(async () => {
        try { await track.applyConstraints({ advanced: [{ torch: false }] }); } catch {}
        }, durationMs);
    } catch {}
    }

    // =====================
    // PIN storage
    // =====================
    function checkStoredPin() {
    const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
    const expiry = localStorage.getItem(PIN_EXPIRY_KEY);

    if (storedPin && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime) {
        currentPin = storedPin;
        showScannerSection();
        return true;
        }
        localStorage.removeItem(PIN_STORAGE_KEY);
        localStorage.removeItem(PIN_EXPIRY_KEY);
    }
    return false;
    }

    function storePin(pin) {
    const expiry = Date.now() + (PIN_EXPIRY_HOURS * 60 * 60 * 1000);
    localStorage.setItem(PIN_STORAGE_KEY, pin);
    localStorage.setItem(PIN_EXPIRY_KEY, String(expiry));
    currentPin = pin;
    }

    function clearStoredPin() {
    localStorage.removeItem(PIN_STORAGE_KEY);
    localStorage.removeItem(PIN_EXPIRY_KEY);
    currentPin = null;
    }

    // =====================
    // UI helpers
    // =====================
    function showPinError(message) {
    pinError.textContent = message;
    pinError.classList.add('show');
    pinInput.classList.add('error');
    }
    function hidePinError() {
    pinError.textContent = '';
    pinError.classList.remove('show');
    pinInput.classList.remove('error');
    }

    function showScannerSection() {
    pinSection.style.display = 'none';
    scannerSection.style.display = 'block';
    }
    function showPinSection() {
    scannerSection.style.display = 'none';
    pinSection.style.display = 'block';
    pinInput.value = '';
    hidePinError();
    }

    function showScanError(message) {
    scanError.textContent = message;
    scanError.style.display = 'block';
    scanError.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
        scanError.style.display = 'none';
    }, 3800);
    }

    // =====================
    // عرض النتيجة + صوت/فلاش
    // =====================
    function showResult(data) {
    try {
        scannerBeep.currentTime = 0;
        scannerBeep.play();
    } catch {}

    flashEffect();
    torchBlink(120);
    if (navigator.vibrate) navigator.vibrate([70, 40, 70]);

    resultBox.style.display = 'block';
    resultBox.scrollIntoView({ behavior: "smooth", block: "center" });

    if (data.state === 'ok') {
        resultBox.className = 'result-box success';
        resultIcon.textContent = '✅';
        resultTitle.textContent = 'تم تسجيل الحصة بنجاح';
    } else if (data.state === 'due_at_4') {
        resultBox.className = 'result-box warning';
        resultIcon.textContent = '⚠️';
        resultTitle.textContent = 'تنبيه: وصل 4 حصص';
    } else if (data.state === 'suspended') {
        resultBox.className = 'result-box error';
        resultIcon.textContent = '🚫';
        resultTitle.textContent = 'موقوف: وصل 8 حصص';
    } else {
        resultBox.className = 'result-box success';
        resultIcon.textContent = '✅';
        resultTitle.textContent = 'تم تسجيل الحصة';
    }

    const sessionsInCycle = Number(data.sessionsInCycle ?? 0);
    const remainingToPay  = Number(data.remainingToPay ?? 0);
    const remainingToMax  = Number(data.remainingToMax ?? 0);

    resultDetails.innerHTML = `
        <div class="result-row">
        <span class="result-label">✅ حضر:</span>
        <span class="result-value">${sessionsInCycle}</span>
        </div>
        <div class="result-row">
        <span class="result-label">💰 المتبقي للدفع:</span>
        <span class="result-value">${remainingToPay}</span>
        </div>
        <div class="result-row">
        <span class="result-label">⛔ المتبقي للحد الأقصى:</span>
        <span class="result-value">${remainingToMax}</span>
        </div>
    `;

    if (data.state === 'due_at_4') {
        resultDetails.innerHTML += '<div class="result-message">يجب الدفع قبل الحصة القادمة</div>';
    } else if (data.state === 'suspended') {
        resultDetails.innerHTML += '<div class="result-message">الطالب موقوف حتى الدفع</div>';
    }

    setTimeout(() => {
        resultBox.style.display = 'none';
    }, 2200);
    }

    // =====================
    // Helpers: fetch timeout + cooldown
    // =====================
    async function fetchWithTimeout(url, options = {}, timeoutMs = NETWORK_TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(id);
    }
    }

    function isTokenOnCooldown(token) {
    const now = Date.now();
    const last = recentTokens.get(token) || 0;
    if (now - last < SAME_TOKEN_COOLDOWN_MS) return true;
    recentTokens.set(token, now);

    // تنظيف بسيط
    if (recentTokens.size > 60) {
        for (const [k, t] of recentTokens.entries()) {
        if (now - t > 2 * SAME_TOKEN_COOLDOWN_MS) recentTokens.delete(k);
        }
    }
    return false;
    }

    // =====================
    // API call: /scan
    // =====================
    async function sendQrToServer(qrToken) {
    const response = await fetchWithTimeout(`${WORKER_BASE}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: "no-store",
        body: JSON.stringify({ qrToken, pin: currentPin }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
        throw new Error(data.error || `فشل تسجيل الحضور (HTTP ${response.status})`);
    }

    showResult(data);
    }

    // =====================
    // Scan callbacks
    // =====================
    async function onScanSuccess(decodedText) {
    if (scanLockout) return;
    scanLockout = true;

    try {
        const token = String(decodedText ?? "").trim();
        if (!token) throw new Error("QR فارغ");

        // ✅ منع نفس الطالب من التسجيل مرتين بسرعة
        if (isTokenOnCooldown(token)) {
        // ما نعرضوش error، فقط نتجاهل
        return;
        }

        // ✅ Request واحد فقط
        await sendQrToServer(token);

    } catch (e) {
        showScanError(e?.message || "حدث خطأ أثناء المسح");
    } finally {
        setTimeout(() => (scanLockout = false), LOCKOUT_MS);
    }
    }

    // تجاهل أخطاء noise
    let lastRealErrorAt = 0;
    function onScanError(errorMessage) {
    const msg = String(errorMessage || "").toLowerCase();
    const isNoise =
        msg.includes("no qr code found") ||
        msg.includes("notfoundexception") ||
        msg.includes("not found") ||
        msg.includes("no code detected") ||
        msg.includes("no multi format readers");

    if (isNoise) return;

    const now = Date.now();
    if (now - lastRealErrorAt < 2000) return;
    lastRealErrorAt = now;

    console.warn("Scan real error:", errorMessage);
    showScanError("خطأ في المسح: " + errorMessage);
    }

    // =====================
    // تشغيل / إيقاف الكاميرا
    // =====================
    async function startScanning() {
    if (isScanning) return;
    isScanning = true;

    try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode("qr-reader");

        const config = {
        fps: SCAN_FPS,
        qrbox: { width: QRBOX_SIZE, height: QRBOX_SIZE },
        aspectRatio: 1.0,
        disableFlip: true,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        // formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ] // إذا حبيت تحصره QR فقط
        };

        await html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanError
        );

        startScanBtn.style.display = "none";
        stopScanBtn.style.display  = "block";
        scanError.style.display    = "none";

    } catch (error) {
        console.error("Camera start error:", error);
        showScanError("فشل تشغيل الكاميرا: " + (error?.message || ""));
        isScanning = false;
    }
    }

    async function stopScanning() {
    if (!isScanning || !html5QrCode) return;
    try { await html5QrCode.stop(); } catch {}
    isScanning = false;
    startScanBtn.style.display = 'block';
    stopScanBtn.style.display  = 'none';
    }

    // =====================
    // PIN submit
    // =====================
    pinSubmitBtn.addEventListener('click', async () => {
    const pin = pinInput.value.trim();
    hidePinError();

    if (!pin) return showPinError('الرجاء إدخال الرقم السري');
    if (pin.length < 4 || pin.length > 6) return showPinError('الرقم السري يجب أن يكون من 4 إلى 6 أرقام');
    if (!/^\d+$/.test(pin)) return showPinError('الرقم السري يجب أن يحتوي على أرقام فقط');

    pinSubmitBtn.disabled = true;

    try {
        const res = await fetchWithTimeout(`${WORKER_BASE}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ pin }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || 'PIN غير صحيح');

        storePin(pin);
        showScannerSection();

    } catch (err) {
        showPinError(err?.message || 'PIN غير صحيح');
    } finally {
        pinSubmitBtn.disabled = false;
    }
    });

    pinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') pinSubmitBtn.click();
    });

    // ✅ زر تشغيل الكاميرا (مرة واحدة فقط) + فتح الصوت
    startScanBtn.addEventListener('click', async () => {
    try {
        await scannerBeep.play();
        scannerBeep.pause();
        scannerBeep.currentTime = 0;
    } catch {}
    startScanning();
    });

    stopScanBtn.addEventListener('click', stopScanning);

    logoutBtn.addEventListener('click', async () => {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        await stopScanning();
        clearStoredPin();
        showPinSection();
    }
    });

    window.addEventListener('beforeunload', async () => {
    if (isScanning) await stopScanning();
    });

    window.addEventListener('DOMContentLoaded', () => {
    checkStoredPin();
    });