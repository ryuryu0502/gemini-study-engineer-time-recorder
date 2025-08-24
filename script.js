document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js is running for SPA");

    // --- Global State & Helper Functions ---
    let deferredPrompt;
    let currentDate = new Date();
    let weeklyChart = null;
    let categoryChart = null; // New chart instance
    const toastInstances = {};

    function getLearningRecords() { return JSON.parse(localStorage.getItem('learningRecords') || '[]'); }
    function saveLearningRecords(records) { localStorage.setItem('learningRecords', JSON.stringify(records)); }
    function getMonthlyGoal() { return JSON.parse(localStorage.getItem('monthlyGoalHours')); }
    function saveMonthlyGoal(hours) { localStorage.setItem('monthlyGoalHours', JSON.stringify(hours)); }

    function getStudyCategories() {
        const categories = localStorage.getItem('studyCategories');
        if (categories) {
            return JSON.parse(categories);
        }
        const defaultCategories = ['プログラミング', '読書', 'その他'];
        localStorage.setItem('studyCategories', JSON.stringify(defaultCategories));
        return defaultCategories;
    }
    function saveStudyCategories(categories) { localStorage.setItem('studyCategories', JSON.stringify(categories)); }

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
        Object.values(views).forEach(view => view.style.display = 'none');
        Object.values(navItems).forEach(item => item.classList.remove('active'));

        if (views[viewName]) {
            views[viewName].style.display = 'block';
            if (navItems[viewName]) {
                navItems[viewName].classList.add('active');
            }
            if(viewName === 'record') {
                navItems.addRecord.classList.add('active');
            }
        }

        if (viewName === 'record') {
            prepareRecordView(context.date);
        } else if (viewName === 'dashboard') {
            renderCalendar();
            updateStatistics();
        }
        window.scrollTo(0, 0);
    }

    // --- Category Management ---
    function renderCategoryList() {
        const categoryListEl = document.getElementById('category-list');
        if (!categoryListEl) return;
        const categories = getStudyCategories();
        categoryListEl.innerHTML = '';
        categories.forEach(category => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.textContent = category;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-outline-danger btn-sm delete-category-btn';
            deleteBtn.textContent = '削除';
            deleteBtn.dataset.category = category;
            li.appendChild(deleteBtn);

            categoryListEl.appendChild(li);
        });
    }

    // --- View Preparation Logic ---
    function prepareRecordView(dateStr) {
        const targetDate = dateStr || new Date().toISOString().split('T')[0];
        document.getElementById('record-date').value = targetDate;

        const categorySelect = document.getElementById('record-category');
        const categories = getStudyCategories();
        categorySelect.innerHTML = '';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });

        document.getElementById('start-time').value = '';
        document.getElementById('end-time').value = '';
        document.getElementById('memo-input').value = '';
        document.getElementById('break-times-container').innerHTML = `<div class="mb-3 border p-2 rounded break-time-group"><div class="row"><div class="col-md-6"><div class="input-group mb-1"><span class="input-group-text">開始</span><input type="time" class="form-control break-start-time-input"><button class="btn btn-outline-secondary current-time-btn" type="button">記入</button></div></div><div class="col-md-6"><div class="input-group mb-2"><span class="input-group-text">終了</span><input type="time" class="form-control break-end-time-input"><button class="btn btn-outline-secondary current-time-btn" type="button">記入</button><button class="btn btn-outline-danger remove-break-time" type="button">削除</button></div></div></div></div>`;
        document.getElementById('tweet-btn').style.display = 'none';
        document.getElementById('delete-btn').style.display = 'none';

        const records = getLearningRecords();
        const record = records.find(r => r.date === targetDate);

        if (record) {
            document.getElementById('start-time').value = record.rawStartTime || '';
            document.getElementById('end-time').value = record.rawEndTime || '';
            document.getElementById('memo-input').value = record.memo || '';
            categorySelect.value = record.category || 'その他';

            const breakTimesContainer = document.getElementById('break-times-container');
            if (record.rawBreakTimes && record.rawBreakTimes.length > 0) {
                breakTimesContainer.innerHTML = '';
                record.rawBreakTimes.forEach(bt => addBreakTimeRow(bt.start, bt.end));
            }

            if (record.studyTimeMinutes > 0) document.getElementById('tweet-btn').style.display = 'block';
            document.getElementById('delete-btn').style.display = 'block';
        }
    }

    function addBreakTimeRow(start = '', end = '') {
        const container = document.getElementById('break-times-container');
        const newGroup = document.createElement('div');
        newGroup.className = 'mb-3 border p-2 rounded break-time-group';
        newGroup.innerHTML = `<div class="row"><div class="col-md-6"><div class="input-group mb-1"><span class="input-group-text">開始</span><input type="time" class="form-control break-start-time-input" value="${start}"><button class="btn btn-outline-secondary current-time-btn" type="button">現在</button></div></div><div class="col-md-6"><div class="input-group mb-2"><span class="input-group-text">終了</span><input type="time" class="form-control break-end-time-input" value="${end}"><button class="btn btn-outline-secondary current-time-btn" type="button">現在</button><button class="btn btn-outline-danger remove-break-time" type="button">削除</button></div></div></div>`;
        container.appendChild(newGroup);
    }

    // --- Dashboard Logic ---
    function renderCalendar() { /* ... */ }

    function updateStatistics() {
        const records = getLearningRecords();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        const todayForDate = new Date();
        document.getElementById('dashboard-date').textContent = `${todayForDate.getFullYear()}年${todayForDate.getMonth() + 1}月${todayForDate.getDate()}日`;

        const todayStr = todayForDate.toISOString().split('T')[0];
        const todayRecord = records.find(r => r.date === todayStr);
        const todayStudyMinutes = todayRecord ? todayRecord.studyTimeMinutes : 0;
        document.getElementById('today-summary-time').textContent = minutesToHHMM(todayStudyMinutes);

        let totalMonthStudyMinutes = 0, weekdayStudyMinutes = 0, weekendStudyMinutes = 0;
        const weekdayRecords = new Set(), weekendRecords = new Set();
        const categoryData = {};

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

                const category = record.category || 'その他';
                if (!categoryData[category]) categoryData[category] = 0;
                categoryData[category] += studyMinutes;
            }
        });

        document.getElementById('total-month-time').textContent = minutesToHHMM(totalMonthStudyMinutes);
        document.getElementById('weekday-avg-time').textContent = weekdayRecords.size > 0 ? minutesToHHMM(weekdayStudyMinutes / weekdayRecords.size) : '--:--';
        document.getElementById('weekend-avg-time').textContent = weekendRecords.size > 0 ? minutesToHHMM(weekendStudyMinutes / weekendRecords.size) : '--:--';

        renderWeeklyChart(records, currentYear, currentMonth);
        renderCategoryChart(categoryData);
        updateGoalProgress(totalMonthStudyMinutes);
    }

    function updateGoalProgress(totalMonthStudyMinutes) { /* ... */ }
    function renderWeeklyChart(records, year, month) { /* ... */ }

    function renderCategoryChart(categoryData) {
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        if (categoryChart) {
            categoryChart.destroy();
        }

        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: '学習時間 (分)',
                    data: data,
                    backgroundColor: [
                        'rgba(74, 144, 226, 0.7)',
                        'rgba(245, 166, 35, 0.7)',
                        'rgba(126, 211, 33, 0.7)',
                        'rgba(248, 231, 28, 0.7)',
                        'rgba(189, 16, 224, 0.7)',
                        'rgba(80, 227, 194, 0.7)'
                    ],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    // --- Global Event Listeners ---
    function setupEventListeners() {
        // Navigation
        navItems.dashboard.addEventListener('click', (e) => { e.preventDefault(); navigateTo('dashboard'); });
        document.getElementById('back-to-dashboard').addEventListener('click', (e) => { e.preventDefault(); navigateTo('dashboard'); });
        navItems.addRecord.addEventListener('click', (e) => { e.preventDefault(); navigateTo('record', { date: new Date().toISOString().split('T')[0] }); });

        // Dashboard
        document.getElementById('prev-month-btn').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); updateStatistics(); });
        document.getElementById('next-month-btn').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); updateStatistics(); });

        // Settings Modal
        document.getElementById('settingsModal').addEventListener('show.bs.modal', () => {
            const currentGoal = getMonthlyGoal();
            if (currentGoal) document.getElementById('monthly-goal-input').value = currentGoal;
            renderCategoryList();
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

        // Data Management
        document.getElementById('backup-button').addEventListener('click', () => {
            const records = getLearningRecords();
            const dataToExport = {
                records: records,
                categories: getStudyCategories(),
                goal: getMonthlyGoal()
            };
            const jsonString = JSON.stringify(dataToExport, null, 2);
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

        const importFileInput = document.getElementById('import-file-input');
        document.getElementById('import-button').addEventListener('click', () => {
            importFileInput.click();
        });

        importFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (typeof importedData !== 'object' || importedData === null) {
                        throw new Error('無効なJSONファイルです。');
                    }

                    if (confirm('現在のすべての記録と設定をインポートしたデータで上書きします。よろしいですか？')) {
                        if (Array.isArray(importedData.records)) {
                             saveLearningRecords(importedData.records);
                        }
                        if (Array.isArray(importedData.categories)) {
                            saveStudyCategories(importedData.categories);
                        }
                        if (importedData.goal) {
                            saveMonthlyGoal(importedData.goal);
                        }
                        alert('データをインポートしました！');
                        bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
                        navigateTo('dashboard');
                    }
                } catch (error) {
                    alert(`インポートに失敗しました: ${error.message}`);
                } finally {
                    importFileInput.value = '';
                }
            };
            reader.readAsText(file);
        });

        // Category Management
        document.getElementById('add-category-btn').addEventListener('click', () => {
            const input = document.getElementById('new-category-input');
            const newCategory = input.value.trim();
            if (newCategory) {
                const categories = getStudyCategories();
                if (!categories.includes(newCategory)) {
                    categories.push(newCategory);
                    saveStudyCategories(categories);
                    renderCategoryList();
                    input.value = '';
                } else {
                    alert('同じ名前のカテゴリが既に存在します。');
                }
            }
        });
        document.getElementById('category-list').addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-category-btn')) {
                const categoryToDelete = event.target.dataset.category;
                if (confirm(`「${categoryToDelete}」を削除しますか？このカテゴリの学習記録は「その他」に分類されます。`)) {
                    let categories = getStudyCategories();
                    categories = categories.filter(c => c !== categoryToDelete);
                    saveStudyCategories(categories);

                    let records = getLearningRecords();
                    records.forEach(record => {
                        if (record.category === categoryToDelete) {
                            record.category = 'その他';
                        }
                    });
                    saveLearningRecords(records);

                    renderCategoryList();
                    updateStatistics(); // Refresh dashboard chart
                }
            }
        });

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
                memo: document.getElementById('memo-input').value,
                category: document.getElementById('record-category').value
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
        document.getElementById('delete-btn').addEventListener('click', () => { /* ... */ });
        document.getElementById('tweet-btn').addEventListener('click', () => { /* ... */ });

        // Global Event Delegation
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

    // PWA Installation
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const installButton = document.getElementById('install-pwa-button');
        if (installButton) installButton.style.display = 'block';
    });

    // App Initialization
    setupEventListeners();
    navigateTo('dashboard');
});
