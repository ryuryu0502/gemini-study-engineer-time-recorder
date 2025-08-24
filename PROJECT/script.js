document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js is running");
    // --- Common elements for both index.html and record.html ---
    const currentMonthEl = document.getElementById('current-month');
    const calendarGridEl = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month');

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

                // Highlight current day
                const today = new Date();
                if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                    dayCell.classList.add('bg-primary', 'text-white'); // Bootstrap classes for highlighting
                }

                dayCell.addEventListener('click', () => {
                    window.location.href = `record.html?date=${dayCell.dataset.date}`;
                });
                calendarGridEl.appendChild(dayCell);
            }
        }

        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar();
            });
        }

        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar();
            });
        }

        renderCalendar();
            updateStatistics();

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

            function updateStatistics() {
                const records = getLearningRecords();
                const currentYear = currentDate.getFullYear();
                const currentMonth = currentDate.getMonth();

                let totalMonthStudyMinutes = 0;
                let weekdayStudyMinutes = 0;
                let weekdayCount = 0;
                let weekendStudyMinutes = 0;
                let weekendCount = 0;

                records.forEach(record => {
                    const recordDate = new Date(record.date);
                    if (recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth) {
                        totalMonthStudyMinutes += record.studyTimeMinutes;

                        const dayOfWeek = recordDate.getDay(); // 0 for Sunday, 6 for Saturday
                        if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
                            weekendStudyMinutes += record.studyTimeMinutes;
                            weekendCount++;
                        } else { // Weekday
                            weekdayStudyMinutes += record.studyTimeMinutes;
                            weekdayCount++;
                        }
                    }
                });

                document.getElementById('total-month-time').textContent = minutesToHHMM(totalMonthStudyMinutes);
                document.getElementById('weekday-avg-time').textContent = weekdayCount > 0 ? minutesToHHMM(weekdayStudyMinutes / weekdayCount) : '--:--';
                document.getElementById('weekend-avg-time').textContent = weekendCount > 0 ? minutesToHHMM(weekendStudyMinutes / weekendCount) : '--:--';
            }
        // Handle backup button click
        const backupButton = document.getElementById('backup-button');
        if (backupButton) {
            backupButton.addEventListener('click', () => {
                const records = getLearningRecords(); // Reusing the function defined earlier
                const jsonString = JSON.stringify(records, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = 'learning_records_backup.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                alert('バックアップファイルをダウンロードしました！');
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
                <div class="row">
                    <div class="col-md-6">
                        <div class="input-group mb-1">
                            <span class="input-group-text">開始</span>
                            <input type="time" class="form-control break-start-time-input">
                            <button class="btn btn-outline-secondary current-time-btn" type="button">記入</button>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="input-group mb-2">
                            <span class="input-group-text">終了</span>
                            <input type="time" class="form-control break-end-time-input">
                            <button class="btn btn-outline-secondary current-time-btn" type="button">記入</button>
                            <button class="btn btn-outline-danger remove-break-time" type="button">削除</button>
                        </div>
                    </div>
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

            // Basic validation: Ensure end time is after start time for study session
            const startMinutes = timeToMinutes(startTime);
            const endMinutes = timeToMinutes(endTime);

            if (endMinutes <= startMinutes) {
                alert('終了時間は開始時間より後に設定してください。');
                return; // Prevent form submission
            }

            const breakTimes = [];
            let isValid = true; // Flag for break time validation
            document.querySelectorAll('.mb-3.border.p-2.rounded').forEach(group => { // Target the new group div
                const startInput = group.querySelector('.break-start-time-input');
                const endInput = group.querySelector('.break-end-time-input');
                if (startInput && endInput) {
                    const breakStartMinutes = timeToMinutes(startInput.value);
                    const breakEndMinutes = timeToMinutes(endInput.value);

                    if (breakEndMinutes <= breakStartMinutes) {
                        alert('休憩終了時間は休憩開始時間より後に設定してください。');
                        isValid = false; // Set a flag to prevent form submission
                        return; // Exit forEach loop
                    }
                    breakTimes.push({ start: startInput.value, end: endInput.value });
                }
            });

            if (!isValid) { // Check the flag after the loop
                return; // Prevent form submission if any break time is invalid
            }

            // Helper to convert HH:MM to minutes
            function timeToMinutes(timeStr) {
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes;
            }

            // Calculate total study time for the day
            const studyStartMinutes = timeToMinutes(startTime);
            const studyEndMinutes = timeToMinutes(endTime);
            let totalStudyMinutes = studyEndMinutes - studyStartMinutes;
            if (totalStudyMinutes < 0) { // Handle overnight sessions (simple case)
                totalStudyMinutes += 24 * 60;
            }

            // Calculate total break time for the day
            let totalBreakMinutes = 0;
            breakTimes.forEach(bt => {
                const breakStart = timeToMinutes(bt.start);
                const breakEnd = timeToMinutes(bt.end);
                let currentBreak = breakEnd - breakStart;
                if (currentBreak < 0) { // Handle overnight breaks
                    currentBreak += 24 * 60;
                }
                totalBreakMinutes += currentBreak;
            });

            // Actual net study time
            const netStudyMinutes = totalStudyMinutes - totalBreakMinutes;

            const record = {
                date: date,
                studyTimeMinutes: netStudyMinutes,
                breakTimeMinutes: totalBreakMinutes,
                rawStartTime: startTime,
                rawEndTime: endTime,
                rawBreakTimes: breakTimes // Keep raw times for backup/display if needed
            };

            // Load existing records, add new one, and save
            let records = JSON.parse(localStorage.getItem('learningRecords') || '[]');
            // Check if a record for this date already exists and update it
            const existingRecordIndex = records.findIndex(r => r.date === date);
            if (existingRecordIndex > -1) {
                records[existingRecordIndex] = record;
            } else {
                records.push(record);
            }
            localStorage.setItem('learningRecords', JSON.stringify(records));

            alert('記録を保存しました！');
            window.location.href = 'index.html'; // Redirect back to calendar
        });

        // Helper to convert minutes to HH:MM
        function minutesToHHMM(totalMinutes) {
            if (totalMinutes < 0) totalMinutes = 0; // Ensure non-negative
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }

        // Function to get all records from localStorage
        function getLearningRecords() {
            return JSON.parse(localStorage.getItem('learningRecords') || '[]');
        }

        // Function to save all records to localStorage
        function saveLearningRecords(records) {
            localStorage.setItem('learningRecords', JSON.stringify(records));
        }

    }
});

// Global helper functions (can be moved if preferred)
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToHHMM(totalMinutes) {
    if (totalMinutes < 0) totalMinutes = 0; // Ensure non-negative
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
