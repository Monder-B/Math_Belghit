    // معالجة زر تثبيت التطبيق كـ PWA

    let deferredPrompt = null;
    let installButton = null;

    // الاستماع لحدث beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[Install] beforeinstallprompt fired');
    
    // منع ظهور البانر الافتراضي
    e.preventDefault();
    
    // حفظ الحدث للاستخدام لاحقاً
    deferredPrompt = e;
    
    // إنشاء زر التثبيت إذا لم يكن موجوداً
    if (!installButton) {
        createInstallButton();
    }
    
    // إظهار زر التثبيت
    if (installButton) {
        installButton.style.display = 'block';
    }
    });

    // دالة إنشاء زر التثبيت
    function createInstallButton() {
    // البحث عن مكان مناسب لإضافة الزر
    const footer = document.querySelector('.form-footer');
    const cardActions = document.querySelector('.card-actions');
    
    if (!footer && !cardActions) {
        console.warn('[Install] No suitable location found for install button');
        return;
    }
    
    // إنشاء الزر
    installButton = document.createElement('button');
    installButton.className = 'action-btn primary install-btn';
    installButton.innerHTML = '<span class="btn-text">📲 تثبيت التطبيق</span>';
    installButton.style.display = 'none';
    installButton.style.marginTop = '15px';
    
    // إضافة معالج النقر
    installButton.addEventListener('click', handleInstallClick);
    
    // إضافة الزر في المكان المناسب
    if (cardActions) {
        cardActions.appendChild(installButton);
    } else if (footer) {
        footer.insertBefore(installButton, footer.firstChild);
    }
    }

    // معالجة النقر على زر التثبيت
    async function handleInstallClick() {
    if (!deferredPrompt) {
        console.warn('[Install] No deferred prompt available');
        return;
    }
    
    // تعطيل الزر مؤقتاً
    if (installButton) {
        installButton.disabled = true;
        installButton.innerHTML = '<span class="btn-text">جارٍ التثبيت...</span>';
    }
    
    // إظهار prompt التثبيت
    deferredPrompt.prompt();
    
    // انتظار اختيار المستخدم
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[Install] User choice:', outcome);
    
    if (outcome === 'accepted') {
        console.log('[Install] User accepted the install prompt');
        
        // تحديث الزر
        if (installButton) {
        installButton.innerHTML = '<span class="btn-text">✓ تم التثبيت</span>';
        
        // إخفاء الزر بعد 2 ثانية
        setTimeout(() => {
            if (installButton) {
            installButton.style.display = 'none';
            }
        }, 2000);
        }
    } else {
        console.log('[Install] User dismissed the install prompt');
        
        // إعادة تفعيل الزر
        if (installButton) {
        installButton.disabled = false;
        installButton.innerHTML = '<span class="btn-text">📲 تثبيت التطبيق</span>';
        }
    }
    
    // مسح الحدث المحفوظ
    deferredPrompt = null;
    }

    // الاستماع لحدث التثبيت الناجح
    window.addEventListener('appinstalled', () => {
    console.log('[Install] PWA was installed successfully');
    
    // إخفاء زر التثبيت
    if (installButton) {
        installButton.style.display = 'none';
    }
    
    // مسح الحدث المحفوظ
    deferredPrompt = null;
    
    // (اختياري) إظهار رسالة شكر
    // يمكنك إضافة إشعار أو رسالة هنا
    });

    // محاولة إنشاء الزر عند تحميل الصفحة (في حالة عدم إطلاق beforeinstallprompt بعد)
    window.addEventListener('DOMContentLoaded', () => {
    // الانتظار قليلاً للتأكد من تحميل DOM بالكامل
    setTimeout(() => {
        if (!installButton) {
        createInstallButton();
        }
    }, 1000);
    });

    // تصدير الدوال للاستخدام في أماكن أخرى (اختياري)
    window.installPWA = {
    createButton: createInstallButton,
    handleInstall: handleInstallClick
    };