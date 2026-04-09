document.addEventListener('DOMContentLoaded', async function () {
    // ======================
    // متغيرات عالمية
    // ======================
    let currentPatient = null;
    let labExamsMap = {};
    let servicesMap = {};
    let dentalTreatments = [];
    let selectedDrugs = new Map(); // id -> true/false

    // ======================
    // عناصر DOM
    // ======================
    const searchBtn = document.getElementById('searchBtn');
    const showAddProcedureBtn = document.getElementById('showAddProcedureBtn');
    const newDate = document.getElementById('newDate');
    const addProcedureForm = document.getElementById('addProcedureForm');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const searchInput = document.getElementById('drugSearch');
    const resultsDiv = document.getElementById('drugResults');
    const saveBtn = document.getElementById('saveBtn');
    const patientIdInput = document.getElementById('patientIdInput');
    const doctorIdInput = document.getElementById('doctorIdInput');
    const visitNumberInput = document.getElementById('visitNumberInput');
    const fetchPatientDrugsBtn = document.getElementById('fetchPatientDrugsBtn');
    const patientDrugsResults = document.getElementById('patientDrugsResults');
    const toggleBtn = document.getElementById('themeToggle');

    // ======================
    // أحداث
    // ======================
    searchBtn.addEventListener('click', searchPatient);
    showAddProcedureBtn.addEventListener('click', toggleForm);
    newDate.addEventListener('change', loadAvailablePeriods);
    addProcedureForm.addEventListener('submit', addVisit);
    saveEditBtn.addEventListener('click', saveEdit);

    searchInput.addEventListener('input', searchDrugs);
    fetchPatientDrugsBtn.addEventListener('click', fetchPatientDrugs);
    saveBtn.addEventListener('click', savePatientDrugs);
    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        toggleBtn.textContent = document.body.classList.contains('light-mode') ? '☀️' : '🌙';
    });

    // ======================
    // تحميل البيانات الأولية
    // ======================
    await Promise.all([loadServices(), loadLabExams()]);
    await loadDentalTreatments();

    // ======================
    // دوال تحميل الخدمات والفحوصات
    // ======================
    function loadServices() {
        return fetch('/get_services_for_select/')
            .then(res => res.json())
            .then(data => {
                const container = document.getElementById('procedureContainer');
                container.innerHTML = '';
                if (!data.success) return;
                servicesMap = {};
                data.services.forEach(service => {
                    servicesMap[String(service.id).trim()] = service.name;
                    const label = document.createElement('label');
                    label.innerHTML = `<input type="checkbox" name="procedures" value="${String(service.id).trim()}"> <span>${service.name}</span>`;
                    container.appendChild(label);
                });
            });
    }

    function loadLabExams() {
        return fetch('/get_lab_exams/')
            .then(res => res.json())
            .then(data => {
                const container = document.getElementById('labExamsContainer');
                container.innerHTML = '';
                if (!data.success) return;
                labExamsMap = {};
                data.exams.forEach(exam => {
                    labExamsMap[String(exam.id).trim()] = exam.exam_name;
                    const label = document.createElement('label');
                    label.innerHTML = `<input type="checkbox" name="labExams" value="${String(exam.id).trim()}"> <span>${exam.exam_name}</span>`;
                    container.appendChild(label);
                });
            });
    }

    async function loadDentalTreatments() {
        try {
            const res = await fetch('/get_dental_treatments/');
            const data = await res.json();
            dentalTreatments = data.map(d => ({
                id: d.id,
                name: d.name,
                instructions: d.instructions || '',
            }));
        } catch (err) {
            console.error(err);
        }
    }

    // ======================
    // البحث عن المريض
    // ======================
    function searchPatient() {
        const patientId = document.getElementById('searchInput').value.trim();
        if (!patientId) return alert('أدخل رقم المريض!');
        fetch(`/get_patient_visits/?q=${patientId}`)
            .then(res => res.json())
            .then(data => {
                const table = document.getElementById('treatmentTable');
                const infoDiv = document.getElementById('patientInfo');
                table.style.display = 'none';
                table.innerHTML = `<tr>
                    <th>ملاحظات</th><th>الفحوصات</th><th>الاجراءات</th>
                    <th>العلاجات</th><th>التاريخ</th><th>الفترة</th>
                    <th>مدفوعات</th>
                    <th>تعديل</th>
                </tr>`;

                if (!data.success || data.visits.length === 0) {
                    alert('لا توجد جلسات للمريض!');
                    infoDiv.style.display = 'none';
                    return;
                }

                currentPatient = data.patient_id;
                const Patientname = data.patient_name;
                infoDiv.style.display = 'block';
                infoDiv.innerHTML = `<div class="patient-info-box">
                    رقم المريض: <span class="patient-id">${currentPatient}</span>
                    &nbsp; | &nbsp;
                    اسم المريض: <span class="patient-name">${Patientname}</span>
                </div>`;

                table.style.display = 'table';
                data.visits.forEach(item => insertVisitRow(item, table));
                showAddProcedureBtn.style.display = 'block';
            });
    }

    function insertVisitRow(item, table) {
        const row = table.insertRow();
        row.dataset.visitNumber = item.visit_number || 1;
        row.dataset.doctorId = item.doctor_id || 1;

        row.insertCell().innerText = item.note || '';
        row.insertCell().innerText = item.exams || '';
        row.insertCell().innerText = item.treatment || '';
        row.insertCell().innerText = item.medcen || '';
        row.insertCell().innerText = item.visit_date ? item.visit_date.split(' ')[0] : '';
        row.insertCell().innerText = item.period_no || '';

        // المدفوعات
        const payCell = row.insertCell();
        const payBtn = document.createElement('button');
        payBtn.innerText = 'تحقق الدفع';
        payBtn.onclick = () => checkPayment(row, payBtn);
        payCell.appendChild(payBtn);

        // تعديل
        const editCell = row.insertCell();
        const editBtn = document.createElement('button');
        editBtn.innerText = 'تعديل';
        editBtn.onclick = () => editVisitForm(item);
        editCell.appendChild(editBtn);
    }

    // ======================
    // التحقق من الدفع
    // ======================
    function checkPayment(row, button) {
        const table = document.getElementById('treatmentTable');
        const visitNumber = row.dataset.visitNumber || 1;
        const nextRow = row.nextElementSibling;

        if (nextRow && nextRow.classList.contains('payment-row')) {
            nextRow.remove();
            button.textContent = 'تحقق الدفع';
            return;
        }

        table.querySelectorAll('.payment-row').forEach(r => r.remove());

        fetch('/doctor_payment_api/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visit_num: visitNumber, doctor_num: 1 }),
        })
            .then(res => res.json())
            .then(data => {
                const payments = data.select?.INV_2601 || [];
                if (payments.length === 0) {
                    alert('لا توجد مدفوعات لهذه الزيارة');
                    return;
                }

                const payRow = table.insertRow(row.rowIndex + 1);
                payRow.classList.add('payment-row');
                const cell = payRow.insertCell(0);
                cell.colSpan = 9;

                let html = '<div style="text-align: left;"><strong>المدفوعات:</strong><br>';
                payments.forEach(item => {
                    html += `- ${item.ITEM_NAME}<br>`;
                });
                html += '</div>';

                cell.innerHTML = html;
                payRow.style.height = '0px';
                payRow.style.overflow = 'hidden';
                payRow.style.opacity = '0';
                payRow.style.transition = 'all 0.3s ease';

                requestAnimationFrame(() => {
                    payRow.style.height = payRow.scrollHeight + 'px';
                    payRow.style.opacity = '1';
                });
                setTimeout(() => (payRow.style.height = ''), 350);

                button.textContent = 'إخفاء المدفوعات';
            });
    }

    // ======================
    // إضافة زيارة
    // ======================
    function addVisit(e) {
        e.preventDefault();
        if (!currentPatient) return alert('ابحث عن المريض أولاً!');
        const selectedProcedures = Array.from(
            document.querySelectorAll('input[name="procedures"]:checked')
        ).map(cb => cb.value);
        if (selectedProcedures.length === 0) return alert('اختر إجراء واحد على الأقل!');
        const selectedLabExams = Array.from(
            document.querySelectorAll('input[name="labExams"]:checked')
        ).map(cb => cb.value);

        const payload = {
            treatment: selectedProcedures.join(','),
            exams: selectedLabExams.join(','),
            note: document.getElementById('newNote').value,
            visit_date: document.getElementById('newDate').value,
            timeSlot: document.getElementById('newTimeSlot').value,
        };

        fetch(`/add_patient_visit/${currentPatient}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                searchPatient();
                addProcedureForm.reset();
                toggleForm();
            });
    }

    // ======================
    // تعديل زيارة
    // ======================
    function editVisitForm(item) {
        if (!addProcedureForm.classList.contains('show')) addProcedureForm.classList.add('show');
        addProcedureForm.reset();

        // تعبئة فورم إضافة/تعديل الزيارة
        document.getElementById('newDate').value = item.visit_date
            ? item.visit_date.split(' ')[0]
            : '';
        document.getElementById('newDate').disabled = true;
        document.getElementById('newTimeSlot').innerHTML =
            `<option value="${item.period_no}">${item.period_no}</option>`;
        document.getElementById('newTimeSlot').disabled = true;
        document.getElementById('newNote').value = item.note || '';
        document.getElementById('visitNumber').value = item.visit_number;
        document.getElementById('doctorId').value = item.doctor_id || 1;

        // تعبئة الإجراءات
        let treatmentsFromDB = item.treatment
            ? item.treatment
                  .split(',')
                  .map(t => t.trim())
                  .filter(t => t !== '')
            : [];
        document.querySelectorAll('input[name="procedures"]').forEach(cb => {
            const serviceName = servicesMap[String(cb.value).trim()];
            cb.checked = treatmentsFromDB.includes(serviceName);
        });

        // تعبئة الفحوصات
        let examsFromDB = item.exams
            ? item.exams
                  .split(',')
                  .map(e => e.trim())
                  .filter(e => e !== '')
            : [];
        document.querySelectorAll('input[name="labExams"]').forEach(cb => {
            const examName = labExamsMap[String(cb.value).trim()];
            cb.checked = examsFromDB.includes(examName);
        });

        // إظهار زر الحفظ للتحديث
        saveEditBtn.style.display = 'inline-block';
        addProcedureForm.querySelector('button[type="submit"]').style.display = 'none';

        // ======================================
        // نقل أرقام المريض، الدكتور، والزيارة إلى فورم أدوية المريض
        // ======================================
        document.getElementById('patientIdInput').value = currentPatient; // رقم المريض الحالي
        document.getElementById('doctorIdInput').value = item.doctor_id || 1;
        document.getElementById('visitNumberInput').value = item.visit_number;

        // جلب أدوية المريض تلقائيًا بعد تعبئة الحقول
        fetchPatientDrugsBtn.click();
    }
    function saveEdit() {
        const visitNumber = document.getElementById('visitNumber').value;
        const doctorId = document.getElementById('doctorId').value;
        const selectedProcedures = Array.from(
            document.querySelectorAll('input[name="procedures"]:checked')
        ).map(cb => cb.value);
        const selectedLabExams = Array.from(
            document.querySelectorAll('input[name="labExams"]:checked')
        ).map(cb => cb.value);

        const payload = {
            treatment: selectedProcedures.join(','),
            exams: selectedLabExams.join(','),
            note: document.getElementById('newNote').value,
            visit_date: document.getElementById('newDate').value,
            visit_number: visitNumber,
            doctor_id: doctorId,
            period_no: document.getElementById('newTimeSlot').value,
        };

        fetch(`/update_patient_visit/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                searchPatient();
                addProcedureForm.reset();
                toggleForm();
                saveEditBtn.style.display = 'none';
                addProcedureForm.querySelector('button[type="submit"]').style.display =
                    'inline-block';
            });
    }

    function deleteVisit(visitNumber, doctorId) {
        if (!confirm('هل أنت متأكد من الحذف؟')) return;
        fetch(`/delete_patient_visit/${currentPatient}/${visitNumber}/${doctorId}/`, {
            method: 'POST',
        })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                searchPatient();
            });
    }

    function toggleForm() {
        addProcedureForm.classList.toggle('show');
    }

    function loadAvailablePeriods() {
        const visitDate = document.getElementById('newDate').value;
        const doctorId = 1;
        if (!visitDate) return;
        fetch(`/get_available_periods/?doctor_id=${doctorId}&visit_date=${visitDate}`)
            .then(res => res.json())
            .then(data => {
                const select = document.getElementById('newTimeSlot');
                select.innerHTML = '<option value="">اختر الفترة</option>';
                if (!data.success) return;
                if (data.periods.length === 0) {
                    alert('لا توجد فترات متاحة في هذا اليوم');
                    return;
                }
                data.periods.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p.period_no;
                    option.textContent = p.label;
                    select.appendChild(option);
                });
            });
    }

    // ======================
    // إدارة أدوية المريض
    // ======================
    function createDrugDiv(d, isChecked) {
        const div = document.createElement('div');
        div.className = 'drug-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = d.id;
        checkbox.checked = isChecked;
        checkbox.addEventListener('change', function () {
            selectedDrugs.set(d.id, this.checked);
            updateCheckboxInAllLists(d.id, this.checked);
        });

        const label = document.createElement('label');
        label.textContent = d.name;
        const instructionsDiv = document.createElement('div');
        instructionsDiv.textContent = d.instructions;
        instructionsDiv.className = 'instructions';

        div.appendChild(checkbox);
        div.appendChild(label);
        div.appendChild(instructionsDiv);
        return div;
    }

    function updateCheckboxInAllLists(id, checked) {
        document
            .querySelectorAll(`input[type="checkbox"][value="${id}"]`)
            .forEach(cb => (cb.checked = checked));
    }

    function searchDrugs() {
        const query = searchInput.value.toLowerCase();
        resultsDiv.innerHTML = '';
        dentalTreatments
            .filter(d => d.name.toLowerCase().includes(query))
            .forEach(d => {
                const isChecked = selectedDrugs.get(d.id) || false;
                const div = createDrugDiv(d, isChecked);
                resultsDiv.appendChild(div);
            });
    }

    function fetchPatientDrugs() {
        const patientId = patientIdInput.value;
        const doctorId = doctorIdInput.value;
        const visitNumber = visitNumberInput.value;
        patientDrugsResults.innerHTML = '';

        fetch(
            `/get_patient_treatments/?patient_id=${patientId}&doctor_id=${doctorId}&visit_number=${visitNumber}`
        )
            .then(res => res.json())
            .then(data => {
                data.forEach(d => {
                    selectedDrugs.set(d.id, true);
                    const div = createDrugDiv(d, true);
                    patientDrugsResults.appendChild(div);
                });
            })
            .catch(err => console.error(err));
    }

    function savePatientDrugs() {
        const patientId = patientIdInput.value;
        const doctorId = doctorIdInput.value;
        const visitNumber = visitNumberInput.value;

        if (!patientId || !doctorId || !visitNumber)
            return alert('ادخل رقم المريض، رقم الدكتور، ورقم الزيارة');

        const toAdd = [];
        const toRemove = [];
        selectedDrugs.forEach((checked, id) => {
            if (checked) toAdd.push(id);
            else toRemove.push(id);
        });

        fetch('/save_patient_treatments/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify({
                patient_id: patientId,
                doctor_id: doctorId,
                visit_number: visitNumber,
                add_codes: toAdd,
                remove_codes: toRemove,
            }),
        })
            .then(res => res.json())
            .then(data => {
                alert(data.message || 'تم الحفظ بنجاح');
                selectedDrugs.clear();
                patientDrugsResults.innerHTML = '';
                resultsDiv.innerHTML = '';
                searchInput.value = '';
                fetchPatientDrugsBtn.click();
            })
            .catch(err => console.error(err));
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            document.cookie.split(';').forEach(cookie => {
                const c = cookie.trim();
                if (c.startsWith(name + '='))
                    cookieValue = decodeURIComponent(c.substring(name.length + 1));
            });
        }
        return cookieValue;
    }
});
