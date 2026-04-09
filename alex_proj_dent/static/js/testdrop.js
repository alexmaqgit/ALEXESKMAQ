document.addEventListener('DOMContentLoaded', async function () {
    // ======================
    // المتغيرات
    // ======================
    let currentVisit = null;
    let currentSection = null;
    let visitsData = [];
    let currentPatient = null;
    let labExamsMap = {};
    let servicesMap = {};
    let dentalTreatments = [];
    let selectedDrugs = new Map();

    // ======================
    // عناصر DOM
    // ======================
    const searchInput = document.getElementById('searchInput');
    const searchDropdown = document.getElementById('searchDropdown');
    const visitsList = document.getElementById('visitsList');
    const visitReport = document.getElementById('visitReport');
    const editBtn = document.getElementById('editMainBtn');
    const options = document.getElementById('visitOptions');
    const modal = document.getElementById('editModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalInput = document.getElementById('modalInput');

    const patientIdInput = document.getElementById('patientIdInput');
    const doctorIdInput = document.getElementById('doctorIdInput');
    const visitNumberInput = document.getElementById('visitNumberInput');

    // ======================
    // جلب المرضى
    // ======================
    async function fetchPatients() {
        try {
            const res = await fetch('/get_doctor_patients/');
            const data = await res.json();
            if (data.doctor_id) doctorIdInput.value = data.doctor_id;
            return data.patients || [];
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    // ======================
    // البحث المنسدل
    // ======================
    searchInput.addEventListener('input', async () => {
        const filter = searchInput.value.trim();
        if (!filter) return (searchDropdown.style.display = 'none');

        const patients = await fetchPatients();
        const filtered = patients.filter(
            p => String(p.id).includes(filter) || p.name.includes(filter)
        );

        searchDropdown.innerHTML = '';
        filtered.forEach(p => {
            const div = document.createElement('div');
            div.textContent = `${p.id} - ${p.name}`;
            div.onclick = () => selectPatient(p);
            searchDropdown.appendChild(div);
        });
        searchDropdown.style.display = filtered.length ? 'block' : 'none';
    });

    function selectPatient(patient) {
        searchInput.value = `${patient.id} - ${patient.name}`;
        searchDropdown.style.display = 'none';
        fetchVisits(patient.id);
    }

    // ======================
    // جلب زيارات المريض
    // ======================
    async function fetchVisits(patientId) {
        try {
            const res = await fetch(`/get_patient_visits/?q=${patientId}`);
            const data = await res.json();
            visitsData = data.visits || [];
            currentPatient = patientId;
            renderVisits();
            visitReport.innerHTML = 'اختر زيارة لعرض التفاصيل';
            editBtn.style.display = 'none';
            options.style.display = 'none';
        } catch (err) {
            console.error(err);
        }
    }

    // ======================
    // عرض قائمة الزيارات
    // ======================
    function renderVisits() {
        visitsList.innerHTML = '';
        const todayStr = getTodayDate();

        visitsData.forEach(v => {
            const btn = document.createElement('div');
            btn.className = 'visit-btn';
            btn.innerHTML = `<strong>زيارة ${v.visit_number}</strong><br>${v.visit_date || v.period_no || '-'}`;

            if (v.visit_date === todayStr) btn.classList.add('today');
            else if (v.book_confirmation == true || v.book_confirmation === '1')
                btn.classList.add('confirmed');
            else btn.classList.add('unconfirmed');

            btn.onclick = () => {
                document.querySelectorAll('.visit-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentVisit = v;
                showReport();
                options.style.display = 'none';
            };

            visitsList.appendChild(btn);
        });
    }

    // ======================
    // عرض تفاصيل الزيارة
    // ======================
    function showReport() {
        if (!currentVisit) return (visitReport.innerHTML = 'اختر زيارة');

        visitReport.innerHTML = `
            <b>زيارة رقم ${currentVisit.visit_number} - ${currentVisit.visit_date || currentVisit.period_no}</b><br><br>
            <h3>المعاينة</h3>${currentVisit.note || '-'}<br><br>
            <h3>الإجراءات</h3>${currentVisit.procedures || '-'}<br><br>
            <h3>الفحوصات</h3>${currentVisit.exams || '-'}<br><br>
            <h3>العلاج</h3>${currentVisit.treatment || '-'}
        `;

        // زر التعديل للزيارات اليوم فقط
        editBtn.style.display =
            currentVisit.visit_date === getTodayDate() ? 'inline-block' : 'none';
    }

    // ======================
    // المودال
    // ======================
    function toggleOptions() {
        options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
    }

    function openModal(section, title) {
        currentSection = section;
        modalTitle.innerText = title;
        modalInput.value = currentVisit[section] || '';
        modal.style.display = 'flex';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    function saveData() {
        currentVisit[currentSection] = modalInput.value;
        closeModal();
        showReport();
    }

    // ======================
    // دالة اليوم
    // ======================
    function getTodayDate() {
        const t = new Date();
        return `${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`;
    }

    // ======================
    // تحميل البيانات القديمة (الخدمات، الفحوصات، أدوية الأسنان)
    // ======================
    async function loadServices() {
        try {
            const res = await fetch('/get_services_for_select/');
            const data = await res.json();
            servicesMap = {};
            data.services.forEach(s => (servicesMap[String(s.id).trim()] = s.name));
        } catch (e) {
            console.error(e);
        }
    }

    async function loadLabExams() {
        try {
            const res = await fetch('/get_lab_exams/');
            const data = await res.json();
            labExamsMap = {};
            data.exams.forEach(e => (labExamsMap[String(e.id).trim()] = e.exam_name));
        } catch (e) {
            console.error(e);
        }
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
        } catch (e) {
            console.error(e);
        }
    }

    await Promise.all([loadServices(), loadLabExams()]);
    await loadDentalTreatments();

    console.log('الصفحة جاهزة والبيانات محملة!');
});
