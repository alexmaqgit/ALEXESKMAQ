document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('clinform');
    const branchTableBody = document.getElementById('clintab').querySelector('tbody');
    const cancelBtn = document.getElementById('cancelEditBtn');

    if (!cancelBtn || !form) return;

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

    function clearTable() {
        branchTableBody.innerHTML = '';
    }

    function addBranchRow(b) {
        const row = branchTableBody.insertRow();
        row.insertCell(0).textContent = b.MANAGER_NAME || '';
        row.insertCell(1).textContent = b.CLINIC_NAME || '';
        row.insertCell(2).textContent = b.CLINIC_ID || '';
        row.insertCell(3).textContent = b.PHONE_NUMBER || '';
        row.insertCell(4).textContent = b.USERNAME || '';
        row.insertCell(5).textContent = b.EMAIL || '';
        row.insertCell(6).textContent = b.ADDRESS || '';

        const editCell = row.insertCell(7);
        const editBtn = document.createElement('button');
        editBtn.textContent = 'تعديل';
        editBtn.addEventListener('click', () => {
            form.first_p.value = b.MANAGER_NAME || '';
            form.phone_p.value = b.PHONE_NUMBER || '';
            form.user_p.value = b.USERNAME || '';
            form.passwordu_p.value = b.PASSWORD || '';
            form.joined_date_p.value = b.JOINED_DATE || '';
            form.clin_name_p.value = b.CLINIC_NAME || '';
            form.clin_code.value = b.CLINIC_ID || '';
            form.mang_e.value = b.EMAIL || '';
            form.address.value = b.ADDRESS || '';

            hideSensitive();
            form.dataset.editId = b.CLINIC_ID;
            showMessage(`✏️ تعديل العيادة: ${b.CLINIC_NAME}`, 'lightblue');
        });
        editCell.appendChild(editBtn);
    }

    async function loadBranches() {
        try {
            const res = await fetch('/get_clin/');
            const data = await res.json();
            clearTable();
            if (data && Array.isArray(data.users) && data.users.length) {
                data.users.forEach(addBranchRow);
            } else {
                const row = branchTableBody.insertRow();
                const cell = row.insertCell(0);
                cell.colSpan = 8;
                cell.textContent = 'لا توجد بيانات حالياً';
            }
        } catch (e) {
            console.error(e);
            showMessage('❌ خطأ في تحميل البيانات', 'red');
        }
    }

    form.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        const payload = {
            first_p: form.first_p.value.trim(),
            phone_p: form.phone_p.value.trim(),
            user_p: form.user_p.value.trim(),
            passwordu_p: form.passwordu_p.value.trim(),
            joined_date_p: form.joined_date_p.value.trim(),
            clin_name_p: form.clin_name_p.value.trim(),
            clin_code: form.clin_code.value.trim(),
            mang_e: form.mang_e.value.trim(),
            address: form.address.value.trim(),
        };

        if (!payload.first_p || !payload.phone_p || !payload.clin_name_p) {
            showMessage('⚠️ يرجى تعبئة الحقول الأساسية', 'orange');
            return;
        }

        try {
            const csrf = document.querySelector('[name=csrfmiddlewaretoken]').value;
            let url = '/add_clin/';
            let successMsg = '✅ تم الحفظ بنجاح';
            if (form.dataset.editId) {
                url = `/update_clin/${form.dataset.editId}/`;
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

                setTimeout(() => {
                    location.reload(); // 🔥 ريلود وخلاص
                }, 800);
            } else {
                showMessage(r.message || '❌ فشل العملية', 'red');
            }
        } catch (e) {
            console.error(e);
            showMessage('⚠️ خطأ أثناء الإرسال', 'red');
        }
    });

    // البداية
    loadBranches();
});
