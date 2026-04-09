console.log('💡 servprac.js loaded (نسخة مطورة)');

let services = [];

window.onload = function () {
    console.log('💡 window.onload triggered');
    loadServices();

    const form = document.getElementById('serviceForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
};

function loadServices() {
    console.log('💡 loadServices called');
    fetch('/clinic/services/')
        .then(res => res.json())
        .then(data => {
            console.log('💡 get_services response: ', data);
            if (data.success) {
                services = data.services;
                renderTable();
            } else {
                alert('خطأ في جلب الخدمات: ' + data.error);
            }
        })
        .catch(err => console.error('Fetch error:', err));
}

function handleFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('serviceName').value.trim();
    const price = parseFloat(document.getElementById('servicePrice').value);
    const clinic = document.getElementById('clinicNumber').value.trim();
    const editId = this.getAttribute('data-edit-id');

    if (!name || isNaN(price) || !clinic) {
        alert('يرجى ملء جميع الحقول بشكل صحيح');
        return;
    }

    let payload;
    if (editId) {
        payload = {
            service_price_tab: [
                {
                    update: true,
                    set: { SERVICE_NAME: name, PRICE: price, CLINIC_NUMBER: clinic },
                    condition: `SERVICE_ID = ${parseInt(editId)}`,
                },
            ],
        };
        this.removeAttribute('data-edit-id');
        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.innerText = '➕ إضافة الخدمة';
    } else {
        payload = {
            service_price_tab: [
                {
                    insert: true,
                    set: { SERVICE_NAME: name, PRICE: price, CLINIC_NUMBER: clinic },
                },
            ],
        };
    }

    fetch('/clinic/services/manage/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                loadServices();
                this.reset();
            } else {
                alert('حدث خطأ: ' + res.error);
            }
        })
        .catch(err => console.error('Submit error:', err));
}

function renderTable() {
    const table = document.getElementById('servicesTable');
    if (!table) return;

    // بناء رأس الجدول
    table.innerHTML = `
        <thead>
            <tr>
                <th>رقم الخدمة</th>
                <th>الخدمة</th>
                <th>السعر (ريال)</th>
                <th>رقم العيادة</th>
                <th>تعديل</th>
                <th>حذف</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    services.forEach(s => {
        const row = tbody.insertRow();

        // إضافة الخلايا مع data-label للاستجابة
        const cellId = row.insertCell(0);
        cellId.innerText = s.SERVICE_ID;
        cellId.setAttribute('data-label', 'رقم الخدمة');

        const cellName = row.insertCell(1);
        cellName.innerText = s.SERVICE_NAME;
        cellName.setAttribute('data-label', 'الخدمة');

        const cellPrice = row.insertCell(2);
        cellPrice.innerText = s.PRICE;
        cellPrice.setAttribute('data-label', 'السعر (ريال)');

        const cellClinic = row.insertCell(3);
        cellClinic.innerText = s.CLINIC_NUMBER;
        cellClinic.setAttribute('data-label', 'رقم العيادة');

        // خلية التعديل
        const cellEdit = row.insertCell(4);
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';  // مطابق للـ CSS الجديد
        editBtn.innerText = 'تعديل';
        editBtn.onclick = () => editService(s.SERVICE_ID);
        cellEdit.appendChild(editBtn);
        cellEdit.setAttribute('data-label', 'تعديل');

        // خلية الحذف
        const cellDelete = row.insertCell(5);
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn'; // مطابق للـ CSS الجديد
        deleteBtn.innerText = 'حذف';
        deleteBtn.onclick = () => deleteService(s.SERVICE_ID);
        cellDelete.appendChild(deleteBtn);
        cellDelete.setAttribute('data-label', 'حذف');
    });
}

function editService(id) {
    const service = services.find(s => s.SERVICE_ID == id);
    if (!service) return;

    document.getElementById('serviceName').value = service.SERVICE_NAME;
    document.getElementById('servicePrice').value = service.PRICE;
    document.getElementById('clinicNumber').value = service.CLINIC_NUMBER;

    const form = document.getElementById('serviceForm');
    form.setAttribute('data-edit-id', id);
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.innerText = '✏️ تعديل الخدمة';
}

function deleteService(id) {
    if (confirm('هل تريد حذف هذه الخدمة؟')) {
        const payload = {
            service_price_tab: [
                { delete: true, condition: `SERVICE_ID = ${id}` }
            ]
        };
        fetch('/clinic/services/manage/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    services = services.filter(s => s.SERVICE_ID != id);
                    renderTable();
                } else {
                    alert('حدث خطأ: ' + res.error);
                }
            })
            .catch(err => console.error('Delete error:', err));
    }
}