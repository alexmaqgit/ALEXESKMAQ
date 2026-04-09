document.addEventListener('DOMContentLoaded', function () {
    // ========== دالة الحصول على CSRF token ==========
    function getCSRFToken() {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, 10) === 'csrftoken=') {
                    cookieValue = decodeURIComponent(cookie.substring(10));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // ========== عناصر DOM ==========
    const doctorSelect = document.getElementById('doctorSelect');
    const doctorInfo = document.getElementById('doctorInfo');
    const daySelectorContainer = document.getElementById('daySelectorContainer');
    const daySelect = document.getElementById('daySelect');
    const periodsContainer = document.getElementById('periodsContainer');
    const periodsList = document.getElementById('periodsList');
    const selectedDayTitle = document.getElementById('selectedDayTitle');
    const saveBtn = document.getElementById('saveBtn');

    // ========== البيانات ==========
    const days = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const dayNames = {
        'SATURDAY': 'السبت',
        'SUNDAY': 'الأحد',
        'MONDAY': 'الاثنين',
        'TUESDAY': 'الثلاثاء',
        'WEDNESDAY': 'الأربعاء',
        'THURSDAY': 'الخميس',
        'FRIDAY': 'الجمعة'
    };

    let currentDoctorId = null;
    let periodsState = {};     // { 'SATURDAY': ['1','3'], 'SUNDAY': ['2'], ... }
    let allPeriodsData = {};   // تخزين بيانات الفترات لكل يوم (لإعادة بناء العرض عند تغيير اليوم)

    // ========== دالة تحميل الفترات لليوم المختار ==========
    async function loadPeriodsForDay(day) {
        if (!currentDoctorId) return;

        // إذا لم تكن بيانات هذا اليوم محملة مسبقاً، نجلبها من API
        if (!allPeriodsData[day]) {
            try {
                const res = await fetch(`/get_visit_periods/?day=${day}`);
                const data = await res.json();
                allPeriodsData[day] = data.periods;
            } catch (err) {
                console.error('Error loading periods:', err);
                return;
            }
        }

        const periods = allPeriodsData[day];
        const selectedPeriods = periodsState[day] || [];

        periodsList.innerHTML = '';
        selectedDayTitle.textContent = dayNames[day];

        periods.forEach(p => {
            const periodNumber = p.PERIOD_NUMBER.toString();
            const isChecked = selectedPeriods.includes(periodNumber);

            const card = document.createElement('div');
            card.classList.add('period-card');

            const timeSpan = document.createElement('span');
            timeSpan.classList.add('period-time');
            timeSpan.textContent = `${p.START_TIME} - ${p.END_TIME}`;

            const statusSpan = document.createElement('span');
            statusSpan.classList.add('period-status');
            if (isChecked) {
                statusSpan.classList.add('checked');
                statusSpan.textContent = '✅';
            } else {
                statusSpan.classList.add('unchecked');
                statusSpan.textContent = '❌';
            }

            card.appendChild(timeSpan);
            card.appendChild(statusSpan);

            // حدث النقر على البطاقة (تغيير الحالة)
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                // تحديث حالة الفترة في periodsState
                const currentSelected = periodsState[day] || [];
                let newSelected;
                if (statusSpan.classList.contains('checked')) {
                    // إزالة
                    newSelected = currentSelected.filter(num => num !== periodNumber);
                    statusSpan.classList.remove('checked');
                    statusSpan.classList.add('unchecked');
                    statusSpan.textContent = '❌';
                } else {
                    // إضافة
                    newSelected = [...currentSelected, periodNumber];
                    statusSpan.classList.remove('unchecked');
                    statusSpan.classList.add('checked');
                    statusSpan.textContent = '✅';
                }
                periodsState[day] = newSelected;
            });

            periodsList.appendChild(card);
        });

        periodsContainer.style.display = 'block';
    }

    // ========== تحميل بيانات الطبيب بعد اختياره ==========
    async function loadDoctorData(doctor_id) {
        // إعادة تهيئة
        doctorInfo.style.display = 'none';
        doctorInfo.innerHTML = '';
        daySelectorContainer.style.display = 'none';
        periodsContainer.style.display = 'none';
        saveBtn.style.display = 'none';
        periodsState = {};
        allPeriodsData = {};
        currentDoctorId = null;

        if (!doctor_id) return;

        try {
            const res = await fetch(`/get_doctor_details_time/?doctor_id=${doctor_id}`);
            const data = await res.json();

            if (!data.doctor) {
                doctorInfo.innerHTML = '<p>لا توجد بيانات لهذا الدكتور</p>';
                doctorInfo.style.display = 'block';
                return;
            }

            const doc = data.doctor;
            doctorInfo.innerHTML = `
                <table class="doctor-info-table">
                    <tr><td>الاسم:</td><td>${doc.DOCTOR_NAME || '-'}</td></tr>
                    <tr><td>الرقم:</td><td>${doc.DOCTOR_ID || '-'}</td></tr>
                   
                </table>
            `;
            doctorInfo.style.display = 'block';

            // بناء periodsState من البيانات المحفوظة (schedule)
            for (const day of days) {
                const selected = data.schedule[day] && data.schedule[day] !== ''
                    ? data.schedule[day].split('-').map(x => x.toString())
                    : [];
                periodsState[day] = selected;
            }

            currentDoctorId = doctor_id;

            // إظهار اختيار اليوم وتحميل اليوم الافتراضي (السبت)
            daySelectorContainer.style.display = 'block';
            await loadPeriodsForDay(daySelect.value);
            saveBtn.style.display = 'inline-block';
        } catch (err) {
            console.error('Error loading doctor details:', err);
        }
    }

    // ========== حدث اختيار الطبيب ==========
    doctorSelect.addEventListener('change', async function () {
        await loadDoctorData(this.value);
    });

    // ========== حدث تغيير اليوم ==========
    daySelect.addEventListener('change', async function () {
        if (currentDoctorId) {
            await loadPeriodsForDay(this.value);
        }
    });

    // ========== حدث حفظ الفترات ==========
    saveBtn.addEventListener('click', async function () {
        if (!currentDoctorId) return;

        saveBtn.disabled = true;
        const originalText = saveBtn.innerText;
        saveBtn.innerText = 'جاري الحفظ...';

        const formData = new FormData();
        formData.append('doctor_id', currentDoctorId);

        // إضافة الفترات لكل يوم من periodsState
        for (const day of days) {
            const selected = periodsState[day] || [];
            formData.append(day, selected.join('-'));
        }

        try {
            const response = await fetch('/save_doctor_time/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                },
                body: formData,
            });
            const data = await response.json();
            if (data.success) {
                alert('✅ تم حفظ التعديلات بنجاح!');
                // إعادة تحميل بيانات الطبيب لضمان تطابق الواجهة
                await loadDoctorData(currentDoctorId);
            } else {
                alert('❌ فشل الحفظ: ' + (data.error || 'خطأ غير معروف'));
            }
        } catch (err) {
            console.error('Error saving doctor time:', err);
            alert('حدث خطأ أثناء الحفظ، راجع وحدة التحكم');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerText = originalText;
        }
    });
});