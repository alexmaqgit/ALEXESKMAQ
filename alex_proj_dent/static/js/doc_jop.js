document.addEventListener('DOMContentLoaded', async function () {
    console.log('شاشة الطبيب الفاخرة - تم التحميل');

    // ======================
    // متغيرات عالمية
    // ======================
    let currentPatient = null;
    let labExamsMap = {};
    let servicesMap = {};
    let dentalTreatments = [];
    let selectedDrugs = new Map();
    let currentVisit = null;
    let visitsData = [];
    let isEditMode = false;
    let currentEditType = null;

    // ======================
    // عناصر DOM
    // ======================
    const searchInput = document.getElementById('searchInput');
    const searchDropdown = document.getElementById('searchDropdown');
    const showAddProcedureBtn = document.getElementById('showAddProcedureBtn');
    const formOverlay = document.getElementById('formOverlay');
    const addProcedureForm = document.getElementById('addProcedureForm');
    const formTitle = document.getElementById('formTitle');
    const procedureContainer = document.getElementById('procedureContainer');
    const labExamsContainer = document.getElementById('labExamsContainer');
    const visitsList = document.getElementById('visitsList');
    const visitReport = document.getElementById('visitReport');
    const doctorIdInput = document.getElementById('doctorIdInput');
    const newDate = document.getElementById('newDate');
    const newTimeSlot = document.getElementById('newTimeSlot');
    const newNote = document.getElementById('newNote');
    const visitNumberInput = document.getElementById('visitNumber');
    const submitFormBtn = document.getElementById('submitFormBtn');
    const saveEditBtn = document.getElementById('saveEditBtn');

    // مودالات منفصلة
    const drugsModal = document.getElementById('drugsModal');
    const drugsModalTitle = document.getElementById('drugsModalTitle');
    const drugSearchInput = document.getElementById('drugSearchInput');
    const drugsContainer = document.getElementById('drugsContainer');

    // عناصر إدارة الأدوية
    const drugSearch = document.getElementById('drugSearch');
    const drugResults = document.getElementById('drugResults');
    const patientIdInput = document.getElementById('patientIdInput');
    const doctorIdHidden = document.getElementById('doctorIdInput');
    const visitNumberHidden = document.getElementById('visitNumberInput');
    const fetchPatientDrugsBtn = document.getElementById('fetchPatientDrugsBtn');
    const patientDrugsResults = document.getElementById('patientDrugsResults');
    const saveDrugsBtn = document.getElementById('saveDrugsBtn');

    // ======================
    // تنسيق التاريخ (إزالة الوقت)
    // ======================
    function formatDate(dateString) {
        if (!dateString) return 'غير محدد';
        if (dateString.includes(' ')) {
            return dateString.split(' ')[0];
        }
        return dateString;
    }

    // إنشاء المودالات الإضافية ديناميكياً
    let textModal, proceduresModal, examsModal;

    function createModals() {
        // مودال الملاحظة
        if (!document.getElementById('textModal')) {
            textModal = document.createElement('div');
            textModal.id = 'textModal';
            textModal.className = 'modal';
            textModal.innerHTML = `
                <div class="modal-content fancy-modal">
                    <h3 id="textModalTitle">📝 تعديل المعاينة</h3>
                    <textarea id="textModalInput" class="form-input" rows="5" placeholder="اكتب الملاحظة هنا..."></textarea>
                    <div class="modal-actions">
                        <button class="save-btn" onclick="saveTextData()">💾 حفظ</button>
                        <button class="cancel-btn" onclick="closeTextModal()">✖ إلغاء</button>
                    </div>
                </div>
            `;
            document.body.appendChild(textModal);
        } else {
            textModal = document.getElementById('textModal');
        }

        // مودال الإجراءات
        if (!document.getElementById('proceduresModal')) {
            proceduresModal = document.createElement('div');
            proceduresModal.id = 'proceduresModal';
            proceduresModal.className = 'modal';
            proceduresModal.innerHTML = `
                <div class="modal-content fancy-modal">
                    <h3 id="proceduresModalTitle">🩺 تعديل الإجراءات</h3>
                    <div id="proceduresModalContainer" class="modal-checkbox-grid"></div>
                    <div class="modal-actions">
                        <button class="save-btn" onclick="saveProceduresData()">💾 حفظ</button>
                        <button class="cancel-btn" onclick="closeProceduresModal()">✖ إلغاء</button>
                    </div>
                </div>
            `;
            document.body.appendChild(proceduresModal);
        } else {
            proceduresModal = document.getElementById('proceduresModal');
        }

        // مودال الفحوصات
        if (!document.getElementById('examsModal')) {
            examsModal = document.createElement('div');
            examsModal.id = 'examsModal';
            examsModal.className = 'modal';
            examsModal.innerHTML = `
                <div class="modal-content fancy-modal">
                    <h3 id="examsModalTitle">🔬 تعديل الفحوصات</h3>
                    <div id="examsModalContainer" class="modal-checkbox-grid"></div>
                    <div class="modal-actions">
                        <button class="save-btn" onclick="saveExamsData()">💾 حفظ</button>
                        <button class="cancel-btn" onclick="closeExamsModal()">✖ إلغاء</button>
                    </div>
                </div>
            `;
            document.body.appendChild(examsModal);
        } else {
            examsModal = document.getElementById('examsModal');
        }
    }

    // ======================
    // دوال مساعدة
    // ======================
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

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function showLoading(btn, text = '⏳ جاري الحفظ...') {
        btn._originalText = btn.innerHTML;
        btn.innerHTML = text;
        btn.disabled = true;
    }

    function hideLoading(btn) {
        btn.innerHTML = btn._originalText;
        btn.disabled = false;
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">✖</button>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async function apiCall(endpoint, payload) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify(payload),
            });
            return await response.json();
        } catch (error) {
            console.error(`❌ خطأ في ${endpoint}:`, error);
            return { success: false, message: error.message };
        }
    }

    // ======================
    // ترتيب الزيارات (من الكود الأصلي)
    // ======================
    function sortVisits(visits) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return [...visits].sort((a, b) => {
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
    }

    // ======================
    // مودال الملاحظة
    // ======================
    window.openNoteModal = function (visit) {
        currentVisit = visit;
        const modalTitle = document.getElementById('textModalTitle');
        const modalInput = document.getElementById('textModalInput');
        if (modalTitle) modalTitle.innerText = '📝 تعديل المعاينة';
        if (modalInput) modalInput.value = visit.note || '';
        textModal.style.display = 'flex';
    };

    window.closeTextModal = function () {
        textModal.style.display = 'none';
    };

    window.saveTextData = async function () {
        const modalInput = document.getElementById('textModalInput');
        const newValue = modalInput ? modalInput.value.trim() : '';
        if (!currentVisit) return;

        const saveBtn = document.querySelector('#textModal .save-btn');
        showLoading(saveBtn);

        const result = await apiCall('/update_visit_note/', {
            visit_number: currentVisit.visit_number,
            note: newValue,
        });

        if (result.success) {
            currentVisit.note = newValue;
            window.closeTextModal();
            showReport();
            renderVisits();
            showToast('✅ تم حفظ الملاحظة بنجاح', 'success');
        } else {
            showToast('⚠️ ' + result.message, 'error');
        }
        hideLoading(saveBtn);
    };

    // ======================
    // مودال الإجراءات
    // ======================
    window.openProceduresModal = function (visit) {
        currentVisit = visit;
        const modalTitle = document.getElementById('proceduresModalTitle');
        const modalContainer = document.getElementById('proceduresModalContainer');

        if (modalTitle) modalTitle.innerText = '🩺 تعديل الإجراءات';
        if (!modalContainer) return;

        modalContainer.innerHTML = '';

        const stored = visit.treatment ? visit.treatment.split(',').map(s => s.trim()) : [];
        const storedIds = stored.map(val => {
            if (servicesMap[val]) return val;
            const entry = Object.entries(servicesMap).find(([id, name]) => name === val);
            return entry ? entry[0] : val;
        });

        Object.entries(servicesMap).forEach(([id, name]) => {
            if (id === '121') return;
            const isChecked = storedIds.includes(id);
            const label = document.createElement('label');
            label.className = 'checkbox-item modal-checkbox';
            label.innerHTML = `
                <input type="checkbox" value="${id}" ${isChecked ? 'checked' : ''}>
                <span>${escapeHtml(name)}</span>
            `;
            modalContainer.appendChild(label);
        });

        proceduresModal.style.display = 'flex';
    };

    window.closeProceduresModal = function () {
        proceduresModal.style.display = 'none';
    };

    window.saveProceduresData = async function () {
        const modalContainer = document.getElementById('proceduresModalContainer');
        const selected = Array.from(
            modalContainer.querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => cb.value);

        const saveBtn = document.querySelector('#proceduresModal .save-btn');
        showLoading(saveBtn);

        const result = await apiCall('/update_visit_procedures/', {
            visit_number: currentVisit.visit_number,
            treatment: selected.join(','),
        });

        if (result.success) {
            currentVisit.treatment = selected.join(',');
            window.closeProceduresModal();
            showReport();
            renderVisits();
            showToast('✅ تم حفظ الإجراءات بنجاح', 'success');
        } else {
            showToast('⚠️ ' + result.message, 'error');
        }
        hideLoading(saveBtn);
    };

    // ======================
    // مودال الفحوصات
    // ======================
    window.openExamsModal = function (visit) {
        currentVisit = visit;
        const modalTitle = document.getElementById('examsModalTitle');
        const modalContainer = document.getElementById('examsModalContainer');

        if (modalTitle) modalTitle.innerText = '🔬 تعديل الفحوصات';
        if (!modalContainer) return;

        modalContainer.innerHTML = '';

        const stored = visit.exams ? visit.exams.split(',').map(s => s.trim()) : [];
        const storedIds = stored.map(val => {
            if (labExamsMap[val]) return val;
            const entry = Object.entries(labExamsMap).find(([id, name]) => name === val);
            return entry ? entry[0] : val;
        });

        Object.entries(labExamsMap).forEach(([id, name]) => {
            const isChecked = storedIds.includes(id);
            const label = document.createElement('label');
            label.className = 'checkbox-item modal-checkbox';
            label.innerHTML = `
                <input type="checkbox" value="${id}" ${isChecked ? 'checked' : ''}>
                <span>${escapeHtml(name)}</span>
            `;
            modalContainer.appendChild(label);
        });

        examsModal.style.display = 'flex';
    };

    window.closeExamsModal = function () {
        examsModal.style.display = 'none';
    };

    window.saveExamsData = async function () {
        const modalContainer = document.getElementById('examsModalContainer');
        const selected = Array.from(
            modalContainer.querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => cb.value);

        const saveBtn = document.querySelector('#examsModal .save-btn');
        showLoading(saveBtn);

        const result = await apiCall('/update_visit_exams/', {
            visit_number: currentVisit.visit_number,
            exams: selected.join(','),
        });

        if (result.success) {
            currentVisit.exams = selected.join(',');
            window.closeExamsModal();
            showReport();
            renderVisits();
            showToast('✅ تم حفظ الفحوصات بنجاح', 'success');
        } else {
            showToast('⚠️ ' + result.message, 'error');
        }
        hideLoading(saveBtn);
    };

    // ======================
    // مودال الأدوية
    // ======================
    window.openDrugsModal = function (visit) {
        currentVisit = visit;
        drugsModalTitle.innerText = '💊 تعديل العلاج (الأدوية)';
        drugsContainer.innerHTML = '';

        const stored = visit.medcen ? visit.medcen.split(',').map(s => s.trim()) : [];
        const storedIds = stored.map(val => {
            if (dentalTreatments.some(d => String(d.id) === val)) return val;
            const drug = dentalTreatments.find(d => d.name === val);
            return drug ? String(drug.id) : val;
        });

        function renderDrugs(filter = '') {
            drugsContainer.innerHTML = '';
            const filtered = dentalTreatments.filter(d =>
                d.name.toLowerCase().includes(filter.toLowerCase())
            );
            filtered.forEach(d => {
                const isChecked = storedIds.includes(String(d.id));
                const label = document.createElement('label');
                label.className = 'checkbox-item modal-checkbox drug-checkbox';
                label.innerHTML = `
                    <input type="checkbox" value="${d.id}" ${isChecked ? 'checked' : ''}>
                    <span>${escapeHtml(d.name)}</span>
                    ${d.instructions ? `<small class="instructions">${escapeHtml(d.instructions)}</small>` : ''}
                `;
                drugsContainer.appendChild(label);
            });
        }

        renderDrugs();
        if (drugSearchInput) {
            drugSearchInput.value = '';
            drugSearchInput.oninput = e => renderDrugs(e.target.value);
        }
        drugsModal.style.display = 'flex';
    };

    window.closeDrugsModal = function () {
        drugsModal.style.display = 'none';
    };

    window.saveDrugsData = async function () {
        const selected = Array.from(
            drugsContainer.querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => cb.value);

        const saveBtn = document.querySelector('#drugsModal .save-btn');
        showLoading(saveBtn);

        const result = await apiCall('/update_visit_drugs/', {
            visit_number: currentVisit.visit_number,
            medcen: selected.join(','),
        });

        if (result.success) {
            currentVisit.medcen = selected.join(',');
            window.closeDrugsModal();
            showReport();
            renderVisits();
            showToast('✅ تم حفظ الأدوية بنجاح', 'success');
        } else {
            showToast('⚠️ ' + result.message, 'error');
        }
        hideLoading(saveBtn);
    };

    // ======================
function showReport() {
    if (!currentVisit) return;
    
    const FIRST_VISIT_ID = '121';
    
    const treatmentIds = currentVisit.treatment ? currentVisit.treatment.split(',').map(s => s.trim()) : [];
    const examsIds = currentVisit.exams ? currentVisit.exams.split(',').map(s => s.trim()) : [];
    const medcenIds = currentVisit.medcen ? currentVisit.medcen.split(',').map(s => s.trim()) : [];
    
    const hasFirstVisit = 
        treatmentIds.includes(FIRST_VISIT_ID) ||
        treatmentIds.includes('الزيارة الاولى') ||
        examsIds.includes(FIRST_VISIT_ID) ||
        examsIds.includes('الزيارة الاولى') ||
        medcenIds.includes(FIRST_VISIT_ID) ||
        medcenIds.includes('الزيارة الاولى');
    
    const isUnconfirmed = currentVisit.book_confirmation == 0;
    
    if (isUnconfirmed && hasFirstVisit) {
        console.log('🚫 إخفاء التقرير - زيارة أولى غير مؤكدة');
        visitReport.innerHTML = `
            <div class="first-visit-warning">
                <div class="warning-icon">⚠️</div>
                <h3>هذه الزيارة الأولى غير مؤكدة</h3>
                <p>الزيارة الأولى تحتاج إلى تأكيد الدفع أولاً</p>
            </div>
        `;
        return;
    }
    
    // ... باقي الكود (عرض التقرير العادي) ...

    // ... باقي الكود ...
  
    // ========== باقي الكود (عرض التقرير العادي) ==========
    console.log('✅ عرض التقرير العادي');
    
    const visitDate = formatDate(currentVisit.visit_date) || 'غير محدد';
    const periodNo = currentVisit.period_no || 'غير محدد';
    let patientName = window.currentPatientName || 'غير معروف';

    const proceduresList = treatmentIds.filter(id => id !== FIRST_VISIT_ID);
    const examsList = examsIds;
    const drugsList = medcenIds;

    const proceduresNames = proceduresList.map(id => servicesMap[id] || id);
    const examsNames = examsList.map(id => labExamsMap[id] || id);
    const drugsNames = drugsList.map(id => {
        const drug = dentalTreatments.find(d => String(d.id) === id);
        return drug ? drug.name : id;
    });

    const isConfirmed = currentVisit.book_confirmation == 1;
    const statusClass = isConfirmed ? 'confirmed' : 'unconfirmed';
    const statusText = isConfirmed ? 'مؤكدة ✓' : 'غير مؤكدة ⚠️';

    let html = `
        <div class="report-header">
            <div class="header-top">
                <div class="patient-greeting">
                    <span class="greeting-icon">👤</span>
                    <span class="patient-name">${escapeHtml(patientName)}</span>
                </div>
                <div class="header-actions">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
            <div class="header-info">
                <div class="info-item">
                    <span class="info-icon">📅</span>
                    <span class="info-text">${visitDate}</span>
                </div>
                <div class="info-item">
                    <span class="info-icon">⏰</span>
                    <span class="info-text">${periodNo}</span>
                </div>
            </div>
        </div>
        <div class="report-grid">
    `;

    // المعاينة
    if (currentVisit.note && currentVisit.note.trim() !== '') {
        html += `
            <div class="report-card note-card" data-card="note">
                <div class="card-icon">📝</div>
                <div class="card-title">المعاينة</div>
                <div class="card-content note-content">${escapeHtml(currentVisit.note)}</div>
                <button class="card-edit-btn" onclick="window.openNoteModal(window.currentVisit)">
                    <span>✏️</span> تعديل
                </button>
            </div>
        `;
    }

    // الإجراءات
    if (proceduresNames.length > 0) {
        let itemsHtml = '';
        proceduresNames.forEach((name, idx) => {
            itemsHtml += `
                <div class="list-row procedures-row" style="animation-delay: ${idx * 0.05}s">
                    <span class="row-icon">🩺</span>
                    <span class="row-name">${escapeHtml(name)}</span>
                </div>
            `;
        });
        html += `
            <div class="report-card procedures-card" data-card="procedures">
                <div class="card-icon">🩺</div>
                <div class="card-title">الإجراءات <span class="item-count">(${proceduresNames.length})</span></div>
                <div class="card-list">${itemsHtml}</div>
                <button class="card-edit-btn" onclick="window.openProceduresModal(window.currentVisit)">
                    <span>✏️</span> تعديل
                </button>
            </div>
        `;
    } else {
        html += `
            <div class="report-card procedures-card empty-card" data-card="procedures">
                <div class="card-icon">🩺</div>
                <div class="card-title">الإجراءات</div>
                <div class="card-content empty">لا توجد إجراءات</div>
                <button class="card-edit-btn add-btn" onclick="window.openProceduresModal(window.currentVisit)">
                    <span>➕</span> إضافة
                </button>
            </div>
        `;
    }

    // الفحوصات
    if (examsNames.length > 0) {
        let itemsHtml = '';
        examsNames.forEach((name, idx) => {
            itemsHtml += `
                <div class="list-row exams-row" style="animation-delay: ${idx * 0.05}s">
                    <span class="row-icon">🔬</span>
                    <span class="row-name">${escapeHtml(name)}</span>
                </div>
            `;
        });
        html += `
            <div class="report-card exams-card" data-card="exams">
                <div class="card-icon">🔬</div>
                <div class="card-title">الفحوصات <span class="item-count">(${examsNames.length})</span></div>
                <div class="card-list">${itemsHtml}</div>
                <button class="card-edit-btn" onclick="window.openExamsModal(window.currentVisit)">
                    <span>✏️</span> تعديل
                </button>
            </div>
        `;
    } else {
        html += `
            <div class="report-card exams-card empty-card" data-card="exams">
                <div class="card-icon">🔬</div>
                <div class="card-title">الفحوصات</div>
                <div class="card-content empty">لا توجد فحوصات</div>
                <button class="card-edit-btn add-btn" onclick="window.openExamsModal(window.currentVisit)">
                    <span>➕</span> إضافة
                </button>
            </div>
        `;
    }

    // العلاج
    if (drugsNames.length > 0) {
        let itemsHtml = '';
        drugsNames.forEach((name, idx) => {
            itemsHtml += `
                <div class="list-row drugs-row" style="animation-delay: ${idx * 0.05}s">
                    <span class="row-icon">💊</span>
                    <span class="row-name">${escapeHtml(name)}</span>
                </div>
            `;
        });
        html += `
            <div class="report-card drugs-card" data-card="drugs">
                <div class="card-icon">💊</div>
                <div class="card-title">العلاج <span class="item-count">(${drugsNames.length})</span></div>
                <div class="card-list">${itemsHtml}</div>
                <button class="card-edit-btn" onclick="window.openDrugsModal(window.currentVisit)">
                    <span>✏️</span> تعديل
                </button>
            </div>
        `;
    }

    html += `</div>`;

    if (html.indexOf('report-card') === -1) {
        html = `
            <div class="empty-report">
                <div class="empty-icon">📋</div>
                <h4>لا توجد بيانات</h4>
                <p>لا توجد معاينة أو إجراءات أو فحوصات أو علاج لهذه الزيارة</p>
            </div>
        `;
    }

    visitReport.innerHTML = html;
}
// ======================
// عرض قائمة الزيارات
// ======================
// ======================
// عرض قائمة الزيارات
// ======================
function renderVisits() {
    visitsList.innerHTML = '';

    const sortedVisits = [...visitsData].sort((a, b) => {
        const dateA = new Date(a.visit_date.split(' ')[0]);
        const dateB = new Date(b.visit_date.split(' ')[0]);
        return dateB - dateA;
    });

    const totalVisits = sortedVisits.length;

    sortedVisits.forEach((v, index) => {
        const serialNumber = totalVisits - index;

        const visitRow = document.createElement('div');
        visitRow.className = 'visit-row';

        const visitDate = v.visit_date ? new Date(v.visit_date.split(' ')[0]) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let isUnconfirmed = false;

        if (visitDate) {
            visitDate.setHours(0, 0, 0, 0);
            const confirmed = Number(v.book_confirmation);
            if (confirmed === 0 && (visitDate.getTime() === today.getTime() || visitDate > today)) {
                isUnconfirmed = true;
            }
        }

        // ✅ زر الزيارة
        const visitBtn = document.createElement('button');
        visitBtn.className = `visit-main-btn ${isUnconfirmed ? 'unconfirmed' : ''}`;
        visitBtn.title = isUnconfirmed
            ? `⚠️ زيارة غير مؤكدة - التاريخ: ${v.visit_date || 'غير محدد'}`
            : `التاريخ: ${v.visit_date || 'غير محدد'}`;
        visitBtn.innerHTML = `
            <span class="visit-number">📋 زيارة رقم ${serialNumber}</span>
            <span class="visit-date">${v.visit_date ? formatDate(v.visit_date) : 'تاريخ غير محدد'}</span>
        `;

        v.serialNumber = serialNumber;

        visitBtn.onclick = () => {
            document.querySelectorAll('.visit-main-btn').forEach(b => b.classList.remove('active'));
            visitBtn.classList.add('active');
            currentVisit = v;
            showReport();
        };
        visitRow.appendChild(visitBtn);

        // ✅ زر إضافة ملاحظة (40x40)
        if (!v.note || v.note.trim() === '') {
            const noteBtn = document.createElement('button');
            noteBtn.className = 'action-icon-btn note-btn';
            noteBtn.innerHTML = '📝';
            noteBtn.title = 'إضافة ملاحظة';
            noteBtn.onclick = e => {
                e.stopPropagation();
                window.openNoteModal(v);
            };
            visitRow.appendChild(noteBtn);
        }

        // ✅ زر إضافة علاج (40x40 - أيقونة فقط)
        if (!v.medcen || v.medcen.trim() === '') {
            const drugBtn = document.createElement('button');
            drugBtn.className = 'action-icon-btn treatment-btn';
            drugBtn.innerHTML = '💊';
            drugBtn.title = 'إضافة علاج';
            drugBtn.onclick = e => {
                e.stopPropagation();
                window.openDrugsModal(v);
            };
            visitRow.appendChild(drugBtn);
        }

        // ✅ زر الدفع (40x40)
        const paymentBtn = document.createElement('button');
        paymentBtn.className = 'action-icon-btn payment-btn';
        paymentBtn.innerHTML = '💰';
        paymentBtn.title = 'عرض المدفوعات';
        paymentBtn.onclick = e => {
            e.stopPropagation();
            checkPayment(v);
        };
        visitRow.appendChild(paymentBtn);

        visitsList.appendChild(visitRow);
    });
}    // ======================
    // التحقق من الدفع - عرض كرت منبثق
    // ======================
    async function checkPayment(visit) {
        try {
            const res = await fetch('/doctor2_payment_api/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visit_num: visit.visit_number }),
            });
            const data = await res.json();
            const selectData = data.select || {};
            const dynamicKey = Object.keys(selectData)[0];
            const payments = selectData[dynamicKey] || [];

            if (payments.length === 0) {
                showToast('🖐️💰لا توجد مدفوعات لهذه الزيارة', 'info');
                return;
            }

            // حساب الإجمالي
            const total = payments.reduce((sum, p) => sum + parseFloat(p.ITEM_PRICE), 0);
            
            // عرض الكرت
            showPaymentModal(visit, payments, total);
            
        } catch (err) {
            console.error(err);
            showToast('حدث خطأ في جلب بيانات الدفع', 'error');
        }
    }
// ======================
// توجيه إلى صفحة الدفع للزيارة الأولى
// ======================
// ======================
// توجيه إلى صفحة الدفع للزيارة الأولى (نسخة واحدة فقط)
// ======================
function redirectToPaymentForFirstVisit() {
    console.log('🔄 توجيه إلى صفحة الدفع للزيارة الأولى');
    
    // تخزين بيانات الزيارة الحالية في sessionStorage
    const paymentData = {
        patient_id: currentPatient,
        patient_name: window.currentPatientName,
        visit_number: currentVisit.visit_number,
        clinic_id: doctorIdInput.value,
        clinic_name: 'عيادة الأسنان',
        doctor_id: currentVisit.doctor_id,
        doctor_name: currentVisit.doctor_name || 'دكتور',
        items: [
            {
                item_name: 'الزيارة الاولى',
                item_price: 0,
                item_type: 1,
                visit_number: currentVisit.visit_number,
                doctor_id: currentVisit.doctor_id
            }
        ],
        total: 0
    };
    sessionStorage.setItem('paymentData', JSON.stringify(paymentData));
    
    // الانتقال إلى صفحة الدفع
    window.location.href = '/invoice/';
}
    // ======================
    // إلغاء اختيار الزيارة
    // ======================
    function clearVisit() {
        currentVisit = null;
        document.querySelectorAll('.visit-main-btn').forEach(btn => btn.classList.remove('active'));
        visitReport.innerHTML = `
            <div class="empty-report">
                <div class="empty-icon">📋</div>
                <h4>اختر زيارة</h4>
                <p>اختر زيارة من القائمة لعرض التفاصيل</p>
            </div>
        `;
    }

    // ======================
    // عرض كرت تفاصيل الدفع
    // ======================
    function showPaymentModal(visit, payments, total) {
        const modal = document.getElementById('paymentModal');
        const patientName = window.currentPatientName || 'غير محدد';
        
        document.getElementById('paymentPatientName').textContent = patientName;
        document.getElementById('paymentVisitNumber').textContent = visit.visit_number;
        document.getElementById('paymentTotalAmount').textContent = total.toLocaleString();
        
        const itemsList = document.getElementById('paymentItemsList');
        if (payments.length === 0) {
            itemsList.innerHTML = `
                <div class="empty-payment">
                    <div class="empty-payment-icon">💰</div>
                    <p>لا توجد مدفوعات</p>
                </div>
            `;
        } else {
            itemsList.innerHTML = payments.map((payment, index) => `
                <div class="payment-item-row" style="animation-delay: ${index * 0.05}s">
                    <div class="payment-item-name">
                        <span class="payment-item-icon">💳</span>
                        <span>${payment.ITEM_NAME}</span>
                    </div>
                </div>
            `).join('');
        }
        
        modal.style.display = 'flex';
    }

    // ======================
    // إغلاق كرت تفاصيل الدفع
    // ======================
    function closePaymentModal() {
        const modal = document.getElementById('paymentModal');
        modal.style.display = 'none';
    }

    window.closePaymentModal = closePaymentModal;

    // ======================
    // تحميل الفترات المتاحة
    // ======================
    function loadAvailablePeriods() {
        const visitDate = newDate.value;
        const doctorId = doctorIdInput.value;

        if (!visitDate) {
            newTimeSlot.innerHTML = '<option value="">اختر الفترة</option>';
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(visitDate);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            alert('لا يمكن الحجز في تاريخ ماضي');
            newTimeSlot.innerHTML = '<option value="">اختر الفترة</option>';
            return;
        }

        newTimeSlot.innerHTML = '<option value="">⏳ جاري تحميل الفترات...</option>';

        fetch(`/get_available_periods/?doctor_id=${doctorId}&visit_date=${visitDate}`)
            .then(res => res.json())
            .then(data => {
                newTimeSlot.innerHTML = '<option value="">اختر الفترة</option>';
                if (!data.success) {
                    alert('حدث خطأ في تحميل الفترات');
                    return;
                }

                if (data.periods.length === 0) {
                    alert('لا توجد فترات متاحة في هذا اليوم');
                    return;
                }

                data.periods.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p.period_no;
                    option.textContent = p.label;
                    newTimeSlot.appendChild(option);
                });
            })
            .catch(err => {
                console.error('Error loading periods:', err);
                newTimeSlot.innerHTML = '<option value="">خطأ في التحميل</option>';
                alert('حدث خطأ في تحميل الفترات');
            });
    }

    // ======================
    // إضافة زيارة جديدة
    // ======================
    async function addVisit(e) {
        if (e) e.preventDefault();

        if (!currentPatient) {
            showToast('⚠️ الرجاء البحث عن المريض أولاً!', 'error');
            return;
        }

        const selectedProcedures = Array.from(
            document.querySelectorAll('#procedureContainer input[name="procedures"]:checked')
        ).map(cb => cb.value);

        if (selectedProcedures.length === 0) {
            showToast('⚠️ الرجاء اختيار إجراء واحد على الأقل!', 'error');
            return;
        }

        const selectedLabExams = Array.from(
            document.querySelectorAll('#labExamsContainer input[name="labExams"]:checked')
        ).map(cb => cb.value);

        const visitDate = newDate.value;
        const timeSlot = newTimeSlot.value;
        const note = newNote ? newNote.value : '';

        if (!visitDate) {
            showToast('⚠️ الرجاء اختيار تاريخ الزيارة!', 'error');
            return;
        }

        if (!timeSlot) {
            showToast('⚠️ الرجاء اختيار الفترة!', 'error');
            return;
        }

        const payload = {
            treatment: selectedProcedures.join(','),
            exams: selectedLabExams.join(','),
            note: note,
            visit_date: visitDate,
            timeSlot: timeSlot,
        };

        showLoading(submitFormBtn);

        const result = await apiCall(`/add_patient_visit/${currentPatient}/`, payload);

        if (result.success) {
            addProcedureForm.reset();
            await searchPatient(currentPatient);
            toggleForm();
            showToast('✅ تم إضافة الزيارة بنجاح', 'success');
        } else {
            showToast('❌ ' + result.message, 'error');
        }

        hideLoading(submitFormBtn);
    }

    // ======================
    // الفورم المنبثق
    // ======================
    window.toggleForm = function () {
        const reportSection = document.querySelector('.report-section');
        const visitsListSection = document.querySelector('.visits-list');

        formOverlay.classList.toggle('show');

        if (formOverlay.classList.contains('show')) {
            if (reportSection) {
                reportSection.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                reportSection.style.opacity = '0';
                reportSection.style.transform = 'translateX(-30px)';
                setTimeout(() => {
                    reportSection.style.display = 'none';
                }, 400);
            }
            if (visitsListSection) {
                visitsListSection.style.transition = 'all 0.3s ease';
                visitsListSection.style.opacity = '0.9';
            }

            if (!isEditMode) {
                procedureContainer.style.display = 'block';
                labExamsContainer.style.display = 'block';
            } else {
                if (currentEditType === 'procedures') {
                    procedureContainer.style.display = 'block';
                    labExamsContainer.style.display = 'none';
                } else if (currentEditType === 'exams') {
                    procedureContainer.style.display = 'none';
                    labExamsContainer.style.display = 'block';
                } else if (currentEditType === 'note') {
                    procedureContainer.style.display = 'none';
                    labExamsContainer.style.display = 'none';
                    const noteGroup = document.querySelector('#newNote').closest('.form-group');
                    if (noteGroup) noteGroup.style.display = 'block';
                } else {
                    procedureContainer.style.display = 'block';
                    labExamsContainer.style.display = 'block';
                }
            }

            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;
            if (newDate && !newDate.value) {
                newDate.value = todayStr;
            }

            if (newTimeSlot) {
                newTimeSlot.innerHTML = '<option value="">اختر الفترة</option>';
            }

            setTimeout(() => {
                addProcedureForm.querySelector('input, select, textarea')?.focus();
            }, 100);
        } else {
            if (reportSection) {
                reportSection.style.display = 'block';
                setTimeout(() => {
                    reportSection.style.opacity = '1';
                    reportSection.style.transform = 'translateX(0)';
                }, 50);
            }
            if (visitsListSection) {
                visitsListSection.style.opacity = '1';
            }

            procedureContainer.style.display = 'block';
            labExamsContainer.style.display = 'block';
            addProcedureForm.reset();
            document.querySelectorAll('#procedureContainer input[type="checkbox"]').forEach(cb => cb.checked = false);
            document.querySelectorAll('#labExamsContainer input[type="checkbox"]').forEach(cb => cb.checked = false);

            if (submitFormBtn) {
                submitFormBtn.style.display = 'inline-block';
                submitFormBtn.onclick = addVisit;
            }
            if (saveEditBtn) saveEditBtn.style.display = 'none';
            formTitle.innerText = '➕ إضافة زيارة جديدة';

            if (newTimeSlot) {
                newTimeSlot.innerHTML = '<option value="">اختر الفترة</option>';
            }

            isEditMode = false;
            currentEditType = null;

            const noteGroup = document.querySelector('#newNote').closest('.form-group');
            if (noteGroup) noteGroup.style.display = 'block';
        }
    };

    // ======================
    // دوال البحث والتحميل
    // ======================
    async function loadServices() {
        try {
            const res = await fetch('/get_services_for_select/');
            const data = await res.json();
            procedureContainer.innerHTML = '<h3>🩺 الإجراءات الطبية</h3>';
            if (!data.success) return;
            servicesMap = {};
            data.services.forEach(service => {
                if (String(service.id).trim() === '121') return;
                servicesMap[String(service.id).trim()] = service.name;
                const label = document.createElement('label');
                label.className = 'checkbox-item';
                label.innerHTML = `<input type="checkbox" name="procedures" value="${String(service.id).trim()}"> <span>${service.name}</span>`;
                procedureContainer.appendChild(label);
            });
        } catch (err) {
            console.error(err);
        }
    }

    async function loadLabExams() {
        try {
            const res = await fetch('/get_lab_exams/');
            const data = await res.json();
            labExamsContainer.innerHTML = '<h3>🔬 الفحوصات المخبرية</h3>';
            if (!data.success) return;
            labExamsMap = {};
            data.exams.forEach(exam => {
                labExamsMap[String(exam.id).trim()] = exam.exam_name;
                const label = document.createElement('label');
                label.className = 'checkbox-item';
                label.innerHTML = `<input type="checkbox" name="labExams" value="${String(exam.id).trim()}"> <span>${exam.exam_name}</span>`;
                labExamsContainer.appendChild(label);
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
            console.log('✅ تم تحميل العلاجات:', dentalTreatments.length);
        } catch (err) {
            console.error(err);
        }
    }

    async function fetchPatients() {
        try {
            const res = await fetch('/get_doctor_patients/');
            const data = await res.json();
            if (data.doctor_id && doctorIdInput) doctorIdInput.value = data.doctor_id;
            return data.patients || [];
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    searchInput.addEventListener('input', async () => {
        const filter = searchInput.value.trim();
        if (!filter) {
            searchDropdown.style.display = 'none';
            return;
        }
        const patients = await fetchPatients();
        const filtered = patients.filter(
            p => String(p.id).includes(filter) || (p.name && p.name.includes(filter))
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
        if (patient.doctor_id) {
            doctorIdInput.value = patient.doctor_id;
        }
        searchPatient(patient.id);
    }

    async function searchPatient(pati_no = currentPatient) {
        if (!pati_no) return alert('أدخل رقم المريض!');
        try {
            const res = await fetch(`/get_patient_visits/?q=${pati_no}`);
            const data = await res.json();
            if (!data.success || !data.visits || data.visits.length === 0) {
                alert('لا توجد جلسات للمريض!');
                visitsList.innerHTML = '<div class="empty-message">لا توجد زيارات</div>';
                return;
            }

            currentPatient = data.patient_id;
            window.currentPatientName = data.patient_name;
            visitsData = sortVisits(data.visits);
            renderVisits();
            visitReport.innerHTML = `
                <div class="empty-report">
                    <div class="empty-icon">📋</div>
                    <h4>اختر زيارة</h4>
                    <p>اختر زيارة من القائمة لعرض التفاصيل</p>
                </div>
            `;
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء جلب بيانات المريض');
        }
    }

    if (newDate) {
        newDate.addEventListener('change', loadAvailablePeriods);
    }

    // ======================
    // إدارة أدوية العيادة والمريض
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
        document.querySelectorAll(`input[type="checkbox"][value="${id}"]`).forEach(cb => cb.checked = checked);
    }

    function searchDrugs() {
        if (!drugSearch) return;
        const query = drugSearch.value.toLowerCase();
        if (drugResults) drugResults.innerHTML = '';
        dentalTreatments.filter(d => d.name.toLowerCase().includes(query)).forEach(d => {
            const isChecked = selectedDrugs.get(d.id) || false;
            const div = createDrugDiv(d, isChecked);
            if (drugResults) drugResults.appendChild(div);
        });
    }

    function fetchPatientDrugs() {
        if (!patientIdInput || !doctorIdHidden || !visitNumberHidden || !patientDrugsResults) return;
        const patientId = patientIdInput.value;
        const doctorId = doctorIdHidden.value;
        const visitNumber = visitNumberHidden.value;
        patientDrugsResults.innerHTML = '';

        fetch(`/get_patient_drg/?patient_id=${patientId}&doctor_id=${doctorId}&visit_number=${visitNumber}`)
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
        if (!patientIdInput || !doctorIdHidden || !visitNumberHidden) return;
        const patientId = patientIdInput.value;
        const doctorId = doctorIdHidden.value;
        const visitNumber = visitNumberHidden.value;

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
                showToast(data.message || 'تم الحفظ بنجاح', 'success');
                selectedDrugs.clear();
                if (patientDrugsResults) patientDrugsResults.innerHTML = '';
                if (drugResults) drugResults.innerHTML = '';
                if (drugSearch) drugSearch.value = '';
                fetchPatientDrugs();
                searchPatient(currentPatient);
            })
            .catch(err => console.error(err));
    }

    if (drugSearch) drugSearch.addEventListener('input', searchDrugs);
    if (fetchPatientDrugsBtn) fetchPatientDrugsBtn.addEventListener('click', fetchPatientDrugs);
    if (saveDrugsBtn) saveDrugsBtn.addEventListener('click', savePatientDrugs);

    // ======================
    // أحداث إضافة الزيارة
    // ======================
    showAddProcedureBtn.addEventListener('click', function () {
        addProcedureForm.reset();
        selectedDrugs.clear();
        if (patientDrugsResults) patientDrugsResults.innerHTML = '';
        if (drugResults) drugResults.innerHTML = '';
        formTitle.innerText = '➕ إضافة زيارة جديدة';
        procedureContainer.style.display = 'block';
        labExamsContainer.style.display = 'block';

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        newDate.value = `${year}-${month}-${day}`;

        newTimeSlot.value = '';
        visitNumberInput.value = '';
        if (submitFormBtn) submitFormBtn.style.display = 'inline-block';
        if (submitFormBtn) submitFormBtn.onclick = addVisit;
        toggleForm();
    });

    createModals();

    window.currentVisit = currentVisit;
    Object.defineProperty(window, 'currentVisit', {
        get: function () { return currentVisit; },
        set: function (val) { currentVisit = val; }
    });

    await Promise.all([loadServices(), loadLabExams()]);
    await loadDentalTreatments();

    console.log('الصفحة جاهزة والبيانات محملة!');
});