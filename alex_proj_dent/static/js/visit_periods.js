document.addEventListener('DOMContentLoaded', function () {
    const periodsBody = document.getElementById('periodsBody');
    const form = document.getElementById('periodForm');

    const periodNumberInput = document.getElementById('period_number');
    const startTimeInput = document.getElementById('start_time');
    const endTimeInput = document.getElementById('end_time');

    let periods = [];

    // ================= تحميل الفترات =================
    function loadPeriods() {
        fetch('/visit-periods/list/')
            .then(res => res.json())
            .then(data => {
                periods = data.periods || [];
                renderTable();
            });
    }

    function renderTable() {
        periodsBody.innerHTML = '';
        periods.forEach((p, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.PERIOD_NUMBER}</td>
                <td>${p.START_TIME}</td>
                <td>${p.END_TIME}</td>
                <td>
                    <button class="btn-edit" onclick="editPeriod(${index})">✏️</button>
                    <button class="btn-delete" onclick="deletePeriod(${p.PERIOD_NUMBER})">🗑️</button>
                </td>
            `;
            periodsBody.appendChild(tr);
        });
    }

    // ================= إضافة/تعديل فترة =================
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const data = {
            period_number: parseInt(periodNumberInput.value),
            start_time: startTimeInput.value,
            end_time: endTimeInput.value,
        };

        fetch(`/visit-periods/add/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
            .then(res => res.json())
            .then(resData => {
                alert(resData.message);
                form.reset();
                loadPeriods(); // إعادة تحميل الفترات
            })
            .catch(err => {
                console.error(err);
                alert('❌ حدث خطأ أثناء إضافة/تعديل الفترة');
            });
    });

    // ================= تعديل فترة =================
    window.editPeriod = function (index) {
        const p = periods[index];
        periodNumberInput.value = p.PERIOD_NUMBER;
        startTimeInput.value = p.START_TIME;
        endTimeInput.value = p.END_TIME;
    };

    // ================= حذف فترة =================
    window.deletePeriod = function (period_number) {
        if (confirm('هل أنت متأكد من الحذف؟')) {
            fetch(`/visit-periods/delete/${period_number}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                },
            })
                .then(res => res.json())
                .then(data => {
                    alert(data.message);
                    loadPeriods();
                })
                .catch(err => {
                    console.error(err);
                    alert('❌ حدث خطأ أثناء الحذف');
                });
        }
    };

    // ================= تحميل الفترات عند فتح الصفحة =================
    loadPeriods();
});
