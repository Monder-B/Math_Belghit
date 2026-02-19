        /**
         * card.js - Student Card
         * Shows studentCode + Copy button (NO QR)
         */

        // =====================
        // خلفية الرموز الرياضية
        // =====================
        const mathSymbols = ['π','∑','∫','√','∞','α','β','θ','≈','≠','≤','≥','Δ','φ','λ','Ω'];
        const mathBg = document.getElementById('mathBg');

        function createMathSymbols() {
        if (!mathBg) return;
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

        // كاش خفيف على مستوى الصفحة + sessionStorage
        const memoryCache = new Map();
        const SESSION_KEY_PREFIX = "mb_card_cache_";

        const attendInput = document.getElementById('attendInput');
        const attendBtn = document.getElementById('attendBtn');
        const attendMsg = document.getElementById('attendMsg');
        // =====================
        // عناصر DOM
        // =====================
        const loader = document.getElementById('loader');
        const errorMessage = document.getElementById('errorMessage');
        const studentCard = document.getElementById('studentCard');
        const errorTitle = document.getElementById('errorTitle');
        const errorText = document.getElementById('errorText');

        // new UI
        const studentCodeText = document.getElementById('studentCodeText');
        const copyCodeBtn = document.getElementById('copyCodeBtn');

        let currentStudentCode = "";

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

        function formatLastAttendance(lastRaw) {
        if (!lastRaw) return "لا توجد حصص بعد";
        const d = new Date(lastRaw);
        if (!isNaN(d.getTime())) {
            return d.toLocaleString('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' });
        }
        return String(lastRaw);
        }

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

        // Clipboard with fallback
        async function copyText(text) {
        const value = String(text || "");
        if (!value) throw new Error("لا يوجد كود لنسخه");

        // modern
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
            return true;
        }

        // fallback
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("فشل النسخ");
        return true;
        }

        function setCopyBtnStateCopied() {
        if (!copyCodeBtn) return;
        copyCodeBtn.classList.add("copied");
        copyCodeBtn.querySelector(".btn-text").textContent = "✅ تم النسخ";
        setTimeout(() => {
            copyCodeBtn.classList.remove("copied");
            copyCodeBtn.querySelector(".btn-text").textContent = "📋 نسخ الكود";
        }, 1400);
        }

        // =====================
        // UI Render
        // =====================
        function displayStudentCard(data) {
        // الاسم
        const fullNameEl = document.getElementById('fullName');
        if (fullNameEl) fullNameEl.textContent = data.fullName || '---';

        // ✅ عرض كود التلميذ بدل QR
        const code = String(data.studentCode || "").trim();
        if (!code) {
            showError('كود غير متوفر', 'الخادم لم يرجّع studentCode.');
            return;
        }
        currentStudentCode = code;
        if (studentCodeText) studentCodeText.textContent = code;

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
        if (attendInput) attendInput.value = code;
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
        function showAttendMsg(type, text) {
        if (!attendMsg) return;
        attendMsg.style.display = "block";
        attendMsg.classList.remove("ok", "bad");
        attendMsg.classList.add(type === "ok" ? "ok" : "bad");
        attendMsg.textContent = text;
        }

        function setAttendLoading(isLoading) {
        if (!attendBtn) return;
        attendBtn.disabled = isLoading;
        const t = attendBtn.querySelector(".btn-text");
        if (t) t.textContent = isLoading ? "⏳ جاري التسجيل..." : "✅ تسجيل الحصة";
        }

        async function attendByCode(studentCode) {
        const res = await fetch(`${WORKER_BASE}/attend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentCode })
        });
        const data = await res.json().catch(() => ({}));
        return { res, data };
        }
        // =====================
        // Events
        // =====================
        if (copyCodeBtn) {
        copyCodeBtn.addEventListener("click", async () => {
            try {
            await copyText(currentStudentCode);
            setCopyBtnStateCopied();
            } catch (e) {
            alert(e?.message || "فشل النسخ");
            }
        });
        }
        if (attendBtn) {
        attendBtn.addEventListener("click", async () => {
            try {
            const v = String(attendInput?.value || "").trim().toUpperCase();
            if (!v) {
                showAttendMsg("bad", "❌ ضع الكود أولاً");
                return;
            }

            setAttendLoading(true);
            const { res, data } = await attendByCode(v);

            if (!res.ok || !data.ok) {
                showAttendMsg("bad", "❌ " + (data.error || "فشل تسجيل الحصة"));
                return;
            }

            // ✅ حدّث statsBox مباشرة
            showAttendMsg("ok", "✅ تم تسجيل الحصة بنجاح");

            const statsBox = document.getElementById('statsBox');
            if (statsBox) {
                const sessionsText = String(data.sessionsInCycle ?? "—");
                const lastText = formatLastAttendance(data.lastAttendanceAt || "");
                statsBox.innerHTML = `
                <div style="font-weight:800; font-size:16px; margin-bottom:6px;">
                    ✅ عدد الحصص: <b>${sessionsText}</b>
                </div>
                <div style="font-size:14px; opacity:.9;">
                    🕒 آخر حصة: <b>${lastText}</b>
                </div>
                `;
            }

            // (اختياري) خزّن آخر رد في الكاش
            // لو حبيت: نقدر نعاود نجلب /student باش تتزامن كل القيم

            } catch (e) {
            showAttendMsg("bad", "❌ تعذر الاتصال بالخادم");
            } finally {
            setAttendLoading(false);
            }
        });
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