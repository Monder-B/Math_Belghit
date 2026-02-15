    // إنشاء خلفية الرموز الرياضية (نفس script.js)
    const mathSymbols = ['π', '∑', '∫', '√', '∞', 'α', 'β', 'θ', '≈', '≠', '≤', '≥', 'Δ', 'φ', 'λ', 'Ω'];
    const mathBg = document.getElementById('mathBg');

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
    if (mathBg) createMathSymbols();

    // متغيرات عامة
    const WORKER_BASE = "https://long-mud-24f2.mmondeer346.workers.dev";

    // العناصر
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');
    const studentCard = document.getElementById('studentCard');
    const errorTitle = document.getElementById('errorTitle');
    const errorText = document.getElementById('errorText');

    function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
    }

    function showError(title, message) {
    if (loader) loader.style.display = 'none';
    if (studentCard) studentCard.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'block';
    if (errorTitle) errorTitle.textContent = title;
    if (errorText) errorText.textContent = message;
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
        text,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    }

    function displayStudentCard(data) {
    // ✅ الاسم فقط
    const fullNameEl = document.getElementById('fullName');
    if (fullNameEl) fullNameEl.textContent = data.fullName || '---';

    // ✅ QR = studentCode (لأن scan.js يبحث بالكود)
    if (!data.studentCode) {
        showError('كود غير متوفر', 'لم يتم استلام studentCode من الخادم.');
        return;
    }
    generateQRCode(String(data.studentCode).trim());

    // ✅ الحصص + آخر حصة
    const statsBox = document.getElementById('statsBox');
    if (statsBox) {
        const sessions = (typeof data.sessionsInCycle === "number") ? data.sessionsInCycle : null;

        const lastRaw = data.lastAttendanceAt || data.lastSessionAt || data.lastScanAt || "";

        let lastText = "لا توجد حصص بعد";
        if (lastRaw) {
        const d = new Date(lastRaw);
        lastText = !isNaN(d.getTime())
            ? d.toLocaleString('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' })
            : String(lastRaw);
        }

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

    // ✅ عرض البطاقة
    if (loader) loader.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (studentCard) studentCard.style.display = 'block';
    }

    async function fetchStudentData(code) {
    try {
        const response = await fetch(`${WORKER_BASE}/student?code=${encodeURIComponent(code)}`, { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
        showError('خطأ من الخادم', data.error || `HTTP ${response.status}`);
        return;
        }

        if (data.ok) displayStudentCard(data);
        else showError('بيانات غير صحيحة', data.error || 'لم يتم العثور على الطالب بهذا الكود');

    } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
        showError('خطأ في الاتصال', 'تعذر الاتصال بالخادم. تحقق من الاتصال بالإنترنت وحاول مرة أخرى.');
    }
    }

    window.addEventListener('DOMContentLoaded', () => {
    const code = getQueryParam('code');
    if (!code) {
        showError('كود مفقود', 'يرجى تقديم كود الطالب في الرابط. مثال: card.html?code=A9K3');
        return;
    }
    fetchStudentData(code);
    });