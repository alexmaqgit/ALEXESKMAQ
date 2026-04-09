document.addEventListener('DOMContentLoaded', function () {
    const placeholder = document.querySelector('.custom-select .placeholder');
    const optionsList = document.querySelector('.custom-select .options');
    const hiddenInput = document.getElementById('specialty');

    const daysContainer = document.getElementById('daysContainer');
    const slotsBox = document.getElementById('slotsBox');
    const slotInput = document.getElementById('slot_id');

    // جدول المواعيد
    const schedule = {
        surgery: {
            Monday: { work_from: 16, work_to: 21, book_from: 17, book_to: 19 },
            Tuesday: { work_from: 16, work_to: 21, book_from: 17, book_to: 19 },
            Wednesday: { work_from: 16, work_to: 21, book_from: 17, book_to: 20 },
            Thursday: { work_from: 16, work_to: 21, book_from: 17, book_to: 19 },
            Friday: { work_from: 16, work_to: 21, book_from: 17, book_to: 19 },
            Saturday: { work_from: 16, work_to: 21, book_from: 17, book_to: 18 },
            Sunday: { work_from: 16, work_to: 21, book_from: 17, book_to: 18 },
        },
        orthodontics: {
            Monday: { work_from: 14, work_to: 20, book_from: 15, book_to: 18 },
            Tuesday: { work_from: 14, work_to: 20, book_from: 15, book_to: 18 },
            Wednesday: { work_from: 14, work_to: 20, book_from: 15, book_to: 18 },
            Thursday: { work_from: 14, work_to: 20, book_from: 15, book_to: 19 },
            Friday: { work_from: 14, work_to: 20, book_from: 15, book_to: 18 },
            Saturday: { work_from: 14, work_to: 20, book_from: 15, book_to: 17 },
            Sunday: { work_from: 14, work_to: 20, book_from: 15, book_to: 17 },
        },
        cosmetic: {
            Monday: { work_from: 10, work_to: 18, book_from: 11, book_to: 16 },
            Tuesday: { work_from: 10, work_to: 18, book_from: 11, book_to: 16 },
            Wednesday: { work_from: 10, work_to: 18, book_from: 11, book_to: 16 },
            Thursday: { work_from: 10, work_to: 18, book_from: 11, book_to: 16 },
            Friday: { work_from: 10, work_to: 18, book_from: 11, book_to: 16 },
            Saturday: { work_from: 10, work_to: 18, book_from: 11, book_to: 16 },
            Sunday: { work_from: 10, work_to: 18, book_from: 11, book_to: 16 },
        },
    };

    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let selectedDay = null;

    // القائمة المخصصة
    placeholder.addEventListener('click', () => {
        optionsList.style.display = optionsList.style.display === 'block' ? 'none' : 'block';
    });

    optionsList.querySelectorAll('li').forEach(option => {
        option.addEventListener('click', () => {
            placeholder.innerText = option.innerText;
            hiddenInput.value = option.dataset.value;
            optionsList.style.display = 'none';
            placeholder.classList.add('selected');
            renderDays(); // عرض الأيام بعد اختيار التخصص
        });
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-select')) {
            optionsList.style.display = 'none';
        }
    });

    // عرض الأيام
    function renderDays() {
        daysContainer.innerHTML = '';
        slotsBox.innerHTML = '';
        slotInput.value = '';
        daysContainer.classList.remove('show');
        slotsBox.classList.remove('show');

        const selectedSpecialty = hiddenInput.value;
        if (!selectedSpecialty) return;

        allDays.forEach(day => {
            const div = document.createElement('div');
            div.className = 'day';
            div.innerText = day;

            if (schedule[selectedSpecialty][day]) {
                div.classList.add('available');
                div.onclick = () => {
                    selectedDay = day;
                    slotInput.value = '';
                    slotsBox.innerHTML = '';
                    document.querySelectorAll('.day').forEach(d => d.classList.remove('selected'));
                    div.classList.add('selected');
                    renderSlots();
                };
            } else {
                div.classList.add('disabled');
            }

            daysContainer.appendChild(div);
        });

        daysContainer.classList.add('show'); // إظهار الأيام تدريجياً
    }

    // عرض الأوقات
    function renderSlots() {
        const selectedSpecialty = hiddenInput.value;
        if (!selectedSpecialty || !selectedDay) return;

        const s = schedule[selectedSpecialty][selectedDay];
        for (let h = s.book_from; h <= s.book_to; h++) {
            addSlot(h, 0);
            if (h !== s.book_to) addSlot(h, 30);
        }
        slotsBox.classList.add('show'); // إظهار الأوقات تدريجياً
    }

    function addSlot(hour, minute) {
        const div = document.createElement('div');
        div.className = 'slot available';
        div.innerText = formatTime(hour, minute);
        div.onclick = () => {
            slotInput.value = div.innerText;
            document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
            div.classList.add('selected');
        };
        slotsBox.appendChild(div);
    }

    function formatTime(hour, minute) {
        const period = hour >= 12 ? 'م' : 'ص';
        const h = hour > 12 ? hour - 12 : hour;
        const m = minute === 0 ? '00' : minute;
        return `${h}:${m} ${period}`;
    }

    // التحقق قبل الإرسال
    const form = document.getElementById('bookingForm');
    form.addEventListener('submit', function (e) {
        if (!slotInput.value || !hiddenInput.value) {
            e.preventDefault();
            alert('⚠️ الرجاء اختيار التخصص واليوم والوقت قبل إرسال الحجز');
        }
    });
});
