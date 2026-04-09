// ============================================================
// المتغيرات العامة
// ============================================================
let editMode = false;
let editId = null;
let currentPage = 1;
let isLoading = false;
const pageSize = 20;
let searchTimer;

// ============================================================
// عناصر DOM
// ============================================================
const treatmentName = document.getElementById('treatmentName');
const usageInstructions = document.getElementById('usageInstructions');
const clinId = document.getElementById('clinId');
const submitBtn = document.getElementById('submitBtn');
const submitText = document.getElementById('submitText');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const searchInput = document.getElementById('searchInput');
const tableBody = document.getElementById('tableBody');
const resultCount = document.getElementById('resultCount');

// إنشاء زر تحميل المزيد إذا لم يكن موجوداً
let loadMoreBtn = document.getElementById('loadMoreBtn');
if (!loadMoreBtn) {
    loadMoreBtn = document.createElement('button');
    loadMoreBtn.id = 'loadMoreBtn';
    loadMoreBtn.innerText = 'تحميل المزيد';
    loadMoreBtn.style.display = 'none';
    document.body.appendChild(loadMoreBtn);
}

// ============================================================
// تعبئة معرف العيادة من الجلسة وجعله للقراءة فقط
// ============================================================
const sessionClinIdInput = document.getElementById('sessionClinId');
if (sessionClinIdInput && sessionClinIdInput.value) {
    clinId.value = sessionClinIdInput.value;
    clinId.readOnly = true;
    clinId.style.backgroundColor = '#f0f0f0';
}

// ============================================================
// الحصول على CSRF token (طريقة آمنة تعمل دائماً)
// ============================================================
function getCsrfToken() {
    const csrfInput = document.querySelector('#csrfForm input[name="csrfmiddlewaretoken"]');
    if (csrfInput && csrfInput.value) {
        return csrfInput.value;
    }
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
    if (cookieValue) {
        return cookieValue.split('=')[1];
    }
    return '';
}
const csrftoken = getCsrfToken();

// ============================================================
// دالة الإشعارات
// ============================================================
function showToast(msg, isError = false) {
    let toast = document.querySelector('.toast-message');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i> ${msg}`;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; background: ${isError ? '#dc3545' : '#28a745'};
        color: white; padding: 12px 20px; border-radius: 8px; z-index: 9999;
        font-family: 'Tajawal', sans-serif; font-size: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================================
// دالة هروب HTML (تتعامل مع أي نوع بيانات)
// ============================================================
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>]/g, m =>
        m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;')
    );
}

// ============================================================
// دالة هروب النصوص للاستخدام داخل onclick
// ============================================================
function escapeForJs(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

// ============================================================
// جلب البيانات من الخادم
// ============================================================
function fetchDrugs(reset = false) {
    if (isLoading) return;
    isLoading = true;

    if (reset) {
        currentPage = 1;
        tableBody.innerHTML = '';
        loadMoreBtn.style.display = 'none';
    }

    const query = searchInput.value.trim();

    const loadingRow = document.createElement('tr');
    loadingRow.id = 'loadingRow';
    loadingRow.innerHTML = '<td colspan="5" style="text-align:center">⏳ جاري التحميل...</td>';
    tableBody.appendChild(loadingRow);

    fetch(`/get_drugs/?q=${encodeURIComponent(query)}&page=${currentPage}&page_size=${pageSize}`)
        .then(res => res.json())
        .then(data => {
            const loadingEl = document.getElementById('loadingRow');
            if (loadingEl) loadingEl.remove();

            if (!data.success) {
                showToast(data.message || 'خطأ في جلب البيانات', true);
                return;
            }

            resultCount.innerText = `🔹 عدد النتائج: ${data.total}`;

            if (data.drugs.length === 0 && reset) {
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center">🚫 لا توجد نتائج</td></tr>`;
                return;
            }

            let html = '';
            for (const d of data.drugs) {
                const idHtml = escapeHtml(d.id);
                const nameHtml = escapeHtml(d.treatment_name);
                const instructionsHtml = escapeHtml(d.usage_instructions);
                const clinIdHtml = escapeHtml(d.clin_id);

                const nameJs = escapeForJs(d.treatment_name);
                const instructionsJs = escapeForJs(d.usage_instructions);
                const clinIdJs = escapeForJs(d.clin_id);

                html += `
                    <tr>
                        <td>${idHtml}</td>
                        <td>${nameHtml}</td>
                        <td>${instructionsHtml}</td>
                        <td>${clinIdHtml}</td>
                        <td>
                            <button onclick="editDrug(${d.id}, '${nameJs}', '${instructionsJs}', '${clinIdJs}')">✏️ تعديل</button>
                            <button onclick="deleteDrug(${d.id})">🗑️ حذف</button>
                        </td>
                    </tr>
                `;
            }

            if (reset) {
                tableBody.innerHTML = html;
            } else {
                tableBody.insertAdjacentHTML('beforeend', html);
            }

            if (data.has_more) {
                loadMoreBtn.style.display = 'block';
                currentPage++;
            } else {
                loadMoreBtn.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            showToast('خطأ في الاتصال بالخادم', true);
            const loadingEl = document.getElementById('loadingRow');
            if (loadingEl) loadingEl.remove();
        })
        .finally(() => {
            isLoading = false;
        });
}

// ============================================================
// البحث مع تأخير
// ============================================================
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        currentPage = 1;
        fetchDrugs(true);
    }, 300);
});

// ============================================================
// تحميل المزيد
// ============================================================
loadMoreBtn.addEventListener('click', () => fetchDrugs(false));

// ============================================================
// دالة التعديل
// ============================================================
function editDrug(id, name, instr, clin) {
    editMode = true;
    editId = id;

    treatmentName.value = name;
    usageInstructions.value = instr;
    clinId.value = clin;

    submitText.innerText = 'تحديث العلاج';
    cancelEditBtn.style.display = 'inline-block';
}

// ============================================================
// دالة الحذف
// ============================================================
async function deleteDrug(id) {
    if (!confirm('⚠️ متأكد من الحذف؟')) return;

    try {
        const res = await fetch(`/api/drugs/delete/${id}/`, {
            method: 'DELETE',
            headers: { 'X-CSRFToken': csrftoken }
        });
        const data = await res.json();

        if (data.success) {
            showToast('تم الحذف بنجاح');
            currentPage = 1;
            fetchDrugs(true);
        } else {
            showToast(data.message || 'فشل الحذف', true);
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast('خطأ في الاتصال أثناء الحذف', true);
    }
}

// ============================================================
// إعادة تعيين النموذج (مع الحفاظ على قيمة clinId من الجلسة)
// ============================================================
function resetForm() {
    treatmentName.value = '';
    usageInstructions.value = '';

    // إعادة تعبئة معرف العيادة من الجلسة (وليس تفريغه)
    const sessionClinIdInput = document.getElementById('sessionClinId');
    if (sessionClinIdInput && sessionClinIdInput.value) {
        clinId.value = sessionClinIdInput.value;
    } else {
        clinId.value = '';
    }

    editMode = false;
    editId = null;

    submitText.innerText = 'إضافة العلاج';
    cancelEditBtn.style.display = 'none';
}

// ============================================================
// إضافة أو تحديث علاج
// ============================================================
async function handleSubmit() {
    const name = treatmentName.value.trim();
    const instr = usageInstructions.value.trim();
    const clin = clinId.value.trim();

    if (!name || !clin) {
        showToast('الاسم ومعرف العيادة مطلوبان', true);
        return;
    }

    const payload = {
        treatment_name: name,
        usage_instructions: instr,
        clin_id: clin
    };

    try {
        const url = editMode ? `/api/drugs/update/${editId}/` : `/api/drugs/add/`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success) {
            showToast(editMode ? 'تم التحديث بنجاح' : 'تمت الإضافة بنجاح');
            resetForm();
            currentPage = 1;
            fetchDrugs(true);
        } else {
            showToast(data.message || 'حدث خطأ', true);
        }
    } catch (error) {
        console.error('Submit error:', error);
        showToast('خطأ في الاتصال', true);
    }
}

// ============================================================
// ربط الأزرار
// ============================================================
submitBtn.onclick = handleSubmit;
cancelEditBtn.onclick = resetForm;

// ============================================================
// تحميل أولي
// ============================================================
fetchDrugs(true);