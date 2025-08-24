document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js is running for SPA");

    // --- Global State & Helper Functions ---
    let deferredPrompt;
    let currentDate = new Date();
    let weeklyChart = null;
    const toastInstances = {};

    function getLearningRecords() { return JSON.parse(localStorage.getItem('learningRecords') || '[]'); }
    function saveLearningRecords(records) { localStorage.setItem('learningRecords', JSON.stringify(records)); }
    function getMonthlyGoal() { return JSON.parse(localStorage.getItem('monthlyGoalHours')); }
    function saveMonthlyGoal(hours) { localStorage.setItem('monthlyGoalHours', JSON.stringify(hours)); }
    function timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }
    function minutesToHHMM(totalMinutes) {
        if (isNaN(totalMinutes) || totalMinutes < 0) totalMinutes = 0;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    function showToast(id) {
        if (!toastInstances[id]) {
            const toastEl = document.getElementById(id);
            if (toastEl) {
                toastInstances[id] = new bootstrap.Toast(toastEl);
            }
        }
        if (toastInstances[id]) {
            toastInstances[id].show();
        }
    }

    // --- Views & Router ---
    const views = {
        dashboard: document.getElementById('view-dashboard'),
        record: document.getElementById('view-record'),
    };
    const navItems = {
        dashboard: document.getElementById('nav-dashboard'),
        addRecord: document.getElementById('nav-add-record'),
        settings: document.getElementById('nav-settings'),
    };

    function navigateTo(viewName, context = {}) {
        // Hide all views
        Object.values(views).forEach(view => view.style.display = 'none');
        // Reset active nav items
        Object.values(navItems).forEach(item => item.classList.remove('active'));

        // Show the target view
        if (views[viewName]) {
            views[viewName].style.display = 'block';
            if (navItems[viewName]) {
                navItems[viewName].classList.add('active');
            }
            // If navigating to record view, make the add button active
            if(viewName === 'record') {
                navItems.addRecord.classList.add('active');
            }
        }

        // Handle context for specific views
        if (viewName === 'record') {
            prepareRecordView(context.date);
        } else if (viewName === 'dashboard') {
            renderCalendar();
            updateStatistics();
        }
        window.scrollTo(0, 0); // Scroll to top on view change
    }

    // --- View Preparation Logic ---
    function prepareRecordView(dateStr) {
        const recordDateInput = document.getElementById('record-date');
        const startTimeInput = document.getElementById('start-time');
        const endTimeInput = document.getElementById('end-time');
        const breakTimesContainer = document.getElementById('break-times-container');
        const memoInput = document.getElementById('memo-input');
        const tweetBtn = document.getElementById('tweet-btn');
        const deleteBtn = document.getElementById('delete-btn');

        const targetDate = dateStr || new Date().toISOString().split('T')[0];
        recordDateInput.value = targetDate;

        // Clear previous form state
        startTimeInput.value = '';
        endTimeInput.value = '';
        memoInput.value = '';
        breakTimesContainer.innerHTML = `
            <div class="mb-3 border p-2 rounded break-time-group">
                <div class="row">
                    <div class="col-md-6"><div class="input-group mb-1"><span class="input-group-text">開始</span><input type="time" class="form-control break-start-time-input"><button class="btn btn-outline-secondary current-time-btn" type="button">記入</button></div></div>
                    <div class="col-md-6"><div class="input-group mb-2"><span class="input-group-text">終了</span><input type="time" class="form-control break-end-time-input"><button class="btn btn-outline-secondary current-time-btn" type="button">記入</button><button class="btn btn-outline-danger remove-break-time" type="button">削除</button></div></div>
                </div>
            </div>`;
        tweetBtn.style.display = 'none';
        deleteBtn.style.display = 'none';

        const records = getLearningRecords();
        const record = records.find(r => r.date === targetDate);

        if (record) {
            startTimeInput.value = record.rawStartTime || '';
            endTimeInput.value = record.rawEndTime || '';
            memoInput.value = record.memo || '';

            if (record.rawBreakTimes && record.rawBreakTimes.length > 0) {
                breakTimesContainer.innerHTML = ''; // Clear the default empty one
                record.rawBreakTimes.forEach(bt => {
                    addBreakTimeRow(bt.start, bt.end);
                });
            }

            if (tweetBtn && record.studyTimeMinutes > 0) {
                tweetBtn.style.display = 'block';
                // The event listener for this is now set globally
            }
            if (deleteBtn) {
                deleteBtn.style.display = 'block';
            }
        }
    }

    function addBreakTimeRow(start = '', end = '') {
        const breakTimesContainer = document.getElementById('break-times-container');
        const newBreakTimeGroup = document.createElement('div');
        newBreakTimeGroup.classList.add('mb-3', 'border', 'p-2', 'rounded', 'break-time-group');
        newBreakTimeGroup.innerHTML = `
            <div class="row">
                <div class="col-md-6"><div class="input-group mb-1"><span class="input-group-text">開始</span><input type="time" class="form-control break-start-time-input" value="${start}"><button class="btn btn-outline-secondary current-time-btn" type="button">現在</button></div></div>
                <div class="col-md-6"><div class="input-group mb-2"><span class="input-group-text">終了</span><input type="time" class="form-control break-end-time-input" value="${end}"><button class="btn btn-outline-secondary current-time-btn" type="button">現在</button><button class="btn btn-outline-danger remove-break-time" type="button">削除</button></div></div>
            </div>`;
        breakTimesContainer.appendChild(newBreakTimeGroup);
    }

    // --- Dashboard Logic ---
    function renderCalendar() {
        const calendarGridEl = document.getElementById('calendar-grid');
        const currentMonthEl = document.getElementById('current-month');
        const records = getLearningRecords();
        calendarGridEl.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        if (currentMonthEl) currentMonthEl.textContent = `${year}年 ${month + 1}月`;

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
            calendarGridEl.appendChild(document.createElement('div'));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('day');
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayCell.dataset.date = dateStr;

            const dayNumberEl = document.createElement('span');
            dayNumberEl.textContent = day;
            dayCell.appendChild(dayNumberEl);

            const record = records.find(r => r.date === dateStr);
            if (record && record.studyTimeMinutes > 0) {
                const studyTimeEl = document.createElement('div');
                studyTimeEl.classList.add('study-time');
                studyTimeEl.textContent = minutesToHHMM(record.studyTimeMinutes);
                dayCell.appendChild(studyTimeEl);
            }

            const today = new Date();
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                dayCell.classList.add('bg-primary', 'text-white');
            }

            dayCell.addEventListener('click', () => navigateTo('record', { date: dateStr }));
            calendarGridEl.appendChild(dayCell);
        }
    }

    function updateStatistics() {
        const records = getLearningRecords();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        // Update dashboard date
        const todayForDate = new Date();
        document.getElementById('dashboard-date').textContent = `${todayForDate.getFullYear()}年${todayForDate.getMonth() + 1}月${todayForDate.getDate()}日`;

        // Calculate Today's Summary
        const todayStr = todayForDate.toISOString().split('T')[0];
        const todayRecord = records.find(r => r.date === todayStr);
        const todayStudyMinutes = todayRecord ? todayRecord.studyTimeMinutes : 0;
        document.getElementById('today-summary-time').textContent = minutesToHHMM(todayStudyMinutes);

        let totalMonthStudyMinutes = 0, weekdayStudyMinutes = 0, weekendStudyMinutes = 0;
        const weekdayRecords = new Set(), weekendRecords = new Set();

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

        document.getElementById('total-month-time').textContent = minutesToHHMM(totalMonthStudyMinutes);
        document.getElementById('weekday-avg-time').textContent = weekdayRecords.size > 0 ? minutesToHHMM(weekdayStudyMinutes / weekdayRecords.size) : '--:--';
        document.getElementById('weekend-avg-time').textContent = weekendRecords.size > 0 ? minutesToHHMM(weekendStudyMinutes / weekendRecords.size) : '--:--';

        renderWeeklyChart(records, currentYear, currentMonth);
        updateGoalProgress(totalMonthStudyMinutes);
    }

    function updateGoalProgress(totalMonthStudyMinutes) {
        const monthlyGoal = getMonthlyGoal();
        const goalProgressContainer = document.getElementById('goal-progress-container');
        const goalProgressBar = document.getElementById('goal-progress-bar');
        if (monthlyGoal && monthlyGoal > 0) {
            const goalMinutes = monthlyGoal * 60;
            const progressPercentage = Math.min((totalMonthStudyMinutes / goalMinutes) * 100, 100);
            goalProgressContainer.innerHTML = `<strong>目標:</strong> ${monthlyGoal}時間 / <strong>現在:</strong> ${minutesToHHMM(totalMonthStudyMinutes)}`;
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
        const weeklyData = [0, 0, 0, 0, 0];
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
        if (daysInMonth < 29) {
            weeklyData.pop();
            labels.pop();
        }
        if (weeklyChart) weeklyChart.destroy();
        weeklyChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: '学習時間 (時間)', data: weeklyData.map(h => h.toFixed(2)), backgroundColor: 'rgba(74, 144, 226, 0.5)', borderColor: 'rgba(74, 144, 226, 1)', borderWidth: 1 }] },
            options: { scales: { y: { beginAtZero: true, title: { display: true, text: '時間' } } }, responsive: true, maintainAspectRatio: false }
        });
    }

    // --- Global Event Listeners ---
    function setupEventListeners() {
        // Navigation
        navItems.dashboard.addEventListener('click', (e) => { e.preventDefault(); navigateTo('dashboard'); });
        document.getElementById('back-to-dashboard').addEventListener('click', (e) => { e.preventDefault(); navigateTo('dashboard'); });
        navItems.addRecord.addEventListener('click', (e) => { e.preventDefault(); navigateTo('record', { date: new Date().toISOString().split('T')[0] }); });

        // Dashboard buttons
        document.getElementById('prev-month-btn').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
            updateStatistics();
        });
        document.getElementById('next-month-btn').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
            updateStatistics();
        });

        // Settings Modal
        document.getElementById('settingsModal').addEventListener('show.bs.modal', () => {
            const currentGoal = getMonthlyGoal();
            if (currentGoal) document.getElementById('monthly-goal-input').value = currentGoal;
        });
        document.getElementById('save-goal-btn').addEventListener('click', () => {
            const goalValue = document.getElementById('monthly-goal-input').value;
            if (goalValue && !isNaN(goalValue) && goalValue > 0) {
                saveMonthlyGoal(Number(goalValue));
                showToast('goal-toast');
                bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
                updateStatistics();
            } else {
                alert('有効な目標時間を時間単位で入力してください。');
            }
        });
        document.getElementById('backup-button').addEventListener('click', () => { /* ... backup logic ... */ });
        document.getElementById('install-pwa-button').addEventListener('click', () => { /* ... install logic ... */ });

        // Record Form
        document.getElementById('record-form').addEventListener('submit', (event) => {
            event.preventDefault();
            const date = document.getElementById('record-date').value;
            if (!date) { alert('日付を入力してください。'); return; }
            const studyStartMinutes = timeToMinutes(document.getElementById('start-time').value);
            const studyEndMinutes = timeToMinutes(document.getElementById('end-time').value);
            if (studyEndMinutes <= studyStartMinutes) { alert('勉強の終了時間は開始時間より後に設定してください。'); return; }

            let totalBreakMinutes = 0;
            let breakTimesValid = true;
            const rawBreakTimes = [];
            document.querySelectorAll('#view-record .break-time-group').forEach(group => {
                const startInput = group.querySelector('.break-start-time-input').value;
                const endInput = group.querySelector('.break-end-time-input').value;
                if (startInput && endInput) {
                    const breakStartMinutes = timeToMinutes(startInput);
                    const breakEndMinutes = timeToMinutes(endInput);
                    if (breakEndMinutes <= breakStartMinutes) { alert('休憩の終了時間は開始時間より後に設定してください。'); breakTimesValid = false; }
                    totalBreakMinutes += (breakEndMinutes - breakStartMinutes);
                    rawBreakTimes.push({ start: startInput, end: endInput });
                }
            });
            if (!breakTimesValid) return;

            const netStudyMinutes = (studyEndMinutes - studyStartMinutes) - totalBreakMinutes;
            const record = {
                date: date,
                studyTimeMinutes: netStudyMinutes,
                breakTimeMinutes: totalBreakMinutes,
                rawStartTime: document.getElementById('start-time').value,
                rawEndTime: document.getElementById('end-time').value,
                rawBreakTimes: rawBreakTimes,
                memo: document.getElementById('memo-input').value
            };

            let records = getLearningRecords();
            const existingRecordIndex = records.findIndex(r => r.date === date);
            if (existingRecordIndex > -1) records[existingRecordIndex] = record;
            else records.push(record);
            saveLearningRecords(records);
            showToast('save-toast');
            setTimeout(() => navigateTo('dashboard'), 1000);
        });

        document.getElementById('add-break-time').addEventListener('click', () => addBreakTimeRow());

        document.getElementById('delete-btn').addEventListener('click', () => {
            if (confirm('この日の記録を本当に削除しますか？')) {
                const date = document.getElementById('record-date').value;
                let records = getLearningRecords();
                const updatedRecords = records.filter(r => r.date !== date);
                saveLearningRecords(updatedRecords);
                showToast('delete-toast');
                setTimeout(() => navigateTo('dashboard'), 1000);
            }
        });

        document.getElementById('tweet-btn').addEventListener('click', () => {
            const date = document.getElementById('record-date').value;
            const record = getLearningRecords().find(r => r.date === date);
            if(record) {
                const studyTimeFormatted = minutesToHHMM(record.studyTimeMinutes);
                const tweetText = `今日の勉強時間は ${studyTimeFormatted} でした！📝 #学習記録`;
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
                window.open(twitterUrl, '_blank');
            }
        });

        // Global event delegation for dynamically added buttons
        document.body.addEventListener('click', (event) => {
            if (event.target.classList.contains('current-time-btn')) {
                const inputElement = event.target.closest('.input-group').querySelector('input[type="time"]');
                if (inputElement) {
                    const now = new Date();
                    inputElement.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                }
            }
            if (event.target.classList.contains('remove-break-time')) {
                event.target.closest('.break-time-group').remove();
            }
        });
    }

    // --- PWA Installation ---
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const installButton = document.getElementById('install-pwa-button');
        if (installButton) installButton.style.display = 'block';
    });

    // --- App Initialization ---
    setupEventListeners();
    navigateTo('dashboard'); // Show initial view
});
