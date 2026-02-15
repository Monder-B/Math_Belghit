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

createMathSymbols();

// متغيرات عامة
const WORKER_BASE = "https://long-mud-24f2.mmondeer346.workers.dev";
let currentStudentData = null;

// العناصر
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('errorMessage');
const studentCard = document.getElementById('studentCard');
const errorTitle = document.getElementById('errorTitle');
const errorText = document.getElementById('errorText');

// دالة لقراءة Query String
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// دالة عرض رسالة خطأ
function showError(title, message) {
    loader.style.display = 'none';
    studentCard.style.display = 'none';
    errorMessage.style.display = 'block';
    errorTitle.textContent = title;
    errorText.textContent = message;
}

// دالة إنشاء QR Code
function generateQRCode(data) {
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = ''; // مسح QR القديم
    
    new QRCode(qrContainer, {
        text: data,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// دالة عرض بطاقة الطالب
function displayStudentCard(data) {
    currentStudentData = data;
    
    // ملء البيانات
    document.getElementById('fullName').textContent = data.fullName || '---';
    document.getElementById('className').textContent = data.class || '---';
    document.getElementById('studentCode').textContent = data.studentCode || '----';
    
    // إنشاء QR Code
    if (!data.studentCode) {
    showError('كود غير متوفر', 'لم يتم استلام studentCode من الخادم.');
    return;
    }
    generateQRCode(data.studentCode);
    
    // (اختياري) عرض الحالة
    const statusBox = document.getElementById('statusBox');
    if (statusBox && typeof data.sessionsInCycle === "number") {
    statusBox.innerHTML = `
        ✅ حضرت: <b>${data.sessionsInCycle}</b> |
        💰 باقي للدفع: <b>${data.remainingToPay}</b> |
        ⛔ باقي للحد الأقصى: <b>${data.remainingToMax}</b>
    `;
}
    
    // إخفاء Loader وعرض البطاقة
    loader.style.display = 'none';
    errorMessage.style.display = 'none';
    studentCard.style.display = 'block';
}

// دالة جلب بيانات الطالب من API
    async function fetchStudentData(code) {
    try {
        const response = await fetch(`${WORKER_BASE}/student?code=${encodeURIComponent(code)}`);
        const data = await response.json();

        if (!response.ok) {
        showError('خطأ من الخادم', data.error || `HTTP ${response.status}`);
        return;
        }

        if (data.ok) {
        displayStudentCard(data);
        } else {
        showError('بيانات غير صحيحة', data.error || 'لم يتم العثور على الطالب بهذا الكود');
        }
    } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
        showError('خطأ في الاتصال', 'تعذر الاتصال بالخادم. تحقق من الاتصال بالإنترنت وحاول مرة أخرى.');
    }
    }

// زر نسخ الكود
document.getElementById('copyCodeBtn').addEventListener('click', async () => {
    const code = document.getElementById('studentCode').textContent;
    const btn = document.getElementById('copyCodeBtn');
    const originalText = btn.innerHTML;

    const showCopied = () => {
        btn.innerHTML = '<span class="btn-text">✓ تم النسخ</span>';
        btn.classList.add('copied');

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('copied');
        }, 2000);
    };

    try {
        // الطريقة الحديثة
        await navigator.clipboard.writeText(code);
        showCopied();
    } catch (error) {
        console.error('فشل النسخ (clipboard):', error);

        // طريقة بديلة للمتصفحات اللي ما تدعمش clipboard
        try {
            const textArea = document.createElement('textarea');
            textArea.value = code;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            const ok = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (ok) {
                showCopied();
            } else {
                alert('فشل نسخ الكود. يرجى نسخه يدوياً: ' + code);
            }
        } catch (err) {
            alert('فشل نسخ الكود. يرجى نسخه يدوياً: ' + code);
        }
    }
});

// زر تحديث QR
document.getElementById('refreshBtn').addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>';
    
    const code = getQueryParam('code');
    if (code) {
        await fetchStudentData(code);
    }
    
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }, 1000);
});

// تهيئة الصفحة عند التحميل
window.addEventListener('DOMContentLoaded', () => {
    const code = getQueryParam('code');
    
    if (!code) {
        showError('كود مفقود', 'يرجى تقديم كود الطالب في الرابط. مثال: card.html?code=A9K3');
        return;
    }
    
    fetchStudentData(code);
});