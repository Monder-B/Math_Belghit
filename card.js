    /**
     * card.js - Student Card
     * Generates QR from qrToken (FAST for scan.js)
     */

    // =====================
    // خلفية الرموز الرياضية
    // =====================
    const mathSymbols = ['π', '∑', '∫', '√', '∞', 'α', 'β', 'θ', '≈', '≠', '≤', '≥', 'Δ', 'φ', 'λ', 'Ω'];
    const mathBg = document.getElementById('mathBg');

    function createMathSymbols() {
    if (!mathBg) return;
    // لتفادي ثقل في الأجهزة الضعيفة
    const count = window.innerWidth < 480 ? 16 : 25;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const symbol = document.createElement('div');
        symbol.className = 'math-symbol';
        symbol.textContent = mathSymbols[Math.floor(Math.random() * mathSymbols.length)];
        symbol.style.left = (Math.random() * 100) + '%';
        symbol.style.top = (Math.random() * 100) + '%';
        symbol.style.animationDelay = (Math.random() * 10) + 's';
        symbol.style.fontSize = ((Math.random() * 2) + 1) + 'rem';
        frag.appendChild(symbol);
    }
    mathBg.appendChild(frag);
    }
    createMathSymbols();

    // =====================
    // إعدادات عامة
    // =====================
    const WORKER_BASE = "https://long-mud-24f2.mmondeer346.workers.dev";

    // كاش خفيف على مستوى الصفحة (و sessionStorage باش يرجع سريع بعد refresh)
    const memoryCache = new Map();
    const SESSION_KEY_PREFIX = "mb_card_cache_";

    // =====================
    // عناصر DOM
    // =====================
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');
    const studentCard = document.getElementById('studentCard');
    const errorTitle = document.getElementById('errorTitle');
    const errorText = document.getElementById('errorText');

    // =====================
    // Helpers
    // =====================
    function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
    }

    function showError(title, message) {
    if (loader) loader.style.display = 'none';
    if (studentCard) studentCard.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'block';
    if (errorTitle) errorTitle.textContent = title || 'حدث خطأ';
    if (errorText) errorText.textContent = message || '';
    }

    function generateQRCode(text) {
    if (typeof QRCode === "undefined") {
        showError("مكتبة QR غير متوفرة", "لم يتم تحميل مكتبة qrcodejs. تأكد من الاتصال بالإنترنت.");
        return;
    }

    const qrContainer = document.getElementById('qrcode');
    if (!qrContainer) return;

    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
        text: String(text),
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M // M أسرع و كافي عادة، H ثقيل شوية
    });
    }

    function formatLastAttendance(lastRaw) {
    if (!lastRaw) return "لا توجد حصص بعد";
    const d = new Date(lastRaw);
    if (!isNaN(d.getTime())) {
        return d.toLocaleString('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' });
    }
    return String(lastRaw);
    }

    // fetch with timeout
    async function fetchJsonWithTimeout(url, timeoutMs = 9000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
        const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
        const data = await res.json().catch(() => ({}));
        return { res, data };
    } finally {
        clearTimeout(t);
    }
    }

    // =====================
    // UI Render
    // =====================
    function displayStudentCard(data) {
    // الاسم
    const fullNameEl = document.getElementById('fullName');
    if (fullNameEl) fullNameEl.textContent = data.fullName || '---';

    // ✅ QR = qrToken (الأسرع للـ scan.js)
    const qrToken = (data.qrToken || "").trim();
    if (!qrToken) {
        showError('qrToken غير متوفر', 'الخادم لم يرجّع qrToken. تأكد أن /student يرجّع qrToken.');
        return;
    }
    generateQRCode(qrToken);

    // الحصص + آخر حصة
    const statsBox = document.getElementById('statsBox');
    if (statsBox) {
        const sessions = (typeof data.sessionsInCycle === "number") ? data.sessionsInCycle : null;
        const lastText = formatLastAttendance(data.lastAttendanceAt || data.lastSessionAt || data.lastScanAt || "");

        const sessionsText = (sessions === null) ? "غير متوفر" : String(sessions);

        statsBox.innerHTML = `
        <div style="font-weight:800; font-size:16px; margin-bottom:6px;">
            ✅ عدد الحصص: <b>${sessionsText}</b>
        </div>
        <div style="font-size:14px; opacity:.9;">
            🕒 آخر حصة: <b>${lastText}</b>
        </div>
        `;
    }

    // إظهار البطاقة
    if (loader) loader.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (studentCard) studentCard.style.display = 'block';
    }

    // =====================
    // Data
    // =====================
    async function fetchStudentData(code) {
    const cleanCode = String(code || "").trim();
    if (!cleanCode) {
        showError('كود مفقود', 'يرجى تقديم كود الطالب في الرابط. مثال: card.html?code=A9K3');
        return;
    }

    // 1) memory cache
    if (memoryCache.has(cleanCode)) {
        displayStudentCard(memoryCache.get(cleanCode));
        return;
    }

    // 2) sessionStorage cache
    try {
        const saved = sessionStorage.getItem(SESSION_KEY_PREFIX + cleanCode);
        if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.ok) {
            memoryCache.set(cleanCode, parsed);
            displayStudentCard(parsed);
            return;
        }
        }
    } catch {}

    // 3) fetch
    try {
        const url = `${WORKER_BASE}/student?code=${encodeURIComponent(cleanCode)}`;
        const { res, data } = await fetchJsonWithTimeout(url, 9000);

        if (!res.ok) {
        showError('خطأ من الخادم', data.error || `HTTP ${res.status}`);
        return;
        }

        if (data && data.ok) {
        // cache
        memoryCache.set(cleanCode, data);
        try { sessionStorage.setItem(SESSION_KEY_PREFIX + cleanCode, JSON.stringify(data)); } catch {}
        displayStudentCard(data);
        } else {
        showError('بيانات غير صحيحة', data.error || 'لم يتم العثور على الطالب بهذا الكود');
        }

    } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
        const msg = (String(error?.name) === "AbortError")
        ? "انتهت مهلة الاتصال بالخادم. حاول مرة أخرى."
        : "تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.";
        showError('خطأ في الاتصال', msg);
    }
    }

    // =====================
    // Start
    // =====================
    window.addEventListener('DOMContentLoaded', () => {
    const code = getQueryParam('code');
    if (!code) {
        showError('كود مفقود', 'يرجى تقديم كود الطالب في الرابط. مثال: card.html?code=A9K3');
        return;
    }
    fetchStudentData(code);
    });