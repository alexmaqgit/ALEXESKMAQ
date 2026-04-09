document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('doctorForm');
    const tableBody = document.getElementById('doctorTable').querySelector('tbody');
    const cancelBtn = document.getElementById('cancelEditBtn');

    if (!form || !tableBody || !cancelBtn) return;

    // =========================
    // رسالة مختصرة
    // =========================
    function showMessage(text, bg = 'green') {
        let box = document.getElementById('statusMessage');
        if (!box) {
            box = document.createElement('div');
            box.id = 'statusMessage';
            box.style.position = 'fixed';
            box.style.top = '12px';
            box.style.right = '12px';
            box.style.padding = '10px 14px';
            box.style.borderRadius = '8px';
            box.style.color = '#fff';
            box.style.zIndex = 9999;
            document.body.appendChild(box);
        }
        box.style.background = bg;
        box.textContent = text;
        box.style.display = 'block';
        clearTimeout(showMessage._t);
        showMessage._t = setTimeout(() => (box.style.display = 'none'), 2200);
    }

    // =========================
    // إخفاء / إظهار الحقول الحساسة
    // =========================
    function hideSensitive() {
        form.querySelectorAll('.sensitive').forEach(el => el.classList.add('hidden-by-js'));
        cancelBtn.style.display = 'inline-block';
    }
    function showSensitive() {
        form.querySelectorAll('.sensitive').forEach(el => el.classList.remove('hidden-by-js'));
        cancelBtn.style.display = 'none';
    }

    cancelBtn.classList.add('blinking');
    cancelBtn.addEventListener('click', function () {
        form.reset();
        delete form.dataset.editId;
        showSensitive();
        showMessage('🚫 تم إلغاء التعديل', 'gray');
    });

    // =========================
    // تفريغ الجدول
    // =========================
    function clearTable() {
        tableBody.innerHTML = '';
    }

    // =========================
    // إضافة صف إلى الجدول
    // =========================
    function addDoctorRow(d) {
        const row = tableBody.insertRow();
        row.insertCell(0).textContent = d.DOCTOR_NAME || '';
        row.insertCell(1).textContent = d.DOCTOR_ID || '';
        row.insertCell(2).textContent = d.SPECIALTY || '';
        row.insertCell(3).textContent = d.PHONE_NUMBER || '';
        row.insertCell(4).textContent = d.EMAIL || '';
        row.insertCell(5).textContent = d.USERNAME || '';
        row.insertCell(6).textContent = d.ADDRESS || '';

        const actionCell = row.insertCell(7);
        const editBtn = document.createElement('button');
        editBtn.textContent = 'تعديل';

        editBtn.addEventListener('click', () => {
            form.doctor_name.value = d.DOCTOR_NAME || '';
            form.doctor_id.value = d.DOCTOR_ID || '';
            form.specialty.value = d.SPECIALTY || '';
            form.phone.value = d.PHONE_NUMBER || '';
            form.email.value = d.EMAIL || '';
            form.username.value = d.USERNAME || '';
            form.password.value = d.PASSWORD || '';
            form.address.value = d.ADDRESS || '';

            hideSensitive();
            form.dataset.editId = d.DOCTOR_ID;
            showMessage(`✏️ تعديل الدكتور: ${d.DOCTOR_NAME}`, 'lightblue');
        });

        actionCell.appendChild(editBtn);
    }

    // =========================
    // تحميل الدكاترة من السيرفر
    // =========================
    async function loadDoctors() {
        try {
            const res = await fetch('/get_doctors/');
            const data = await res.json();
            clearTable();

            if (data && Array.isArray(data.doctors) && data.doctors.length) {
                data.doctors.forEach(addDoctorRow);
            } else {
                const row = tableBody.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 8;
                cell.textContent = 'لا توجد بيانات حالياً';
            }
        } catch (e) {
            console.error(e);
            showMessage('❌ خطأ في تحميل البيانات', 'red');
        }
    }

    // =========================
    // حفظ / تعديل دكتور
    // =========================
    form.addEventListener('submit', async function (ev) {
        ev.preventDefault();

        const payload = {
            doctor_name: form.doctor_name.value.trim(),
            doctor_id: form.doctor_id.value.trim(),
            specialty: form.specialty.value.trim(),
            phone: form.phone.value.trim(),
            email: form.email.value.trim(),
            username: form.username.value.trim(),
            password: form.password.value.trim(),
            address: form.address.value.trim(),
        };

        if (!payload.doctor_name) {
            showMessage('⚠️ يرجى تعبئة اسم الدكتور', 'orange');
            return;
        }

        try {
            const csrf = document.querySelector('[name=csrfmiddlewaretoken]').value;
            let url = '/add_doctor/';
            let successMsg = '✅ تم الحفظ بنجاح';

            if (form.dataset.editId) {
                url = `/update_doctor/${form.dataset.editId}/`;
                successMsg = '✅ تم التعديل بنجاح';
            }

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
                body: JSON.stringify(payload),
            });

            const r = await res.json();
            if (r && r.success) {
                showMessage(r.message || successMsg, 'green');
                form.reset();
                delete form.dataset.editId;
                showSensitive();
                loadDoctors();
            } else {
                showMessage(r.message || '❌ فشل العملية', 'red');
            }
        } catch (e) {
            console.error(e);
            showMessage('⚠️ خطأ أثناء الإرسال', 'red');
        }
    });

    // البداية
    loadDoctors();
});
