// ============================================================
// 1. تعريف المتغيرات العامة
// ============================================================
const tableBody = document.querySelector('#patientsTable tbody');

// --- عناصر النافذة المنبثقة (المودال) ---
const modalClinicSelect = document.getElementById('modalClinicSelect');
const modalDoctorSelect = document.getElementById('modalDoctorSelect');
const modalVisitDate = document.getElementById('modalNewDate');
const modalPeriodSelect = document.getElementById('modalNewTimeSlot');
const modalConditionInput = document.getElementById('modalConditionInput');
const modalSuggestionsBox = document.getElementById('modalConditionSuggestions');

// --- عناصر النافذة المنبثقة نفسها ---
const appointmentModal = document.getElementById('appointmentModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelAppointmentBtn = document.getElementById('cancelAppointmentBtn');
const modalSaveAppointmentBtn = document.getElementById('modalSaveAppointmentBtn');

// --- بحث المرضى ---
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

// --- البحث التلقائي للحالات المرضية في الصفحة الرئيسية (إذا وجد) ---
const conditionInput = document.getElementById('conditionInput');
const suggestionsBox = document.getElementById('conditionSuggestions');
let suggestions = [];
let selectedIndex = -1;

// --- عناصر البطاقات والأزرار ---
const appointmentCard = document.getElementById('appointmentCard');
const tempAppointmentsCard = document.getElementById('tempAppointmentsCard');
const showAppointmentBtn = document.getElementById('showAppointmentBtn');
const showTempAppointmentsBtn = document.getElementById('showTempAppointmentsBtn');
const closeAppointmentBtn = document.getElementById('closeAppointmentBtn');
const closeTempBtn = document.getElementById('closeTempBtn');
const clearFormBtn = document.getElementById('clearFormBtn');

// متغيرات للبحث التلقائي في المودال
let modalSuggestions = [];
let modalSelectedIndex = -1;

// ============================================================
// 2. التحقق من اكتمال حقول المريض وتعطيل/تفعيل زر الموعد
// ============================================================
const patientRequiredFields = ['patientName', 'age', 'phone', 'currentAddress'];

function checkPatientFormComplete() {
    if (!showAppointmentBtn) return;
    
    let allFilled = true;
    patientRequiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            allFilled = false;
        }
    });
    
    const genderField = document.getElementById('gender');
    if (genderField && !genderField.value) {
        allFilled = false;
    }
    
    showAppointmentBtn.disabled = !allFilled;
    showAppointmentBtn.title = showAppointmentBtn.disabled ? 'الرجاء تعبئة جميع بيانات المريض أولاً' : 'حجز موعد';
}

// مراقبة التغييرات في حقول المريض
patientRequiredFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
        field.addEventListener('input', checkPatientFormComplete);
        field.addEventListener('change', checkPatientFormComplete);
    }
});

const genderField = document.getElementById('gender');
if (genderField) {
    genderField.addEventListener('change', checkPatientFormComplete);
}

// ============================================================
// 3. وظائف النافذة المنبثقة
// ============================================================

function openAppointmentModal() {
    const filePatNo = document.getElementById('filePatNo').value;
    if (!filePatNo) {
        alert('الرجاء اختيار مريض أولاً من خلال البحث');
        return;
    }
    
    checkPatientFormComplete();
    if (showAppointmentBtn && showAppointmentBtn.disabled) {
        alert('الرجاء تعبئة جميع بيانات المريض أولاً');
        return;
    }
    
    // إعادة تعيين حقول الحجز في المودال
    if (modalConditionInput) modalConditionInput.value = '';
    if (modalClinicSelect) modalClinicSelect.value = '';
    if (modalDoctorSelect) modalDoctorSelect.innerHTML = '<option value="" disabled selected>اختر الدكتور</option>';
    if (modalVisitDate) modalVisitDate.value = '';
    if (modalPeriodSelect) modalPeriodSelect.innerHTML = '<option value="" disabled selected>اختر الفترة</option>';
    if (modalSuggestionsBox) modalSuggestionsBox.innerHTML = '';
    
    if (appointmentModal) {
        appointmentModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeAppointmentModal() {
    if (appointmentModal) {
        appointmentModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============================================================
// 4. البحث عن المرضى (قائمة منسدلة)
// ============================================================
function performSearch() {
    const query = searchInput.value.trim();
    if (!query) {
        searchResults.innerHTML = '';
        searchResults.classList.remove('active');
        return;
    }
    fetch(`/get_patients/?q=${query}`)
        .then(res => res.json())
        .then(data => {
            searchResults.innerHTML = '';
            if (data.success && data.patients.length > 0) {
                data.patients.forEach(p => {
                    const div = document.createElement('div');
                    div.className = 'search-result-item';
                    div.innerHTML = `
                        <span class="search-result-name">${p.name}</span>
                        <span class="search-result-file">رقم الملف: ${p.file_pat_no}</span>
                    `;
                    div.addEventListener('click', () => {
                        document.getElementById('filePatNo').value = p.file_pat_no;
                        document.getElementById('patientName').value = p.name;
                        document.getElementById('age').value = p.age;
                        document.getElementById('phone').value = p.phone;
                        document.getElementById('gender').value = p.gender;
                        document.getElementById('currentAddress').value = p.current_address || '';
                        document.getElementById('registrationDate').value = p.registration_date;
                        searchResults.innerHTML = '';
                        searchResults.classList.remove('active');
                        searchInput.value = p.name;
                        checkPatientFormComplete();
                    });
                    searchResults.appendChild(div);
                });
                searchResults.classList.add('active');
            } else {
                const noResult = document.createElement('div');
                noResult.className = 'search-result-item';
                noResult.textContent = '🔍 لا توجد نتائج مطابقة';
                noResult.style.cursor = 'default';
                noResult.style.justifyContent = 'center';
                searchResults.appendChild(noResult);
                searchResults.classList.add('active');
            }
        })
        .catch(err => {
            console.error("Search error:", err);
            searchResults.innerHTML = '<div class="search-result-item">⚠️ حدث خطأ في البحث</div>';
            searchResults.classList.add('active');
        });
}

// ربط حدث البحث
let debounceTimer;
if (searchInput) {
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(performSearch, 300);
    });
}

document.addEventListener('click', (e) => {
    if (searchInput && searchResults && !searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.remove('active');
    }
});

if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && searchResults.children.length > 0) {
            const firstItem = searchResults.querySelector('.search-result-item');
            if (firstItem) firstItem.click();
        }
    });
}

// ============================================================
// 5. البحث التلقائي للحالات المرضية (للمودال)
// ============================================================
async function searchModalConditions(query) {
    if (!query) {
        if (modalSuggestionsBox) modalSuggestionsBox.innerHTML = '';
        return;
    }
    try {
        const res = await fetch(`/get_dental_conditions/?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
            modalSuggestions = data.conditions;
            renderModalSuggestions();
        } else {
            console.error("خطأ في جلب الحالات:", data.message);
        }
    } catch (e) {
        console.error(e);
    }
}

function renderModalSuggestions() {
    if (!modalSuggestionsBox) return;
    modalSuggestionsBox.innerHTML = '';
    modalSelectedIndex = -1;
    modalSuggestions.forEach((c, index) => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = `${c.CONDITION_NAME_AR} / ${c.CONDITION_NAME_EN}`;
        div.addEventListener('click', () => selectModalCondition(index));
        modalSuggestionsBox.appendChild(div);
    });
}

function selectModalCondition(index) {
    const c = modalSuggestions[index];
    if (modalConditionInput) modalConditionInput.value = c.CONDITION_NAME_AR;
    if (c.CLINIC_ID && modalClinicSelect) {
        modalClinicSelect.value = c.CLINIC_ID;
        loadModalDoctors(c.CLINIC_ID);
    }
    if (modalSuggestionsBox) modalSuggestionsBox.innerHTML = '';
}

if (modalConditionInput) {
    modalConditionInput.addEventListener('input', e => {
        searchModalConditions(e.target.value);
    });

    modalConditionInput.addEventListener('keydown', e => {
        const items = modalSuggestionsBox ? modalSuggestionsBox.querySelectorAll('.suggestion-item') : [];
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            modalSelectedIndex++;
            if (modalSelectedIndex >= items.length) modalSelectedIndex = 0;
            highlightModalSuggestion(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            modalSelectedIndex--;
            if (modalSelectedIndex < 0) modalSelectedIndex = items.length - 1;
            highlightModalSuggestion(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (modalSelectedIndex >= 0) selectModalCondition(modalSelectedIndex);
        } else if (e.key === 'Escape') {
            if (modalSuggestionsBox) modalSuggestionsBox.innerHTML = '';
        }
    });
}

function highlightModalSuggestion(items) {
    items.forEach(i => i.classList.remove('active'));
    if (items[modalSelectedIndex]) items[modalSelectedIndex].classList.add('active');
}

document.addEventListener('click', e => {
    if (modalConditionInput && modalSuggestionsBox && 
        !modalConditionInput.contains(e.target) && 
        !modalSuggestionsBox.contains(e.target)) {
        if (modalSuggestionsBox) modalSuggestionsBox.innerHTML = '';
    }
});

// ============================================================
// 6. وظائف الحجوزات المؤقتة
// ============================================================

function showTempAppointments() {
    if (tempAppointmentsCard) {
        tempAppointmentsCard.style.display = 'block';
        if (appointmentCard) appointmentCard.style.display = 'none';
        tempAppointmentsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        loadTempAppointments();
    }
}

function hideTempCard() {
    if (tempAppointmentsCard) tempAppointmentsCard.style.display = 'none';
}

function loadTempAppointments() {
    const tempResults = document.getElementById('tempResults');
    if (!tempResults) return;
    
    tempResults.innerHTML = '<div style="text-align:center;padding:1rem;">جاري التحميل...</div>';
    
    fetch('/get_temp_appointments/')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.appointments && data.appointments.length > 0) {
                tempResults.innerHTML = '';
                data.appointments.forEach(app => {
                    const div = document.createElement('div');
                    div.className = 'temp-appointment-item';
                    div.style.cssText = 'border:1px solid #e2edf2;border-radius:12px;padding:1rem;margin-bottom:0.8rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;';
                    div.innerHTML = `
                        <div class="temp-appointment-info" style="flex:1;">
                            <strong>👤 ${app.patient_name}</strong>
                            <span style="margin-right:1rem;">📅 ${app.visit_date}</span>
                            <span style="margin-right:1rem;">🕐 ${app.period_label}</span>
                            <span style="margin-right:1rem;">👨‍⚕️ ${app.doctor_name}</span>
                        </div>
                        <button class="confirm-temp-btn" data-id="${app.id}" style="background:#10b981;color:white;border:none;padding:0.5rem 1rem;border-radius:12px;cursor:pointer;">تأكيد الحجز</button>
                    `;
                    tempResults.appendChild(div);
                });
                
                document.querySelectorAll('.confirm-temp-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        confirmTempAppointment(btn.dataset.id);
                    });
                });
            } else {
                tempResults.innerHTML = '<div style="text-align:center;padding:1rem;">📭 لا توجد حجوزات مؤقتة</div>';
            }
        })
        .catch(err => {
            console.error('Error:', err);
            tempResults.innerHTML = '<div style="text-align:center;padding:1rem;">⚠️ خطأ في التحميل</div>';
        });
}

function confirmTempAppointment(appointmentId) {
    if (confirm('هل تريد تأكيد هذا الحجز؟')) {
        fetch(`/confirm_temp_appointment/${appointmentId}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            if (data.success) {
                loadTempAppointments();
            }
        })
        .catch(err => {
            console.error('Error:', err);
            alert('حدث خطأ في تأكيد الحجز');
        });
    }
}

// ============================================================
// 7. وظائف مسح الحقول وحفظ الموعد
// ============================================================

function clearAllFields() {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟')) {
        document.getElementById('patientForm').reset();
        
        // مسح حقول المودال إذا وجدت
        if (modalConditionInput) modalConditionInput.value = '';
        if (modalSuggestionsBox) modalSuggestionsBox.innerHTML = '';
        if (modalClinicSelect) modalClinicSelect.value = '';
        if (modalDoctorSelect) modalDoctorSelect.innerHTML = '<option value="" disabled selected>اختر الدكتور</option>';
        if (modalVisitDate) modalVisitDate.value = '';
        if (modalPeriodSelect) modalPeriodSelect.innerHTML = '<option value="" disabled selected>اختر الفترة</option>';
        
        if (searchInput) {
            searchInput.value = '';
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
        }
        generateFileNo();
        
        const dateInput = document.getElementById('registrationDate');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        
        if (appointmentCard) appointmentCard.style.display = 'none';
        if (tempAppointmentsCard) tempAppointmentsCard.style.display = 'none';
        
        checkPatientFormComplete();
    }
}

function saveModalAppointment() {
    const filePatNo = document.getElementById('filePatNo').value;
    const condition = modalConditionInput ? modalConditionInput.value : '';
    const clinicId = modalClinicSelect ? modalClinicSelect.value : '';
    const doctorId = modalDoctorSelect ? modalDoctorSelect.value : '';
    const visitDateValue = modalVisitDate ? modalVisitDate.value : '';
    const period = modalPeriodSelect ? modalPeriodSelect.value : '';
    
    if (!filePatNo) {
        alert('الرجاء اختيار مريض أولاً');
        return;
    }
    
    if (!condition || !clinicId || !doctorId || !visitDateValue || !period) {
        alert('الرجاء تعبئة جميع حقول حجز الموعد');
        return;
    }
    
    const payload = {
            file_pat_no: document.getElementById('filePatNo').value,
            name: document.getElementById('patientName').value,
            age: document.getElementById('age').value,
            phone: document.getElementById('phone').value,
            gender: document.getElementById('gender').value,
            current_address: document.getElementById('currentAddress').value,
            registration_date: document.getElementById('registrationDate').value,
            frist_che: '',
            clinic_id: '',
            doctor_id: '',
            date_visit: '',
            proid_visit: '',
        };
    
    fetch('/add_patient/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        if (data.success) {
            closeAppointmentModal();
            if (modalConditionInput) modalConditionInput.value = '';
            if (modalVisitDate) modalVisitDate.value = '';
            if (modalPeriodSelect) modalPeriodSelect.innerHTML = '<option value="" disabled selected>اختر الفترة</option>';
        }
    })
    .catch(err => {
        console.error('Error:', err);
        alert('حدث خطأ في حفظ الموعد');
    });
}

// ============================================================
// 8. وظائف إدارة المرضى
// ============================================================

function generateFileNo() {
    fetch('/generate_file_no/')
        .then(res => res.json())
        .then(data => {
            let newFileNo;
            const year = new Date().getFullYear();
            const yearSuffix = year.toString().slice(-2);
            if (data.success) {
                const lastNo = parseInt(data.last_file_no) || 0;
                newFileNo = lastNo > 0 ? lastNo + 1 : parseInt(yearSuffix + '01');
            } else {
                newFileNo = parseInt(yearSuffix + '01');
            }
            const filePatNoInput = document.getElementById('filePatNo');
            if (filePatNoInput) filePatNoInput.value = newFileNo;
        });
}

// إضافة مريض جديد
const patientForm = document.getElementById('patientForm');
if (patientForm) {
    patientForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const requiredFields = ['patientName', 'age', 'phone', 'gender', 'currentAddress'];
        let isValid = true;
        requiredFields.forEach(field => {
            const input = document.getElementById(field);
            if (input && !input.value) {
                isValid = false;
                input.style.borderColor = '#ef4444';
            } else if (input) {
                input.style.borderColor = '#e2edf2';
            }
        });
        
        if (!isValid) {
            alert('الرجاء تعبئة جميع الحقول الإلزامية');
            return;
        }
        
        const payload = {
            file_pat_no: document.getElementById('filePatNo').value,
            name: document.getElementById('patientName').value,
            age: document.getElementById('age').value,
            phone: document.getElementById('phone').value,
            gender: document.getElementById('gender').value,
            current_address: document.getElementById('currentAddress').value,
            registration_date: document.getElementById('registrationDate').value,
            frist_che: '',
            clinic_id: '',
            doctor_id: '',
            date_visit: '',
            proid_visit: '',
        };
        
        fetch('/add_patient/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            resetAllAndReloadFileNo();
        })
        .catch(err => {
            console.error('Error:', err);
            alert('حدث خطأ في إضافة المريض');
        });
    });
}

function resetAllAndReloadFileNo() {
    const patientFormEl = document.getElementById('patientForm');
    if (patientFormEl) patientFormEl.reset();
    
    if (modalConditionInput) modalConditionInput.value = '';
    if (modalSuggestionsBox) modalSuggestionsBox.innerHTML = '';
    if (modalClinicSelect) modalClinicSelect.value = '';
    if (modalDoctorSelect) modalDoctorSelect.innerHTML = '<option value="" disabled selected>اختر الدكتور</option>';
    if (modalVisitDate) modalVisitDate.value = '';
    if (modalPeriodSelect) modalPeriodSelect.innerHTML = '<option value="" disabled selected>اختر الفترة</option>';
    
    generateFileNo();
    if (appointmentCard) appointmentCard.style.display = 'none';
    if (tempAppointmentsCard) tempAppointmentsCard.style.display = 'none';
    checkPatientFormComplete();
}

// تعديل بيانات المريض
const updatePatientBtn = document.getElementById('updatePatientBtn');
if (updatePatientBtn) {
    updatePatientBtn.addEventListener('click', function() {
        const fileNo = document.getElementById('filePatNo').value;
        if (!fileNo) { 
            alert('الرجاء اختيار مريض أولاً!'); 
            return; 
        }
        
        const payload = {
            name: document.getElementById('patientName').value,
            age: document.getElementById('age').value,
            phone: document.getElementById('phone').value,
            gender: document.getElementById('gender').value,
            current_address: document.getElementById('currentAddress').value,
            reg_date: document.getElementById('registrationDate').value,
        };
        
        fetch(`/update_patient/${fileNo}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            resetAllAndReloadFileNo();
        })
        .catch(err => {
            console.error('Error:', err);
            alert('حدث خطأ في تعديل البيانات');
        });
    });
}

// ============================================================
// 9. تحميل العيادات والأطباء والفترات (للمودال)
// ============================================================

async function loadModalBranches() {
    if (!modalClinicSelect) return;
    try {
        const res = await fetch('/get_clin/');
        const data = await res.json();
        modalClinicSelect.innerHTML = '<option value="">اختر العيادة</option>';
        if (data && Array.isArray(data.users)) {
            data.users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.CLINIC_ID;
                option.textContent = user.CLINIC_NAME;
                modalClinicSelect.appendChild(option);
            });
        }
    } catch (e) { console.error(e); }
}

async function loadModalDoctors(clinicId) {
    if (!modalDoctorSelect) return;
    modalDoctorSelect.innerHTML = '<option value="" disabled selected>اختر الدكتور</option>';
    if (!clinicId) return;
    try {
        const res = await fetch(`/get_doctors/?clinic_id=${clinicId}`);
        const data = await res.json();
        if (data && Array.isArray(data.doctors)) {
            data.doctors.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.DOCTOR_ID;
                option.textContent = doc.DOCTOR_NAME;
                modalDoctorSelect.appendChild(option);
            });
        }
    } catch (e) { console.error(e); }
}

async function loadModalAvailablePeriods() {
    if (!modalDoctorSelect || !modalVisitDate || !modalPeriodSelect) return;
    const doctorId = modalDoctorSelect.value;
    const date = modalVisitDate.value;
    if (!doctorId || !date) {
        modalPeriodSelect.innerHTML = '<option value="" disabled selected>اختر الفترة</option>';
        return;
    }
    const today = new Date(); 
    today.setHours(0,0,0,0);
    const selectedDate = new Date(date + 'T00:00:00');
    if (selectedDate < today) {
        alert('لا يمكن الحجز في تاريخ ماضي');
        modalPeriodSelect.innerHTML = '<option value="" disabled selected>اختر الفترة</option>';
        return;
    }
    modalPeriodSelect.innerHTML = '<option value="" disabled>جاري التحميل...</option>';
    try {
        let url = `/get_available_periods/?doctor_id=${doctorId}&visit_date=${date}`;
        if (modalClinicSelect && modalClinicSelect.value) url += `&clinic_id=${modalClinicSelect.value}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        if (!data.periods || data.periods.length === 0) {
            modalPeriodSelect.innerHTML = '<option value="" disabled>لا توجد فترات متاحة</option>';
            return;
        }
        modalPeriodSelect.innerHTML = '<option value="" disabled selected>اختر الفترة</option>';
        const now = new Date();
        data.periods.forEach(p => {
            const option = document.createElement('option');
            option.value = p.period_no;
            option.textContent = p.label;
            if (selectedDate.toDateString() === today.toDateString()) {
                const [h, m] = p.start_time.split(':').map(Number);
                const periodTime = new Date();
                periodTime.setHours(h, m, 0, 0);
                if (periodTime < now) {
                    option.disabled = true;
                    option.textContent += ' (انتهت)';
                }
            }
            modalPeriodSelect.appendChild(option);
        });
    } catch (e) {
        console.error(e);
        modalPeriodSelect.innerHTML = '<option value="" disabled>خطأ في الاتصال</option>';
    }
}

// ============================================================
// 10. ربط الأحداث
// ============================================================

if (modalClinicSelect) {
    modalClinicSelect.addEventListener('change', () => loadModalDoctors(modalClinicSelect.value));
}
if (modalDoctorSelect) {
    modalDoctorSelect.addEventListener('change', loadModalAvailablePeriods);
}
if (modalVisitDate) {
    modalVisitDate.addEventListener('change', loadModalAvailablePeriods);
}
if (showAppointmentBtn) {
    showAppointmentBtn.addEventListener('click', openAppointmentModal);
}
if (showTempAppointmentsBtn) {
    showTempAppointmentsBtn.addEventListener('click', showTempAppointments);
}
if (closeAppointmentBtn) {
    closeAppointmentBtn.addEventListener('click', () => {
        if (appointmentCard) appointmentCard.style.display = 'none';
    });
}
if (closeTempBtn) {
    closeTempBtn.addEventListener('click', hideTempCard);
}
if (modalSaveAppointmentBtn) {
    modalSaveAppointmentBtn.addEventListener('click', saveModalAppointment);
}
if (clearFormBtn) {
    clearFormBtn.addEventListener('click', clearAllFields);
}
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeAppointmentModal);
}
if (cancelAppointmentBtn) {
    cancelAppointmentBtn.addEventListener('click', closeAppointmentModal);
}
if (appointmentModal) {
    appointmentModal.addEventListener('click', (e) => {
        if (e.target === appointmentModal) {
            closeAppointmentModal();
        }
    });
}

// البحث في الحجوزات المؤقتة
const tempSearch = document.getElementById('tempSearch');
if (tempSearch) {
    let tempDebounceTimer;
    tempSearch.addEventListener('input', () => {
        clearTimeout(tempDebounceTimer);
        tempDebounceTimer = setTimeout(() => {
            const query = tempSearch.value.trim();
            if (query) {
                fetch(`/search_temp_appointments/?q=${encodeURIComponent(query)}`)
                    .then(res => res.json())
                    .then(data => {
                        const tempResults = document.getElementById('tempResults');
                        if (!tempResults) return;
                        if (data.success && data.appointments && data.appointments.length > 0) {
                            tempResults.innerHTML = '';
                            data.appointments.forEach(app => {
                                const div = document.createElement('div');
                                div.className = 'temp-appointment-item';
                                div.style.cssText = 'border:1px solid #e2edf2;border-radius:12px;padding:1rem;margin-bottom:0.8rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;';
                                div.innerHTML = `
                                    <div class="temp-appointment-info" style="flex:1;">
                                        <strong>👤 ${app.patient_name}</strong>
                                        <span style="margin-right:1rem;">📅 ${app.visit_date}</span>
                                        <span style="margin-right:1rem;">🕐 ${app.period_label}</span>
                                        <span style="margin-right:1rem;">👨‍⚕️ ${app.doctor_name}</span>
                                    </div>
                                    <button class="confirm-temp-btn" data-id="${app.id}" style="background:#10b981;color:white;border:none;padding:0.5rem 1rem;border-radius:12px;cursor:pointer;">تأكيد الحجز</button>
                                `;
                                tempResults.appendChild(div);
                            });
                        } else {
                            tempResults.innerHTML = '<div style="text-align:center;padding:1rem;">🔍 لا توجد نتائج</div>';
                        }
                    });
            } else {
                loadTempAppointments();
            }
        }, 300);
    });
}

// ============================================================
// 11. تهيئة الصفحة عند التحميل
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('registrationDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    
    if (appointmentCard) appointmentCard.style.display = 'none';
    if (tempAppointmentsCard) tempAppointmentsCard.style.display = 'none';
    if (appointmentModal) appointmentModal.classList.remove('active');
    
    loadModalBranches();
    generateFileNo();
    checkPatientFormComplete();
});