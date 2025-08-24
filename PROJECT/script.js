document.addEventListener('DOMContentLoaded', () => {
    // --- Common elements for both index.html and record.html ---
    const currentMonthEl = document.getElementById('current-month');
    const calendarGridEl = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');

    let currentDate = new Date();

    // --- Calendar rendering logic (from index.html) ---
    if (calendarGridEl) { // Check if we are on index.html
        function renderCalendar() {
            calendarGridEl.innerHTML = '';
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            currentMonthEl.textContent = `${year}年 ${month + 1}月`;

            const firstDayOfMonth = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
            dayNames.forEach(day => {
                const dayNameEl = document.createElement('div');
                dayNameEl.classList.add('day-name');
                dayNameEl.textContent = day;
                calendarGridEl.appendChild(dayNameEl);
            });

            for (let i = 0; i < firstDayOfMonth; i++) {
                const emptyCell = document.createElement('div');
                calendarGridEl.appendChild(emptyCell);
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dayCell = document.createElement('div');
                dayCell.classList.add('day');
                dayCell.textContent = day;
                dayCell.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; // Add data-date attribute
                dayCell.addEventListener('click', () => {
                    window.location.href = `record.html?date=${dayCell.dataset.date}`;
                });
                calendarGridEl.appendChild(dayCell);
            }
        }

        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });

        renderCalendar();

        // Handle FAB click
        const addRecordFab = document.getElementById('add-record-fab');
        if (addRecordFab) {
            addRecordFab.addEventListener('click', () => {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                window.location.href = `record.html?date=${year}-${month}-${day}`;
            });
        }
    }

    // --- Record form logic (for record.html) ---
    const recordForm = document.getElementById('record-form');
    if (recordForm) { // Check if we are on record.html
        const recordDateInput = document.getElementById('record-date');
        const startTimeInput = document.getElementById('start-time'); // New
        const endTimeInput = document.getElementById('end-time');     // New
        const breakTimesContainer = document.getElementById('break-times-container');
        const addBreakTimeBtn = document.getElementById('add-break-time');

        // Function to get current time in HH:MM format
        function getCurrentTime() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        }

        // Event delegation for "現在時刻を記入" buttons
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('current-time-btn')) {
                const inputElement = event.target.previousElementSibling; // The input field before the button
                if (inputElement && (inputElement.id === 'start-time' || inputElement.id === 'end-time' || inputElement.classList.contains('break-start-time-input') || inputElement.classList.contains('break-end-time-input'))) { // Updated for break times
                    inputElement.value = getCurrentTime();
                }
            }
        });

        // Pre-fill date if provided in URL
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');
        if (dateParam) {
            recordDateInput.value = dateParam;
        } else {
            // Default to today's date if no date param
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            recordDateInput.value = `${year}-${month}-${day}`;
        }

        addBreakTimeBtn.addEventListener('click', () => {
            const newBreakTimeGroup = document.createElement('div');
            newBreakTimeGroup.classList.add('mb-3', 'border', 'p-2', 'rounded'); // Add some styling for clarity
            newBreakTimeGroup.innerHTML = `
                <label class="form-label">休憩時間</label>
                <div class="input-group mb-1">
                    <span class="input-group-text">開始</span>
                    <input type="time" class="form-control break-start-time-input">
                    <button class="btn btn-outline-secondary current-time-btn" type="button">記入</button>
                </div>
                <div class="input-group mb-2">
                    <span class="input-group-text">終了</span>
                    <input type="time" class="form-control break-end-time-input">
                    <button class="btn btn-outline-secondary current-time-btn" type="button">記入</button>
                    <button class="btn btn-outline-danger remove-break-time" type="button">削除</button>
                </div>
            `;
            breakTimesContainer.appendChild(newBreakTimeGroup);
        });

        // Event delegation for remove buttons
        breakTimesContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-break-time')) {
                event.target.closest('.mb-3.border.p-2.rounded').remove(); // Target the group div
            }
        });

        recordForm.addEventListener('submit', (event) => {
            event.preventDefault();
            // Here you would collect the data and save it (e.g., to localStorage)
            const date = recordDateInput.value;
            const startTime = startTimeInput.value;
            const endTime = endTimeInput.value;

            const breakTimes = [];
            document.querySelectorAll('.mb-3.border.p-2.rounded').forEach(group => { // Target the new group div
                const startInput = group.querySelector('.break-start-time-input');
                const endInput = group.querySelector('.break-end-time-input');
                if (startInput && endInput) {
                    breakTimes.push({ start: startInput.value, end: endInput.value });
                }
            });

            console.log('記録データ:', { date, startTime, endTime, breakTimes });
            alert('記録を保存しました！（実際にはまだ保存されません）'); // Placeholder for saving

            // Optionally redirect back to calendar or clear form
            // window.location.href = 'index.html';
        });
    }
});