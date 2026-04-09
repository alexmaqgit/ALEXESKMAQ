document.addEventListener('DOMContentLoaded', async function () {
    // ======================
    // متغيرات عالمية
    // ======================
    let currentPatient = null;
    let labExamsMap = {};
    let servicesMap = {};
    let dentalTreatments = [];
    let selectedDrugs = new Map();

    // ======================
    // عناصر DOM
    // ======================
    const searchInputp = document.getElementById('searchInput');
    const searchDropdown = document.getElementById('searchDropdown');
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
    // دوال التحميل
    // ======================
    async function loadServices() {
        try {
            const res = await fetch('/get_services_for_select/');
            const data = await res.json();
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
        } catch (err) {
            console.error(err);
        }
    }

    async function loadLabExams() {
        try {
            const res = await fetch('/get_lab_exams/');
            const data = await res.json();
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
        } catch (err) {
            console.error(err);
        }
    }

    async function loadDentalTreatments() {
        try {
            const res = await fetch('/get_dental_drg/');
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

    async function fetchPatients() {
        try {
            const res = await fetch('/get_doctor_patients/');
            const data = await res.json();

            // ✨ ضع doctor_id في الحقل المخفي
            if (data.doctor_id) {
                document.getElementById('doctorId').value = data.doctor_id;
            }

            return data.patients || [];
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    // ======================
    // دوال رئيسية
    // ======================
    function selectPatient(patient) {
        searchInputp.value = `${patient.id}`;
        searchDropdown.style.display = 'none';
        console.log('function selectPatient_patient.id=', patient.id);
        searchPatient(patient.id);
    }

    async function searchPatient(pati_no = currentPatient) {
        if (!pati_no) return alert('أدخل رقم المريض!');
        try {
            const res = await fetch(`/get_patient_visits/?q=${pati_no}`);
            const data = await res.json();
            const table = document.getElementById('treatmentTable');
            const infoDiv = document.getElementById('patientInfo');

            table.style.display = 'none';
            table.innerHTML = `<tr>
                <th>ملاحظات</th><th>الفحوصات</th><th>الاجراءات</th>
                <th>العلاجات</th><th>التاريخ</th><th>الفترة</th>
                <th>مدفوعات</th>
                <th>تعديل</th>
                </tr>`;

            if (!data.success || !data.visits || data.visits.length === 0) {
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
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            data.visits.sort((a, b) => {
                const dateA = new Date(a.visit_date.split(' ')[0]);
                const dateB = new Date(b.visit_date.split(' ')[0]);

                dateA.setHours(0, 0, 0, 0);
                dateB.setHours(0, 0, 0, 0);

                // 1️⃣ اليوم أولًا
                const isTodayA = dateA.getTime() === today.getTime();
                const isTodayB = dateB.getTime() === today.getTime();
                if (isTodayA && !isTodayB) return -1;
                if (!isTodayA && isTodayB) return 1;

                // 2️⃣ المستقبل بعد اليوم
                const isFutureA = dateA > today;
                const isFutureB = dateB > today;
                if (isFutureA && !isFutureB) return -1;
                if (!isFutureA && isFutureB) return 1;

                // 3️⃣ ترتيب داخل كل مجموعة
                if (isFutureA && isFutureB) {
                    return dateA - dateB; // المستقبل الأقرب أولًا
                }
                if (!isTodayA && !isFutureA && !isTodayB && !isFutureB) {
                    return dateB - dateA; // الماضي: الأحدث أولًا
                }

                return 0;
            });
            data.visits.forEach(item => insertVisitRow(item, table));
            showAddProcedureBtn.style.display = 'block';
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء جلب بيانات المريض');
        }
    }

    // ======================
    // إدراج صفوف الجلسات
    // ======================
    function insertVisitRow(item, table) {
        const row = table.insertRow();

        row.dataset.visitNumber = item.visit_number;
        row.dataset.doctorId = item.doctor_id;

        row.insertCell().innerText = item.note || '';
        row.insertCell().innerText = item.exams || '';
        //++++++++++++++++++++++121+++++++++++++++++++++++++++++
        //row.insertCell().innerText = item.treatment || '';
        let treatments = item.treatment || '';
        console.log("-=-===-=-=---=_+_++_+_++_+_+____+__+_+_+_+_+_+_+_",treatments)
        treatments = treatments
            .split(',')
            .map(t => t.trim())
            .filter(t => t !== '121' && t !== servicesMap['121']) // يخفي 121 سواء ID أو اسم
            .join(', ');

        row.insertCell().innerText = treatments;
        //++++++++++++++++++++++121+++++++++++++++++++++++++++++
        row.insertCell().innerText = item.medcen || '';
        row.insertCell().innerText = item.visit_date ? item.visit_date.split(' ')[0] : '';
        row.insertCell().innerText = item.period_no || '';

        // المدفوعات
        const payCell = row.insertCell();
        console.log('function insertVisitRow_', payCell);
        const payBtn = document.createElement('button');
        payBtn.innerText = 'تحقق الدفع';
        payBtn.onclick = () => checkPayment(row, payBtn);
        payCell.appendChild(payBtn);

        // التعديل
        const editCell = row.insertCell();
        const editBtn = document.createElement('button');
        editBtn.innerText = 'تعديل';

        const visitDate = item.visit_date ? new Date(item.visit_date.split(' ')[0]) : null;
        if (visitDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            visitDate.setHours(0, 0, 0, 0);

            const confirmed = Number(item.book_confirmation);
            if (visitDate < today) {
                row.style.backgroundColor = '';
                editBtn.style.display = 'none';
            } else if (visitDate.getTime() === today.getTime()) {
                row.style.backgroundColor = confirmed === 0 ? '#6200db' : '';
                editBtn.style.display = confirmed === 0 ? 'none' : 'inline-block';
            } else if (visitDate > today) {
                row.style.backgroundColor = confirmed === 0 ? 'rgba(255,193,7,0.25)' : '';
                editBtn.style.display = 'inline-block';
            }
        }

        editBtn.onclick = () => editVisitForm(item);
        editCell.appendChild(editBtn);
    }

    // ======================
    // البحث المنسدل
    // ======================
    searchInputp.addEventListener('input', async () => {
        const filter = searchInputp.value.trim();
        if (!filter) {
            searchDropdown.style.display = 'none';
            return;
        }
        const patients = await fetchPatients();
        searchDropdown.innerHTML = '';
        const filtered = patients.filter(
            p => String(p.id).includes(filter) || p.name.includes(filter)
        );
        filtered.forEach(p => {
            const div = document.createElement('div');
            div.textContent = `${p.id} - ${p.name}`;
            div.onclick = () => selectPatient(p);
            searchDropdown.appendChild(div);
        });
        searchDropdown.style.display = filtered.length ? 'block' : 'none';
    });

    // ======================
    // الأحداث الرئيسية
    // ======================
    searchBtn.addEventListener('click', () => searchPatient(searchInputp.value.trim()));
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

    showAddProcedureBtn.addEventListener('click', function () {
        document.getElementById('visitNumber').value = '';
        addProcedureForm.reset();
        toggleForm();
        selectedDrugs.clear();
        patientDrugsResults.innerHTML = '';
        resultsDiv.innerHTML = '';
        toggleSaveEditButton();
    });

    // ======================
    // تحميل البيانات الأولية
    // ======================
    await Promise.all([loadServices(), loadLabExams()]);
    await loadDentalTreatments();

    console.log('الصفحة جاهزة والبيانات محملة!');

    // ======================
    // التحقق من الدفع
    // ======================
    function checkPayment(row, button) {
        const table = document.getElementById('treatmentTable');
        const visitNumber = row.dataset.visitNumber;

        const nextRow = row.nextElementSibling;
        if (nextRow && nextRow.classList.contains('payment-row')) {
            nextRow.remove();
            button.textContent = 'تحقق الدفع';
            return;
        }

        // إزالة أي صفوف مدفوعات حالية
        table.querySelectorAll('.payment-row').forEach(r => r.remove());

        fetch('/doctor_payment_api/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visit_num: visitNumber }),
        })
            .then(res => res.json())
            .then(data => {
                // الآن نقرأ من data.select مباشرة
                const selectData = data.select || {};
                const dynamicKey = Object.keys(selectData)[0]; // INV_2602
                const payments = selectData[dynamicKey] || [];

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
                    html += `- ${item.ITEM_NAME} : ${item.ITEM_PRICE}<br>`;
                });
                html += '</div>';
                cell.innerHTML = html;

                // تأثير الانزلاق
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
            })
            .catch(err => console.error(err));
    } // ======================
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
                searchPatient(currentPatient);
                addProcedureForm.reset();
                toggleForm();
            });
    }
    //===============================================================
    function addVisit(e) {
        e.preventDefault();

        // التحقق من وجود مريض محدد
        if (!currentPatient) {
            alert('⚠️ الرجاء البحث عن المريض أولاً!');
            return;
        }

        // الحصول على الإجراءات المحددة
        const selectedProcedures = Array.from(
            document.querySelectorAll('input[name="procedures"]:checked')
        ).map(cb => cb.value);

        if (selectedProcedures.length === 0) {
            alert('⚠️ الرجاء اختيار إجراء واحد على الأقل!');
            return;
        }

        // الحصول على الفحوصات المحددة
        const selectedLabExams = Array.from(
            document.querySelectorAll('input[name="labExams"]:checked')
        ).map(cb => cb.value);

        // الحصول على التاريخ والفترة
        const visitDate = document.getElementById('newDate').value;
        const timeSlot = document.getElementById('newTimeSlot').value;
        const note = document.getElementById('newNote').value;

        // التحقق من صحة البيانات
        if (!visitDate) {
            alert('⚠️ الرجاء اختيار تاريخ الزيارة!');
            return;
        }

        if (!timeSlot) {
            alert('⚠️ الرجاء اختيار الفترة!');
            return;
        }

        // تجهيز البيانات للإرسال
        const payload = {
            treatment: selectedProcedures.join(','),
            exams: selectedLabExams.join(','),
            note: note,
            visit_date: visitDate,
            timeSlot: timeSlot,
        };

        // إظهار مؤشر تحميل
        const submitBtn = document.querySelector('#addProcedureForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '⏳ جاري الحفظ...';
        submitBtn.disabled = true;

        // إرسال البيانات
        fetch(`/add_patient_visit/${currentPatient}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'), // إضافة CSRF token للحماية
            },
            body: JSON.stringify(payload),
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error('حدث خطأ في الاتصال');
                }
                return res.json();
            })
            .then(data => {
                if (data.message) {
                    alert('✅ ' + data.message);
                } else if (data.error) {
                    alert('❌ ' + data.error);
                } else {
                    alert('✅ تم إضافة الزيارة بنجاح!');
                }

                // إعادة تعيين الفورم
                document.getElementById('addProcedureForm').reset();

                // تحديث قائمة الزيارات
                if (currentPatient) {
                    searchPatient(currentPatient);
                }

                // إغلاق الفورم
                toggleForm();
            })
            .catch(error => {
                console.error('Error:', error);
                alert('❌ حدث خطأ أثناء إضافة الزيارة: ' + error.message);
            })
            .finally(() => {
                // إعادة زر الحفظ لحالته الطبيعية
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
    }

    // دالة للحصول على CSRF token (لازم لحماية Django)
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === name + '=') {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    // ======================
    // تعديل زيارة
    // ======================
    function editVisitForm(item) {
        if (!addProcedureForm.classList.contains('show')) addProcedureForm.classList.add('show');
        addProcedureForm.reset();
        selectedDrugs.clear(); // يمسح الـ Map
        patientDrugsResults.innerHTML = ''; // يمسح عرض الأدوية القديمة

        // تعبئة فورم إضافة/تعديل الزيارة
        document.getElementById('newDate').value = item.visit_date
            ? item.visit_date.split(' ')[0]
            : '';
        document.getElementById('newDate').disabled = false;
        document.getElementById('newTimeSlot').innerHTML =
            `<option value="${item.period_no}">${item.period_no}</option>`;
        document.getElementById('newTimeSlot').disabled = false;
        document.getElementById('newNote').value = item.note || '';
        document.getElementById('visitNumber').value = item.visit_number;
        document.getElementById('doctorId').value = item.doctor_id;

        // تعبئة الإجراءات
        let treatmentsFromDB = item.treatment
            ? item.treatment
                  .split(',')
                  .map(t => t.trim())
                  .filter(t => t !== '')
            : [];
        //++++++++++++++++++++++++head_121====================

        //document.querySelectorAll('input[name="procedures"]').forEach(cb => {
        //const serviceName = servicesMap[String(cb.value).trim()];
        //cb.checked = treatmentsFromDB.includes(serviceName);
        //});
        document.querySelectorAll('input[name="procedures"]').forEach(cb => {
            const id = String(cb.value).trim();
            const serviceName = servicesMap[id];
            
            // 🔥 إخفاء الإجراء 121
            if (id === '121') {
                console.log("-=-===-=-=---=_+_++_+_++_+_+____+__+_+_+_+_+_+_+_",i)
                cb.checked = false;
                cb.closest('label').style.display = 'none';
                return;
            }

            cb.checked = treatmentsFromDB.includes(id) || treatmentsFromDB.includes(serviceName);
        });
        //++++++++++++++++++++++++++++++++++++++++++
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
        const patientIdInput = document.getElementById('patientIdInput');
        const doctorIdInput = document.getElementById('doctorIdInput');
        const visitNumberInput = document.getElementById('visitNumberInput');

        // نأخذ رقم المريض من العنصر المعروض في معلومات المريض
        const patientSpan = document.querySelector('.patient-info .patient-id');
        const patientId = patientSpan ? patientSpan.textContent.trim() : '';

        patientIdInput.value = patientId;
        doctorIdInput.value = item.doctor_id;
        visitNumberInput.value = item.visit_number;

        // جلب أدوية المريض تلقائيًا بعد تعبئة الحقول
        fetchPatientDrugsBtn.click();
    }
    //===============================================================

    //=================================================================
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

    function toggleForm() {
        addProcedureForm.classList.toggle('show');
    }

    function loadAvailablePeriods() {
        const visitDate = document.getElementById('newDate').value;
        const doctorId1 = document.getElementById('doctorId').value;
        console.log('from_loadAvailablePeriods_doctorId=', doctorId1);
        const doctorId = doctorId1;
        if (!visitDate) return;

        const today = new Date();
        const selectedDate = new Date(visitDate + 'T00:00:00');

        // شرط: التاريخ الماضي لا يسمح بالعرض
        if (selectedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
            alert('لا يمكن الحجز في تاريخ ماضي');
            document.getElementById('newTimeSlot').innerHTML =
                '<option value="">اختر الفترة</option>';
            return;
        }

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

                const now = new Date();

                data.periods.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p.period_no;
                    option.textContent = p.label;

                    // إذا كان التاريخ هو اليوم نفسه
                    if (selectedDate.toDateString() === today.toDateString()) {
                        const [hour, minute] = p.start_time.split(':').map(Number); // نفترض أن كل فترة لها start_time "HH:MM"
                        const periodTime = new Date();
                        periodTime.setHours(hour, minute, 0, 0);

                        // تعطيل الفترات الماضية اليوم
                        if (periodTime < now) {
                            option.disabled = true;
                            option.textContent += ' (انتهت)';
                        }
                    }

                    select.appendChild(option);
                });
            });
    }

    // ======================
    // ====================== إدارة أدوية العيادة والمريض
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
            `/get_patient_drg/?patient_id=${patientId}&doctor_id=${doctorId}&visit_number=${visitNumber}`
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

        fetch('/save_patient_drg/', {
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

                // تحديث الزيارة في الجدول
                searchPatient(currentPatient);
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
    function toggleSaveEditButton() {
        const saveEditBtn = document.getElementById('saveEditBtn');
        const addVisitBtn = addProcedureForm.querySelector('button[type="submit"]');
        const visitNumber = document.getElementById('visitNumber').value;

        if (!visitNumber) {
            saveEditBtn.style.display = 'none';
            addVisitBtn.style.display = 'inline-block';
        } else {
            saveEditBtn.style.display = 'inline-block';
            addVisitBtn.style.display = 'none';
        }
    }
});
