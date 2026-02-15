// إنشاء خلفية الرموز الرياضية (نفس script.js)
const mathSymbols = ['π', '∑', '∫', '√', '∞', 'α', 'β', 'θ', '≈', '≠', '≤', '≥', 'Δ', 'φ', 'λ', 'Ω'];
const mathBg = document.getElementById('mathBg');
const tokenCache = new Map(); // كاش بسيط لتخزين qrToken حسب الكود

function createMathSymbols() {
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

// متغيرات عامة
const WORKER_BASE = "https://long-mud-24f2.mmondeer346.workers.dev";
const PIN_STORAGE_KEY = "teacher_pin";
const PIN_EXPIRY_KEY = "teacher_pin_expiry";
const PIN_EXPIRY_HOURS = 8;

let html5QrCode = null;
let currentPin = null;
let isScanning = false;
let scanLockout = false;

// العناصر
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

// دالة فحص PIN المخزن
function checkStoredPin() {
    const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
    const expiry = localStorage.getItem(PIN_EXPIRY_KEY);
    
    if (storedPin && expiry) {
        const expiryTime = parseInt(expiry);
        const now = Date.now();
        
        if (now < expiryTime) {
            currentPin = storedPin;
            showScannerSection();
            return true;
        } else {
            localStorage.removeItem(PIN_STORAGE_KEY);
            localStorage.removeItem(PIN_EXPIRY_KEY);
        }
    }
    
    return false;
}

// دالة حفظ PIN
function storePin(pin) {
    const expiry = Date.now() + (PIN_EXPIRY_HOURS * 60 * 60 * 1000);
    localStorage.setItem(PIN_STORAGE_KEY, pin);
    localStorage.setItem(PIN_EXPIRY_KEY, expiry.toString());
    currentPin = pin;
}

// دالة حذف PIN
function clearStoredPin() {
    localStorage.removeItem(PIN_STORAGE_KEY);
    localStorage.removeItem(PIN_EXPIRY_KEY);
    currentPin = null;
}

// دالة عرض خطأ PIN
function showPinError(message) {
    pinError.textContent = message;
    pinError.classList.add('show');
    pinInput.classList.add('error');
}

// دالة إخفاء خطأ PIN
function hidePinError() {
    pinError.textContent = '';
    pinError.classList.remove('show');
    pinInput.classList.remove('error');
}

// دالة عرض قسم الماسح
function showScannerSection() {
    pinSection.style.display = 'none';
    scannerSection.style.display = 'block';
}

// دالة عرض قسم PIN
function showPinSection() {
    scannerSection.style.display = 'none';
    pinSection.style.display = 'block';
    pinInput.value = '';
    hidePinError();
}

// دالة عرض رسالة خطأ عامة
function showScanError(message) {
    scanError.textContent = message;
    scanError.style.display = 'block';
    setTimeout(() => {
        scanError.style.display = 'none';
    }, 5000);
}

// دالة عرض النتيجة
function showResult(data) {
    resultBox.style.display = 'block';
    
    // تحديد اللون والأيقونة حسب الحالة
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
    }
    
    // عرض التفاصيل
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
    
    // إخفاء النتيجة بعد 5 ثواني
    setTimeout(() => {
        resultBox.style.display = 'none';
    }, 5000);
}

// دالة إرسال QR إلى الخادم
async function sendQrToServer(qrToken) {
    try {
        const response = await fetch(`${WORKER_BASE}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                qrToken: qrToken,
                pin: currentPin
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.ok) {
            throw new Error(data.error || 'فشل تسجيل الحضور');
        }
        
        // عرض النتيجة
        showResult(data);
        
    } catch (error) {
        console.error('خطأ في إرسال QR:', error);
        showScanError('خطأ: ' + error.message);
    }
}

// دالة معالجة نجاح المسح
    async function onScanSuccess(decodedText) {
    if (scanLockout) return;
    scanLockout = true;
    try {
        const code = String(decodedText ?? "").trim();
        if (!code) throw new Error("QR فارغ");
        // ✅ 1) حاول نجيب qrToken من الكاش (أسرع)
        let qrToken = tokenCache.get(code);
        // ✅ 2) إذا ماكانش، نجيبو من السيرفر مرة وحدة ونخزنو
        if (!qrToken) {
        const sRes = await fetch(`${WORKER_BASE}/student?code=${encodeURIComponent(code)}`, {
            method: "GET",
            cache: "no-store",
        });
        const sData = await sRes.json().catch(() => ({}));
        if (!sRes.ok || !sData.ok) {
            throw new Error(sData.error || `Student not found (HTTP ${sRes.status})`);
        }
        if (!sData.qrToken) {
            throw new Error("qrToken غير متوفر في رد /student");
        }
        qrToken = String(sData.qrToken).trim();
        tokenCache.set(code, qrToken); // ✅ تخزين للكود القادم
        }
        // ✅ 3) نسجل الحضور باستعمال qrToken + PIN
        await sendQrToServer(qrToken);
    } catch (e) {
        showScanError(e.message || "حدث خطأ أثناء المسح");
    } finally {
        setTimeout(() => {
        scanLockout = false;
        }, 700);
    }
    }

// دالة معالجة خطأ المسح
// ✅ دالة معالجة خطأ المسح (محسّنة للأداء)
    let lastRealErrorAt = 0;

    function onScanError(errorMessage) {
    const msg = String(errorMessage || "").toLowerCase();

    const isNormalNoise =
        msg.includes("no qr code found") ||
        msg.includes("notfoundexception") ||
        msg.includes("not found") ||
        msg.includes("no code detected") ||
        msg.includes("no multi format readers");

    if (isNormalNoise) return;

    const now = Date.now();
    if (now - lastRealErrorAt < 2000) return;
    lastRealErrorAt = now;

    console.warn("Scan real error:", errorMessage);
    showScanError("خطأ في المسح: " + errorMessage);
    }

// دالة بدء المسح
    async function startScanning() {
    if (isScanning) return;

    try {
        if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader");
        }
        // ✅ إعدادات أسرع و أخف على الهاتف
        const config = {
        fps: 14, // أفضل توازن للسرعة والثبات
        qrbox: { width: 240, height: 240 }, // أصغر = قراءة أسرع
        aspectRatio: 1.0,
        disableFlip: true,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        };
        // ✅ تحسين جودة الفيديو (يساعد بزاف في القراءة)
        const cameraConfig = {
        facingMode: "environment",
        // إذا الجهاز يدعمها، تعطي صورة أوضح للـ QR
        width: { ideal: 1280 },
        height: { ideal: 720 },
        };
        await html5QrCode.start(
        cameraConfig,
        config,
        onScanSuccess,
        onScanError
        );
        isScanning = true;
        startScanBtn.style.display = "none";
        stopScanBtn.style.display = "block";
        scanError.style.display = "none";
    } catch (error) {
        console.error("خطأ في تشغيل الكاميرا:", error);
        showScanError("فشل تشغيل الكاميرا. تأكد من السماح بالوصول إلى الكاميرا.");
    }
    }
// دالة إيقاف المسح
async function stopScanning() {
    if (!isScanning || !html5QrCode) return;
    
    try {
        await html5QrCode.stop();
        isScanning = false;
        startScanBtn.style.display = 'block';
        stopScanBtn.style.display = 'none';
    } catch (error) {
        console.error('خطأ في إيقاف الكاميرا:', error);
    }
}

// معالجة إرسال PIN
pinSubmitBtn.addEventListener('click', async () => {
    const pin = pinInput.value.trim();

    hidePinError();

    if (!pin) {
        showPinError('الرجاء إدخال الرقم السري');
        return;
    }

    if (pin.length < 4 || pin.length > 6) {
        showPinError('الرقم السري يجب أن يكون من 4 إلى 6 أرقام');
        return;
    }

    if (!/^\d+$/.test(pin)) {
        showPinError('الرقم السري يجب أن يحتوي على أرقام فقط');
        return;
    }

    // تعطيل الزر مؤقتاً
    pinSubmitBtn.disabled = true;

    try {
        // ✅ تحقق من الـ PIN عبر السيرفر
        const res = await fetch(`${WORKER_BASE}/auth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin })
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
            throw new Error(data.error || 'PIN غير صحيح');
        }

        // ✅ إذا صحيح: احفظه وادخل للماسح
        storePin(pin);
        showScannerSection();

    } catch (err) {
        showPinError(err.message || 'PIN غير صحيح');
    } finally {
        pinSubmitBtn.disabled = false;
    }
});

// السماح بالضغط على Enter في حقل PIN
pinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        pinSubmitBtn.click();
    }
});

// معالجة زر تشغيل الكاميرا
startScanBtn.addEventListener('click', startScanning);

// معالجة زر إيقاف الكاميرا
stopScanBtn.addEventListener('click', stopScanning);

// معالجة زر تسجيل الخروج
logoutBtn.addEventListener('click', async () => {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        await stopScanning();
        clearStoredPin();
        showPinSection();
    }
});

// تنظيف عند إغلاق الصفحة
window.addEventListener('beforeunload', async () => {
    if (isScanning) {
        await stopScanning();
    }
});

// تهيئة الصفحة عند التحميل
window.addEventListener('DOMContentLoaded', () => {
    checkStoredPin();
});