    // =====================
    // خلفية الرموز الرياضية
    // =====================
    const mathSymbols = ['π', '∑', '∫', '√', '∞', 'α', 'β', 'θ', '≈', '≠', '≤', '≥', 'Δ', 'φ', 'λ', 'Ω'];
    const mathBg = document.getElementById('mathBg');
    const tokenCache = new Map(); // كاش qrToken حسب studentCode

    function createMathSymbols() {
    if (!mathBg) return;
    for (let i = 0; i < 25; i++) {
        const symbol = document.createElement('div');
        symbol.className = 'math-symbol';
        symbol.textContent = mathSymbols[Math.floor(Math.random() * mathSymbols.length)];
        symbol.style.left = Math.random() * 100 + '%';
        symbol.style.top = Math.random() * 100 + '%';
        symbol.style.animationDelay = Math.random() * 10 + 's';
        symbol.style.fontSize = (Math.random() * 2 + 1) + 'rem';
        mathBg.appendChild(symbol);
    }
    }
    createMathSymbols();

    // =====================
    // إعدادات عامة
    // =====================
    const WORKER_BASE = "https://long-mud-24f2.mmondeer346.workers.dev";

    const PIN_STORAGE_KEY = "teacher_pin";
    const PIN_EXPIRY_KEY = "teacher_pin_expiry";
    const PIN_EXPIRY_HOURS = 8;

    let html5QrCode = null;
    let currentPin = null;
    let isScanning = false;
    let scanLockout = false;

    // =====================
    // عناصر DOM
    // =====================
    const pinSection = document.getElementById('pinSection');
    const scannerSection = document.getElementById('scannerSection');
    const pinInput = document.getElementById('pinInput');
    const pinSubmitBtn = document.getElementById('pinSubmitBtn');
    const pinError = document.getElementById('pinError');
    const startScanBtn = document.getElementById('startScanBtn');
    const stopScanBtn = document.getElementById('stopScanBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    const resultBox = document.getElementById('resultBox');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultDetails = document.getElementById('resultDetails');
    const scanError = document.getElementById('scanError');

    // =====================
    // 🔊 صوت + تأثير ضوئي
    // =====================
    // مهم: لازم ملف beep.mp3 يكون فعلاً داخل /Math_Belghit/
    const scannerBeep = new Audio('/Math_Belghit/beep.mp3');
    scannerBeep.preload = "auto";
    scannerBeep.volume = 1.0;

    // وميض CSS: لازم تضيف .scan-flash في scan.css
    function flashEffect() {
    document.body.classList.add('scan-flash');
    setTimeout(() => document.body.classList.remove('scan-flash'), 120);
    }

    // محاولة تشغيل torch إن كان مدعوم (بدون ما يطيح)
    async function torchBlink(durationMs = 120) {
    try {
        if (!html5QrCode) return;

        // بعض نسخ html5-qrcode فيها getRunningTrack
        const track = typeof html5QrCode.getRunningTrack === "function"
        ? html5QrCode.getRunningTrack()
        : null;

        if (!track) return;

        const cap = track.getCapabilities?.();
        if (!cap || !cap.torch) return;

        await track.applyConstraints({ advanced: [{ torch: true }] });
        setTimeout(async () => {
        try { await track.applyConstraints({ advanced: [{ torch: false }] }); } catch {}
        }, durationMs);
    } catch {
        // تجاهل
    }
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
    // باش تشوفها دايماً حتى لو كانت تحت
    scanError.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(() => {
        scanError.style.display = 'none';
    }, 4500);
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

    resultDetails.innerHTML = `
        <div class="result-row">
        <span class="result-label">✅ حضر:</span>
        <span class="result-value">${data.sessionsInCycle}</span>
        </div>
        <div class="result-row">
        <span class="result-label">💰 المتبقي للدفع:</span>
        <span class="result-value">${data.remainingToPay}</span>
        </div>
        <div class="result-row">
        <span class="result-label">⛔ المتبقي للحد الأقصى:</span>
        <span class="result-value">${data.remainingToMax}</span>
        </div>
    `;

    if (data.state === 'due_at_4') {
        resultDetails.innerHTML += '<div class="result-message">يجب الدفع قبل الحصة القادمة</div>';
    } else if (data.state === 'suspended') {
        resultDetails.innerHTML += '<div class="result-message">الطالب موقوف حتى الدفع</div>';
    }

    setTimeout(() => {
        resultBox.style.display = 'none';
    }, 2500);
    }

    // =====================
    // API calls
    // =====================
    async function sendQrToServer(qrToken) {
    const response = await fetch(`${WORKER_BASE}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken, pin: currentPin }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'فشل تسجيل الحضور');
    showResult(data);
    }

    async function onScanSuccess(decodedText) {
    if (scanLockout) return;
    scanLockout = true;

    try {
        const code = String(decodedText ?? "").trim();
        if (!code) throw new Error("QR فارغ");

        // ✅ كاش للسرعة
        let qrToken = tokenCache.get(code);

        if (!qrToken) {
        const sRes = await fetch(`${WORKER_BASE}/student?code=${encodeURIComponent(code)}`, {
            method: "GET",
            cache: "no-store",
        });

        const sData = await sRes.json().catch(() => ({}));
        if (!sRes.ok || !sData.ok) throw new Error(sData.error || `Student not found (HTTP ${sRes.status})`);
        if (!sData.qrToken) throw new Error("qrToken غير متوفر في رد /student");

        qrToken = String(sData.qrToken).trim();
        tokenCache.set(code, qrToken);
        }

        await sendQrToServer(qrToken);
    } catch (e) {
        showScanError(e.message || "حدث خطأ أثناء المسح");
    } finally {
        setTimeout(() => (scanLockout = false), 650);
    }
    }

    // ✅ onScanError محسّن
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
    isScanning = true; // ✅ اقفل مباشرة لتفادي double start

    try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode("qr-reader");

        const config = {
        fps: 14,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
        disableFlip: true,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        };

        await html5QrCode.start(
        { facingMode: "environment" }, // ✅ مفتاح واحد فقط
        config,
        onScanSuccess,
        onScanError
        );

        startScanBtn.style.display = "none";
        stopScanBtn.style.display = "block";
        scanError.style.display = "none";

    } catch (error) {
        console.error("Camera start error:", error);
        showScanError("فشل تشغيل الكاميرا: " + (error?.message || ""));
        isScanning = false; // ✅ رجّعها لو فشل
    }
    }

    async function stopScanning() {
    if (!isScanning || !html5QrCode) return;
    try {
        await html5QrCode.stop();
    } catch {}
    isScanning = false;
    startScanBtn.style.display = 'block';
    stopScanBtn.style.display = 'none';
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
        const res = await fetch(`${WORKER_BASE}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || 'PIN غير صحيح');

        storePin(pin);
        showScannerSection();
    } catch (err) {
        showPinError(err.message || 'PIN غير صحيح');
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