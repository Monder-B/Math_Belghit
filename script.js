// إنشاء خلفية الرموز الرياضية
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

// معالجة النموذج
const form = document.getElementById('registrationForm');
const submitBtn = document.getElementById('submitBtn');
const successMessage = document.getElementById('successMessage');

// دالة التحقق من الحقول
function validateField(field) {
    const value = field.value.trim();
    const errorElement = document.getElementById(field.id + 'Error');

    // إزالة الأخطاء السابقة
    field.classList.remove('error');
    errorElement.classList.remove('show');

    // 🔴 حالة رقم الهاتف
    if (field.id === 'phone') {

        const phonePattern = /^(0)(5|6|7)[0-9]{8}$/;

        // إذا فارغ
        if (!value) {
            field.classList.add('error');
            errorElement.textContent = "الرجاء إدخال رقم الهاتف";
            errorElement.classList.add('show');
            return false;
        }

        // إذا لا يطابق الباترن
        if (!phonePattern.test(value)) {
            field.classList.add('error');
            errorElement.textContent = "رقم الهاتف غير صحيح (يجب أن يبدأ بـ 05, 06, أو 07)";
            errorElement.classList.add('show');
            return false;
        }

        return true;
    }

    // 🔴 باقي الحقول المطلوبة
    if (field.hasAttribute('required') && !value) {
        field.classList.add('error');
        errorElement.classList.add('show');
        return false;
    }

    return true;
}


// إضافة مستمعين للحقول
const inputs = form.querySelectorAll('.form-input');
inputs.forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
        if (input.classList.contains('error')) {
            validateField(input);
        }
    });
});

// معالجة إرسال النموذج
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // التحقق من جميع الحقول
    let isValid = true;
    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });

    if (!isValid) {
        return;
    }

    // تعطيل الزر وإظهار المحمل
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    // جمع البيانات
    const formData = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        class: document.getElementById('class').value,
        phone: document.getElementById('phone').value.trim() || 'غير محدد'
    };

    try {
        // إرسال البيانات إلى الويب هوك
        const response = await fetch('https://long-mud-24f2.mmondeer346.workers.dev/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        // محاكاة وقت الإرسال (يمكن إزالتها في الإنتاج)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // إظهار رسالة النجاح
        form.style.display = 'none';
        successMessage.classList.add('show');

        // إعادة تعيين النموذج بعد 3 ثوان
        setTimeout(() => {
            form.reset();
            form.style.display = 'block';
            successMessage.classList.remove('show');
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }, 3000);

    } catch (error) {
        console.error('خطأ في الإرسال:', error);
        alert('حدث خطأ في الإرسال. الرجاء المحاولة مرة أخرى.');
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
});
