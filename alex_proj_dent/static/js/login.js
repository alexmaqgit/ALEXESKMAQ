// static/js/login.js

document.addEventListener('DOMContentLoaded', function () {
    // زر اظهار كلمة المرور
    const togglePass = document.getElementById('togglePass');
    const passwordInput = document.getElementById('password');

    if (togglePass) {
        togglePass.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                togglePass.textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                togglePass.textContent = '👁';
            }
        });
    }

    // عناصر التحقق من المستخدم
    const usernameInput = document.getElementById('username');
    const clindiv = document.getElementById('clinic_div');
    const clinselc = document.getElementById('clinic_select');

    function checkUser() {
        const username = usernameInput.value.trim();

        if (!username) {
            clindiv.style.display = 'none';
            if (clinselc) clinselc.removeAttribute('required');
            return;
        }

        fetch(`/check_user_type/?username=${encodeURIComponent(username)}`)
            .then(response => response.json())
            .then(data => {
                if (data.type === 'normal') {
                    clindiv.style.display = 'block';
                    clinselc.setAttribute('required', 'required');
                } else {
                    clindiv.style.display = 'none';
                    clinselc.removeAttribute('required');
                }
            })
            .catch(error => {
                console.error('خطأ أثناء التحقق من نوع المستخدم:', error);
                // في حالة الخطأ، نظهر اختيار العيادة كحل احتياطي
                clindiv.style.display = 'block';
                clinselc.setAttribute('required', 'required');
            });
    }

    // التحقق بعد الانتهاء من كتابة اليوزر
    usernameInput.addEventListener('blur', checkUser);
    
    // منع إرسال النموذج إذا كان فارغاً (تحسين إضافي)
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    let isSubmitting = false;
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!username || !password) {
                e.preventDefault();
                // عرض رسالة خطأ
                const errorDiv = document.createElement('div');
                errorDiv.className = 'alert alert-error';
                errorDiv.textContent = '❌ الرجاء إدخال اسم المستخدم وكلمة المرور';
                
                const existingAlert = document.querySelector('.alert');
                if (existingAlert) {
                    existingAlert.remove();
                }
                
                const loginCard = document.querySelector('.login-card');
                const form = document.getElementById('loginForm');
                loginCard.insertBefore(errorDiv, form);
                
                setTimeout(() => {
                    errorDiv.style.opacity = '0';
                    setTimeout(() => errorDiv.remove(), 300);
                }, 3000);
                
                return false;
            }
            
            // منع الإرسال المتكرر
            if (isSubmitting) {
                e.preventDefault();
                return false;
            }
            
            isSubmitting = true;
            loginBtn.disabled = true;
            loginBtn.textContent = 'جاري تسجيل الدخول...';
        });
    }
});