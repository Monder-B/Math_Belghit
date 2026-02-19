    // install.js - PWA Install Button (Stable + Clean)

    let deferredPrompt = null;
    let installButton = null;

    // ✅ Detect if already installed (PWA)
    function isAppInstalled() {
    // Android/Chrome
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    // iOS Safari
    if (window.navigator && window.navigator.standalone) return true;
    return false;
    }

    function findHostContainer() {
    return document.querySelector(".card-actions") || document.querySelector(".form-footer") || null;
    }

    function createInstallButton() {
    if (installButton) return;

    const host = findHostContainer();
    if (!host) return;

    installButton = document.createElement("button");
    installButton.type = "button";
    installButton.className = "action-btn primary install-btn";
    installButton.innerHTML = '<span class="btn-text">📲 تثبيت التطبيق</span>';
    installButton.style.display = "none";
    installButton.style.marginTop = "15px";

    installButton.addEventListener("click", handleInstallClick);

    // card-actions: append. footer: insert first
    if (host.classList.contains("card-actions")) host.appendChild(installButton);
    else host.insertBefore(installButton, host.firstChild);
    }

    function showInstallButton() {
    if (!installButton) createInstallButton();
    if (!installButton) return;

    // ✅ لا تُظهر إذا التطبيق مثبّت
    if (isAppInstalled()) {
        installButton.style.display = "none";
        return;
    }

    // ✅ لا تُظهر إذا ما عندناش prompt جاهز
    if (!deferredPrompt) {
        installButton.style.display = "none";
        return;
    }

    installButton.disabled = false;
    installButton.innerHTML = '<span class="btn-text">📲 تثبيت التطبيق</span>';
    installButton.style.display = "block";
    }

    function hideInstallButton() {
    if (installButton) installButton.style.display = "none";
    }

    // ✅ beforeinstallprompt (Chrome/Edge/Android)
    window.addEventListener("beforeinstallprompt", (e) => {
    // منع البانر الافتراضي
    e.preventDefault();

    deferredPrompt = e;

    // زر التثبيت
    showInstallButton();
    });

    // ✅ click handler
    async function handleInstallClick() {
    try {
        if (!deferredPrompt) return;

        installButton.disabled = true;
        installButton.innerHTML = '<span class="btn-text">جارٍ التثبيت...</span>';

        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;

        // امسح الحدث بعد الاستعمال
        deferredPrompt = null;

        if (choice && choice.outcome === "accepted") {
        installButton.innerHTML = '<span class="btn-text">✓ تم التثبيت</span>';
        setTimeout(() => hideInstallButton(), 1200);
        } else {
        // رفض
        installButton.disabled = false;
        installButton.innerHTML = '<span class="btn-text">📲 تثبيت التطبيق</span>';
        }
    } catch (err) {
        console.warn("[Install] error:", err);
        if (installButton) {
        installButton.disabled = false;
        installButton.innerHTML = '<span class="btn-text">📲 تثبيت التطبيق</span>';
        }
    }
    }

    // ✅ appinstalled
    window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    hideInstallButton();
    });

    // ✅ DOM ready
    window.addEventListener("DOMContentLoaded", () => {
    createInstallButton();

    // إذا التطبيق مثبت أصلاً، اخفيه
    if (isAppInstalled()) hideInstallButton();
    });

    // (اختياري) واجهة بسيطة
    window.installPWA = {
    show: showInstallButton,
    hide: hideInstallButton,
    };