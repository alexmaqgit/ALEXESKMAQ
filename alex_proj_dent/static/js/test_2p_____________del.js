// ================================
// البحث التفاعلي عن الحالات المرضية
// ================================

const conditionInput = document.getElementById('conditionInput');
const suggestionsBox = document.getElementById('conditionSuggestions');
const clinicField = document.getElementById('clinicSelect'); // حقل العيادة

let dentalConditions = [];

// جلب بيانات الحالات عند تحميل الصفحة
async function loadDentalConditions() {
    try {
        const res = await fetch('/get_dental_conditions/'); // endpoint يرجع JSON بالحالات
        const data = await res.json();
        console.log(' loadDentalConditions_data=', data);
        if (data && Array.isArray(data.conditions)) {
            dentalConditions = data.conditions;
        }
    } catch (e) {
        console.error('خطأ في تحميل الحالات:', e);
    }
}

// عرض الاقتراحات أثناء الكتابة
function showSuggestions(value) {
    suggestionsBox.innerHTML = '';
    if (!value) return;

    const filtered = dentalConditions.filter(
        c =>
            (c.CONDITION_NAME_AR &&
                c.CONDITION_NAME_AR.toLowerCase().includes(value.toLowerCase())) ||
            (c.CONDITION_NAME_EN && c.CONDITION_NAME_EN.toLowerCase().includes(value.toLowerCase()))
    );

    filtered.forEach(c => {
        const div = document.createElement('div');
        div.textContent = `${c.CONDITION_NAME_AR} / ${c.CONDITION_NAME_EN}`;
        div.addEventListener('click', () => {
            conditionInput.value = c.CONDITION_NAME_AR; // يظهر بالعربي
            if (c.CLINIC_ID) clinicField.value = c.CLINIC_ID; // ملء العيادة تلقائيًا
            suggestionsBox.innerHTML = '';
        });
        suggestionsBox.appendChild(div);
    });
}

// الحدث عند الكتابة
conditionInput.addEventListener('input', e => {
    showSuggestions(e.target.value);
});

// إخفاء الاقتراحات عند الضغط خارج الحقل
document.addEventListener('click', e => {
    if (!conditionInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.innerHTML = '';
    }
});

// استدعاء عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', loadDentalConditions);
