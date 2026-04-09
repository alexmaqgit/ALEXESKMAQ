document.addEventListener('DOMContentLoaded', function () {
    const today = new Date().toLocaleDateString('ar-EG');
    document.getElementById('todayDate').textContent = today;

    const clinicSelect = document.getElementById('clinicSelect');
    const searchSection = document.getElementById('searchSection');
    const searchBtn = document.getElementById('searchBtn');
    const payBtn = document.getElementById('payBtn');
    const tableBody = document.getElementById('invoiceTableBody');
    const grandTotalEl = document.getElementById('grandTotal');
    const upcomingVisitsBody = document.getElementById('upcomingVisitsBody');
    const doctorSelectContainer = document.getElementById('doctorSelectContainer');

    let invoiceItems = [];
    let upcomingVisits = [];
    let allDoctors = [];
    let selectedDoctorId = null;
    let selectedClinicId = null;
    let selectedClinicName = '';

    // تحميل العيادات
    function loadClinics() {
        fetch('/get_clinics/')
            .then(res => res.json())
            .then(data => {
                clinicSelect.innerHTML = '<option value="">-- اختر العيادة --</option>';
                if (data.success && data.clinics) {
                    data.clinics.forEach(clinic => {
                        const option = document.createElement('option');
                        option.value = clinic.id;
                        option.textContent = clinic.name;
                        clinicSelect.appendChild(option);
                    });
                }
            })
            .catch(() => {
                clinicSelect.innerHTML = '<option value="">خطأ في التحميل</option>';
            });
    }

    clinicSelect.addEventListener('change', () => {
        selectedClinicId = clinicSelect.value;
        selectedClinicName = clinicSelect.options[clinicSelect.selectedIndex]?.text || '';

        if (selectedClinicId) {
            searchSection.style.display = 'block';
            document.getElementById('invoiceContent').style.display = 'none';
        } else {
            searchSection.style.display = 'none';
        }
    });

    // البحث
    searchBtn.addEventListener('click', () => {
        const patientNo = document.getElementById('patientNumber').value.trim();

        if (!patientNo) return alert('⚠️ أدخل رقم المريض');
        if (!selectedClinicId) return alert('⚠️ اختر العيادة');

        fetch(`/get_payment_invoice?patient_no=${patientNo}&clinic_id=${selectedClinicId}`)
            .then(res => res.json())
            .then(data => {
                if (!data.success) return alert(data.message);

                document.getElementById('invoiceContent').style.display = 'block';
                document.getElementById('patientId').textContent = data.patient_no;
                document.getElementById('patientName').textContent = data.patient_name;
                document.getElementById('clinicNameDisplay').textContent = selectedClinicName;
                document.getElementById('doctorNameDisplay').textContent = 'اختر الدكتور';

                invoiceItems = data.items || [];
                upcomingVisits = data.upcoming_visits || [];

                const doctorMap = {};
                invoiceItems.concat(upcomingVisits).forEach(v => {
                    if (v.doctor_id)
                        doctorMap[v.doctor_id] = v.doctor_name || 'دكتور ' + v.doctor_id;
                });

                allDoctors = Object.keys(doctorMap).map(id => ({ id, name: doctorMap[id] }));

                renderDoctorSelect();
                renderInvoiceTable();
                renderUpcomingVisits();
            });
    });

    function renderDoctorSelect() {
        doctorSelectContainer.innerHTML = '';
        doctorSelectContainer.style.display = 'none';

        if (allDoctors.length <= 1) {
            selectedDoctorId = allDoctors.length ? allDoctors[0].id : null;
            return;
        }

        doctorSelectContainer.style.display = 'flex';

        const select = document.createElement('select');
        select.innerHTML = '<option value="">-- اختر الدكتور --</option>';

        allDoctors.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.name;
            select.appendChild(opt);
        });

        doctorSelectContainer.appendChild(select);

        select.addEventListener('change', () => {
            selectedDoctorId = select.value || null;
            renderInvoiceTable();
            renderUpcomingVisits();
        });
    }

    function renderInvoiceTable() {
        tableBody.innerHTML = '';

        const filtered = invoiceItems.filter(
            i => !selectedDoctorId || i.doctor_id == selectedDoctorId
        );

        if (!filtered.length) {
            tableBody.innerHTML = '<tr><td colspan="3">لا يوجد بيانات</td></tr>';
            grandTotalEl.textContent = '0';
            return;
        }

        filtered.forEach((item, idx) => {
            const tr = document.createElement('tr');

            const td1 = document.createElement('td');
            if (!item.paid) {
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.dataset.index = idx;
                cb.addEventListener('change', updateTotal);
                td1.appendChild(cb);
            } else {
                td1.innerHTML = '✓ مدفوع';
            }

            const td2 = document.createElement('td');
            td2.textContent = item.item_name;

            const td3 = document.createElement('td');
            td3.textContent = item.item_price;

            tr.append(td1, td2, td3);
            tableBody.appendChild(tr);
        });

        updateTotal();
    }

    function updateTotal() {
        let total = 0;
        tableBody.querySelectorAll('input[type=checkbox]').forEach(cb => {
            if (cb.checked) {
                const idx = cb.dataset.index;
                total += invoiceItems[idx].item_price;
            }
        });
        grandTotalEl.textContent = total;
    }

    function renderUpcomingVisits() {
        upcomingVisitsBody.innerHTML = '';

        const filtered = upcomingVisits.filter(
            v => !selectedDoctorId || v.doctor_id == selectedDoctorId
        );

        if (!filtered.length) {
            upcomingVisitsBody.innerHTML = '<tr><td colspan="4">لا توجد زيارات</td></tr>';
            return;
        }

        filtered.forEach(v => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${v.visit_number}</td>
                <td>${v.visit_date}</td>
                <td>${v.book_confirmation ? 'مؤكد' : 'غير مؤكد'}</td>
            `;
            upcomingVisitsBody.appendChild(tr);
        });
    }

    // الدفع
    payBtn.addEventListener('click', () => {
        const patientNo = document.getElementById('patientNumber').value.trim();
        if (!patientNo) return alert('⚠️ أدخل رقم المريض');

        const selectedItems = [];

        tableBody.querySelectorAll('input[type=checkbox]').forEach(cb => {
            if (cb.checked) {
                selectedItems.push(invoiceItems[cb.dataset.index]);
            }
        });

        if (!selectedItems.length)
            return alert('⚠️ اختر بند للدفع');

        // ✅ حل مشكلة firstVisit
        const hasFirstVisit = selectedItems.some(i => i.item_name === 'الزيارة الاولى');

        const firstVisit = upcomingVisits.find(
            v => v.book_confirmation == 0 &&
            (!selectedDoctorId || v.doctor_id == selectedDoctorId)
        );

        fetch(`/confirm_payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_no: patientNo,
                items: selectedItems,
                clinic_id: selectedClinicId,
            }),
        })
        .then(res => res.json())
        .then(data => {
            if (!data.success) return alert(data.message);

            // تحديث الدفع
            selectedItems.forEach(p => {
                invoiceItems.forEach(i => {
                    if (i === p) i.paid = true;
                });
            });

            renderInvoiceTable();

            // ✅ تأكيد زيارة تلقائي
            if (hasFirstVisit && firstVisit) {
                fetch(`/confirm_visit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        patient_no: patientNo,
                        visit_number: firstVisit.visit_number,
                        doctor_id: firstVisit.doctor_id,
                        clinic_id: selectedClinicId,
                    }),
                })
                .then(r => r.json())
                .then(() => {
                    upcomingVisits = upcomingVisits.filter(
                        v => v.visit_number != firstVisit.visit_number
                    );
                    renderUpcomingVisits();
                    alert('✅ تم الدفع وتأكيد الزيارة');
                });
            } else {
                alert('✅ تم الدفع بنجاح');
            }
        })
        .catch(() => alert('❌ خطأ في الدفع'));
    });

    loadClinics();
});