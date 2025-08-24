document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js is running");

    // --- Global Helper Functions ---
    function getLearningRecords() {
        return JSON.parse(localStorage.getItem('learningRecords') || '[]');
    }

    function saveLearningRecords(records) {
        localStorage.setItem('learningRecords', JSON.stringify(records));
    }

    function getMonthlyGoal() {
        return JSON.parse(localStorage.getItem('monthlyGoalHours'));
    }

    function saveMonthlyGoal(hours) {
        localStorage.setItem('monthlyGoalHours', JSON.stringify(hours));
    }

    function timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    function minutesToHHMM(totalMinutes) {
        if (isNaN(totalMinutes) || totalMinutes < 0) totalMinutes = 0;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60); // Round to nearest minute
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }


    // --- Page Initialization ---
    const calendarGridEl = document.getElementById('calendar-grid');
    const recordFormEl = document.getElementById('record-form');

    if (calendarGridEl) {
        initCalendarPage();
    }

    if (recordFormEl) {
        initRecordPage();
    }


    // --- Calendar Page Logic (index.html) ---
    function initCalendarPage() {
        const currentMonthEl = document.getElementById('current-month');
        const prevMonthBtn = document.getElementById('prev-month-btn');
        const nextMonthBtn = document.getElementById('next-month-btn');
        const addRecordFab = document.getElementById('add-record-fab');
        const backupButton = document.getElementById('backup-button');
        const monthlyGoalInput = document.getElementById('monthly-goal-input');
        const saveGoalBtn = document.getElementById('save-goal-btn');
        const settingsModal = document.getElementById('settingsModal');

        let currentDate = new Date();
        let weeklyChart = null;

        function renderCalendar() {
            calendarGridEl.innerHTML = '';
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            if (currentMonthEl) {
                currentMonthEl.textContent = `${year}年 ${month + 1}月`;
            }

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
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                dayCell.dataset.date = dateStr;

                const today = new Date();
                if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                    dayCell.classList.add('bg-primary', 'text-white');
                }

                dayCell.addEventListener('click', () => {
                    window.location.href = `record.html?date=${dateStr}`;
                });
                calendarGridEl.appendChild(dayCell);
            }
        }

        function updateStatistics() {
            const records = getLearningRecords();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth();

            let totalMonthStudyMinutes = 0;
            let weekdayStudyMinutes = 0;
            let weekendStudyMinutes = 0;
            const weekdayRecords = new Set();
            const weekendRecords = new Set();

            records.forEach(record => {
                const recordDate = new Date(record.date);
                if (recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth) {
                    const studyMinutes = record.studyTimeMinutes || 0;
                    totalMonthStudyMinutes += studyMinutes;

                    const dayOfWeek = recordDate.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        weekendStudyMinutes += studyMinutes;
                        weekendRecords.add(record.date);
                    } else {
                        weekdayStudyMinutes += studyMinutes;
                        weekdayRecords.add(record.date);
                    }
                }
            });

            const weekdayCount = weekdayRecords.size;
            const weekendCount = weekendRecords.size;

            const totalMonthTimeEl = document.getElementById('total-month-time');
            const weekdayAvgTimeEl = document.getElementById('weekday-avg-time');
            const weekendAvgTimeEl = document.getElementById('weekend-avg-time');

            if(totalMonthTimeEl) totalMonthTimeEl.textContent = minutesToHHMM(totalMonthStudyMinutes);
            if(weekdayAvgTimeEl) weekdayAvgTimeEl.textContent = weekdayCount > 0 ? minutesToHHMM(weekdayStudyMinutes / weekdayCount) : '--:--';
            if(weekendAvgTimeEl) weekendAvgTimeEl.textContent = weekendCount > 0 ? minutesToHHMM(weekendStudyMinutes / weekendCount) : '--:--';

            renderWeeklyChart(records, currentYear, currentMonth);

            // Update Goal Progress
            const monthlyGoal = getMonthlyGoal();
            const goalProgressContainer = document.getElementById('goal-progress-container');
            const goalProgressBar = document.getElementById('goal-progress-bar');

            if (monthlyGoal && monthlyGoal > 0) {
                const goalMinutes = monthlyGoal * 60;
                const progressPercentage = Math.min((totalMonthStudyMinutes / goalMinutes) * 100, 100);

                goalProgressContainer.innerHTML = `
                    <strong>目標:</strong> ${monthlyGoal}時間 /
                    <strong>現在:</strong> ${minutesToHHMM(totalMonthStudyMinutes)}
                `;
                goalProgressBar.style.width = `${progressPercentage.toFixed(2)}%`;
                goalProgressBar.textContent = `${progressPercentage.toFixed(1)}%`;
                goalProgressBar.setAttribute('aria-valuenow', progressPercentage);

            } else {
                goalProgressContainer.innerHTML = `<p>目標が設定されていません。「設定」から目標時間を登録してください。</p>`;
                goalProgressBar.style.width = `0%`;
                goalProgressBar.textContent = `0%`;
            }
        }

        function renderWeeklyChart(records, year, month) {
            const ctx = document.getElementById('weekly-chart');
            if (!ctx) return;

            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const weeklyData = [0, 0, 0, 0, 0]; // 1-7, 8-14, 15-21, 22-28, 29+
            const labels = ["第1週", "第2週", "第3週", "第4週", "第5週"];

            records.forEach(record => {
                const recordDate = new Date(record.date);
                if (recordDate.getFullYear() === year && recordDate.getMonth() === month) {
                    const day = recordDate.getDate();
                    const studyHours = (record.studyTimeMinutes || 0) / 60;
                    if (day <= 7) weeklyData[0] += studyHours;
                    else if (day <= 14) weeklyData[1] += studyHours;
                    else if (day <= 21) weeklyData[2] += studyHours;
                    else if (day <= 28) weeklyData[3] += studyHours;
                    else weeklyData[4] += studyHours;
                }
            });

            // If the month has fewer than 29 days, remove the 5th week label/data
            if (daysInMonth < 29) {
                weeklyData.pop();
                labels.pop();
            }

            if (weeklyChart) {
                weeklyChart.destroy();
            }

            weeklyChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '学習時間 (時間)',
                        data: weeklyData.map(h => h.toFixed(2)), // Round to 2 decimal places
                        backgroundColor: 'rgba(0, 123, 255, 0.5)',
                        borderColor: 'rgba(0, 123, 255, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '時間'
                            }
                        }
                    },
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        if (settingsModal) {
            // Load goal when modal is shown
            settingsModal.addEventListener('show.bs.modal', () => {
                const currentGoal = getMonthlyGoal();
                if (currentGoal && monthlyGoalInput) {
                    monthlyGoalInput.value = currentGoal;
                }
            });
        }

        if (saveGoalBtn) {
            saveGoalBtn.addEventListener('click', () => {
                const goalValue = monthlyGoalInput.value;
                if (goalValue && !isNaN(goalValue) && goalValue > 0) {
                    saveMonthlyGoal(Number(goalValue));

                    // Show toast notification
                    const toastEl = document.getElementById('goal-toast');
                    if (toastEl) {
                        const toast = new bootstrap.Toast(toastEl);
                        toast.show();
                    }

                    // Close the modal
                    const modalInstance = bootstrap.Modal.getInstance(settingsModal);
                    if(modalInstance) modalInstance.hide();

                    updateStatistics(); // Refresh statistics display
                } else {
                    alert('有効な目標時間を時間単位で入力してください。');
                }
            });
        }

        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar();
                updateStatistics();
            });
        }

        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar();
                updateStatistics();
            });
        }

        if (addRecordFab) {
            addRecordFab.addEventListener('click', () => {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                window.location.href = `record.html?date=${year}-${month}-${day}`;
            });
        }

        if (backupButton) {
            backupButton.addEventListener('click', () => {
                const records = getLearningRecords();
                const jsonString = JSON.stringify(records, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `learning_records_backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                alert('バックアップファイルをダウンロードしました！');
            });
        }

        renderCalendar();
        updateStatistics();
    }


    // --- Record Page Logic (record.html) ---
    function initRecordPage() {
        const recordDateInput = document.getElementById('record-date');
        const startTimeInput = document.getElementById('start-time');
        const endTimeInput = document.getElementById('end-time');
        const breakTimesContainer = document.getElementById('break-times-container');
        const addBreakTimeBtn = document.getElementById('add-break-time');
        const memoInput = document.getElementById('memo-input');

        function getCurrentTime() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        }

        // Event delegation for various buttons
        document.body.addEventListener('click', (event) => {
            // "Add Current Time" button
            if (event.target.classList.contains('current-time-btn')) {
                const inputElement = event.target.previousElementSibling;
                if (inputElement && inputElement.type === 'time') {
                    inputElement.value = getCurrentTime();
                }
            }
            // "Remove Break" button
            if (event.target.classList.contains('remove-break-time')) {
                event.target.closest('.break-time-group').remove();
            }
        });

        if (addBreakTimeBtn) {
            addBreakTimeBtn.addEventListener('click', () => {
                const newBreakTimeGroup = document.createElement('div');
                newBreakTimeGroup.classList.add('mb-3', 'border', 'p-2', 'rounded', 'break-time-group');
                newBreakTimeGroup.innerHTML = `
                    <label class="form-label">休憩時間</label>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="input-group mb-1">
                                <span class="input-group-text">開始</span>
                                <input type="time" class="form-control break-start-time-input">
                                <button class="btn btn-outline-secondary current-time-btn" type="button">現在</button>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="input-group mb-2">
                                <span class="input-group-text">終了</span>
                                <input type="time" class="form-control break-end-time-input">
                                <button class="btn btn-outline-secondary current-time-btn" type="button">現在</button>
                                <button class="btn btn-outline-danger remove-break-time" type="button">削除</button>
                            </div>
                        </div>
                    </div>
                `;
                if(breakTimesContainer) breakTimesContainer.appendChild(newBreakTimeGroup);
            });
        }

        if (recordFormEl) {
            recordFormEl.addEventListener('submit', (event) => {
                event.preventDefault();

                const date = recordDateInput.value;
                if (!date) {
                    alert('日付を入力してください。');
                    return;
                }

                const studyStartMinutes = timeToMinutes(startTimeInput.value);
                const studyEndMinutes = timeToMinutes(endTimeInput.value);
                if (studyEndMinutes <= studyStartMinutes) {
                    alert('勉強の終了時間は開始時間より後に設定してください。');
                    return;
                }
                let totalStudyMinutes = studyEndMinutes - studyStartMinutes;

                let totalBreakMinutes = 0;
                let breakTimesValid = true;
                const breakTimeGroups = document.querySelectorAll('.break-time-group');
                const rawBreakTimes = [];

                breakTimeGroups.forEach(group => {
                    const startInput = group.querySelector('.break-start-time-input').value;
                    const endInput = group.querySelector('.break-end-time-input').value;
                    if (startInput && endInput) {
                        const breakStartMinutes = timeToMinutes(startInput);
                        const breakEndMinutes = timeToMinutes(endInput);
                        if (breakEndMinutes <= breakStartMinutes) {
                            alert('休憩の終了時間は開始時間より後に設定してください。');
                            breakTimesValid = false;
                        }
                        totalBreakMinutes += (breakEndMinutes - breakStartMinutes);
                        rawBreakTimes.push({ start: startInput, end: endInput });
                    }
                });

                if (!breakTimesValid) return;

                const netStudyMinutes = totalStudyMinutes - totalBreakMinutes;

                const record = {
                    date: date,
                    studyTimeMinutes: netStudyMinutes,
                    breakTimeMinutes: totalBreakMinutes,
                    rawStartTime: startTimeInput.value,
                    rawEndTime: endTimeInput.value,
                    rawBreakTimes: rawBreakTimes,
                    memo: memoInput ? memoInput.value : ''
                };

                let records = getLearningRecords();
                const existingRecordIndex = records.findIndex(r => r.date === date);
                if (existingRecordIndex > -1) {
                    records[existingRecordIndex] = record;
                } else {
                    records.push(record);
                }
                saveLearningRecords(records);

                // Show toast notification instead of alert
                const toastEl = document.getElementById('save-toast');
                if (toastEl) {
                    const toast = new bootstrap.Toast(toastEl);
                    toast.show();
                }

                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500); // 1.5 second delay
            });
        }

        // Pre-fill date and existing data
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');
        const targetDate = dateParam || new Date().toISOString().split('T')[0];

        if (recordDateInput) recordDateInput.value = targetDate;

        const records = getLearningRecords();
        const record = records.find(r => r.date === targetDate);
        const tweetBtn = document.getElementById('tweet-btn');
        const deleteBtn = document.getElementById('delete-btn');

        if (record) {
            if(startTimeInput) startTimeInput.value = record.rawStartTime || '';
            if(endTimeInput) endTimeInput.value = record.rawEndTime || '';
            if(memoInput) memoInput.value = record.memo || '';
            if (record.rawBreakTimes && breakTimesContainer) {
                // Clear the initial empty break time group before adding saved ones
                const initialBreakGroup = breakTimesContainer.querySelector('.break-time-group');
                if(initialBreakGroup && !initialBreakGroup.querySelector('.break-start-time-input').value) {
                    initialBreakGroup.remove();
                }

                record.rawBreakTimes.forEach(bt => {
                    if(addBreakTimeBtn) addBreakTimeBtn.click();
                    const newGroup = breakTimesContainer.lastElementChild;
                    if(newGroup) {
                        newGroup.querySelector('.break-start-time-input').value = bt.start;
                        newGroup.querySelector('.break-end-time-input').value = bt.end;
                    }
                });
            }
            // Show and setup tweet button if a record exists
            if (tweetBtn && record.studyTimeMinutes > 0) {
                tweetBtn.style.display = 'block';
                tweetBtn.addEventListener('click', () => {
                    const studyTimeFormatted = minutesToHHMM(record.studyTimeMinutes);
                    const tweetText = `今日の勉強時間は ${studyTimeFormatted} でした！📝 #学習記録`;
                    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
                    window.open(twitterUrl, '_blank');
                });
            }

            // Show and setup delete button if a record exists
            if (deleteBtn) {
                deleteBtn.style.display = 'block';
                deleteBtn.addEventListener('click', () => {
                    if (confirm('この日の記録を本当に削除しますか？この操作は元に戻せません。')) {
                        const updatedRecords = records.filter(r => r.date !== targetDate);
                        saveLearningRecords(updatedRecords);

                        // Show delete confirmation toast
                        const toastEl = document.getElementById('delete-toast');
                        if (toastEl) {
                            const toast = new bootstrap.Toast(toastEl);
                            toast.show();
                        }

                        // Redirect after a short delay
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 1500);
                    }
                });
            }
        }
    }
});
