document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js is running for SPA");

    // --- Global State ---
    let deferredPrompt;
    let currentDate = new Date();
    let weeklyChart = null;
    let categoryChart = null;
    const toastInstances = {};
    let pomoInterval = null;
    let pomoState = 'stopped'; // 'running', 'paused'
    let pomoMode = 'work'; // 'work', 'short_break', 'long_break'
    let pomoSecondsLeft = 25 * 60;
    let pomoSessions = 0;
    const POMO_DURATIONS = { work: 25 * 60, short_break: 5 * 60, long_break: 15 * 60 };

    // --- Helper Functions ---
    function getLearningRecords() { return JSON.parse(localStorage.getItem('learningRecords') || '[]'); }
    function saveLearningRecords(records) { localStorage.setItem('learningRecords', JSON.stringify(records)); }
    function getMonthlyGoal() { return JSON.parse(localStorage.getItem('monthlyGoalHours')); }
    function saveMonthlyGoal(hours) { localStorage.setItem('monthlyGoalHours', JSON.stringify(hours)); }
    function getStudyCategories() {
        const categories = localStorage.getItem('studyCategories');
        if (categories) return JSON.parse(categories);
        const defaultCategories = ['プログラミング', '読書', 'その他'];
        saveStudyCategories(defaultCategories);
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
    function showToast(id, message = null) {
        const toastEl = document.getElementById(id);
        if (!toastEl) return;
        const toastBody = toastEl.querySelector('.toast-body');
        if (message && toastBody) {
            toastBody.textContent = message;
        }
        if (!toastInstances[id]) toastInstances[id] = new bootstrap.Toast(toastEl);
        toastInstances[id].show();
    }

    // --- Views & Router ---
    const views = {
        dashboard: document.getElementById('view-dashboard'),
        record: document.getElementById('view-record'),
        pomodoro: document.getElementById('view-pomodoro'),
    };
    const navItems = {
        dashboard: document.getElementById('nav-dashboard'),
        addRecord: document.getElementById('nav-add-record'),
        pomodoro: document.getElementById('nav-pomodoro'),
        settings: document.getElementById('nav-settings'),
    };
    function navigateTo(viewName, context = {}) {
        Object.values(views).forEach(view => view.style.display = 'none');
        Object.values(navItems).forEach(item => item.classList.remove('active'));
        if (views[viewName]) {
            views[viewName].style.display = 'block';
            if (navItems[viewName]) navItems[viewName].classList.add('active');
            if(viewName === 'record') navItems.addRecord.classList.add('active');
        }
        if (viewName === 'record') prepareRecordView(context);
        else if (viewName === 'dashboard') updateDashboard();
        else if (viewName === 'pomodoro') preparePomodoroView();
        window.scrollTo(0, 0);
    }

    // --- View Preparation & Rendering ---
    function prepareRecordView(context) {
        const dateStr = context.date || new Date().toISOString().split('T')[0];
        document.getElementById('record-date').value = dateStr;
        const categorySelect = document.getElementById('record-category');
        categorySelect.innerHTML = '';
        getStudyCategories().forEach(c => {
            const option = document.createElement('option');
            option.value = c; option.textContent = c;
            categorySelect.appendChild(option);
        });
        document.getElementById('start-time').value = context.startTime || '';
        document.getElementById('end-time').value = context.endTime || '';
        document.getElementById('memo-input').value = '';
        document.getElementById('break-times-container').innerHTML = `<div class="mb-3 border p-2 rounded break-time-group"><div class="row"><div class="col-md-6"><div class="input-group mb-1"><span class="input-group-text">開始</span><input type="time" class="form-control break-start-time-input"><button class="btn btn-outline-secondary current-time-btn" type="button">記入</button></div></div><div class="col-md-6"><div class="input-group mb-2"><span class="input-group-text">終了</span><input type="time" class="form-control break-end-time-input"><button class="btn btn-outline-secondary current-time-btn" type="button">記入</button><button class="btn btn-outline-danger remove-break-time" type="button">削除</button></div></div></div></div>`;
        document.getElementById('tweet-btn').style.display = 'none';
        document.getElementById('delete-btn').style.display = 'none';
        const record = getLearningRecords().find(r => r.date === dateStr);
        if (record) {
            document.getElementById('start-time').value = record.rawStartTime || '';
            document.getElementById('end-time').value = record.rawEndTime || '';
            document.getElementById('memo-input').value = record.memo || '';
            categorySelect.value = record.category || 'その他';
            const breakContainer = document.getElementById('break-times-container');
            if (record.rawBreakTimes && record.rawBreakTimes.length > 0) {
                breakContainer.innerHTML = '';
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
    function renderCategoryList() {
        const listEl = document.getElementById('category-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        getStudyCategories().forEach(c => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.textContent = c;
            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-outline-danger btn-sm delete-category-btn';
            delBtn.textContent = '削除';
            delBtn.dataset.category = c;
            li.appendChild(delBtn);
            listEl.appendChild(li);
        });
    }

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
            dayNameEl.className = 'day-name';
            dayNameEl.textContent = day;
            calendarGridEl.appendChild(dayNameEl);
        });
        for (let i = 0; i < firstDayOfMonth; i++) calendarGridEl.appendChild(document.createElement('div'));
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'day';
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayCell.dataset.date = dateStr;
            const dayNumberEl = document.createElement('span');
            dayNumberEl.textContent = day;
            dayCell.appendChild(dayNumberEl);
            const record = records.find(r => r.date === dateStr);
            if (record && record.studyTimeMinutes > 0) {
                const studyTimeEl = document.createElement('div');
                studyTimeEl.className = 'study-time';
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

    function updateDashboard() {
        const records = getLearningRecords();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const today = new Date();
        document.getElementById('dashboard-date').textContent = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        const todayRecord = records.find(r => r.date === today.toISOString().split('T')[0]);
        document.getElementById('today-summary-time').textContent = minutesToHHMM(todayRecord ? todayRecord.studyTimeMinutes : 0);
        let totalMonth = 0, weekDay = 0, weekend = 0;
        const weekDayRecords = new Set(), weekendRecords = new Set(), categoryData = {};
        records.forEach(r => {
            const d = new Date(r.date);
            if (d.getFullYear() === year && d.getMonth() === month) {
                totalMonth += r.studyTimeMinutes || 0;
                const day = d.getDay();
                if (day === 0 || day === 6) { weekend += r.studyTimeMinutes || 0; weekendRecords.add(r.date); }
                else { weekDay += r.studyTimeMinutes || 0; weekDayRecords.add(r.date); }
                const cat = r.category || 'その他';
                if (!categoryData[cat]) categoryData[cat] = 0;
                categoryData[cat] += r.studyTimeMinutes || 0;
            }
        });
        document.getElementById('total-month-time').textContent = minutesToHHMM(totalMonth);
        document.getElementById('weekday-avg-time').textContent = weekDayRecords.size > 0 ? minutesToHHMM(weekDay / weekDayRecords.size) : '--:--';
        document.getElementById('weekend-avg-time').textContent = weekendRecords.size > 0 ? minutesToHHMM(weekend / weekendRecords.size) : '--:--';
        renderWeeklyChart(records, year, month);
        renderCategoryChart(categoryData);
        updateGoalProgress(totalMonth);
        renderCalendar();
    }

    function updateGoalProgress(totalMonth) {
        const goal = getMonthlyGoal();
        const container = document.getElementById('goal-progress-container');
        const bar = document.getElementById('goal-progress-bar');
        if (goal && goal > 0) {
            const percent = Math.min((totalMonth / (goal * 60)) * 100, 100);
            container.innerHTML = `<strong>目標:</strong> ${goal}時間 / <strong>現在:</strong> ${minutesToHHMM(totalMonth)}`;
            bar.style.width = `${percent.toFixed(2)}%`;
            bar.textContent = `${percent.toFixed(1)}%`;
            bar.setAttribute('aria-valuenow', percent);
        } else {
            container.innerHTML = `<p>目標が設定されていません。「設定」から目標時間を登録してください。</p>`;
            bar.style.width = `0%`;
            bar.textContent = `0%`;
        }
    }

    function renderWeeklyChart(records, year, month) {
        const ctx = document.getElementById('weekly-chart');
        if (!ctx) return;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const data = [0, 0, 0, 0, 0];
        const labels = ["第1週", "第2週", "第3週", "第4週", "第5週"];
        records.forEach(r => {
            const d = new Date(r.date);
            if (d.getFullYear() === year && d.getMonth() === month) {
                const day = d.getDate();
                const hours = (r.studyTimeMinutes || 0) / 60;
                if (day <= 7) data[0] += hours;
                else if (day <= 14) data[1] += hours;
                else if (day <= 21) data[2] += hours;
                else if (day <= 28) data[3] += hours;
                else data[4] += hours;
            }
        });
        if (daysInMonth < 29) { data.pop(); labels.pop(); }
        if (weeklyChart) weeklyChart.destroy();
        weeklyChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: '学習時間 (時間)', data: data.map(h => h.toFixed(2)), backgroundColor: 'rgba(74, 144, 226, 0.5)', borderColor: 'rgba(74, 144, 226, 1)', borderWidth: 1 }] },
            options: { scales: { y: { beginAtZero: true, title: { display: true, text: '時間' } } }, responsive: true, maintainAspectRatio: false }
        });
    }

    function renderCategoryChart(data) {
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;
        if (categoryChart) categoryChart.destroy();
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data),
                datasets: [{ label: '学習時間 (分)', data: Object.values(data), backgroundColor: ['rgba(74, 144, 226, 0.7)', 'rgba(245, 166, 35, 0.7)', 'rgba(126, 211, 33, 0.7)', 'rgba(248, 231, 28, 0.7)', 'rgba(189, 16, 224, 0.7)', 'rgba(80, 227, 194, 0.7)'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    // --- Pomodoro Logic ---
    function preparePomodoroView() {
        updatePomodoroDisplay();
        document.getElementById('pomodoro-status').textContent = pomoMode === 'work' ? '作業時間' : '休憩時間';
    }
    function updatePomodoroDisplay() {
        const mins = Math.floor(pomoSecondsLeft / 60);
        const secs = pomoSecondsLeft % 60;
        document.getElementById('pomodoro-timer').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    function startPausePomodoro() {
        const btn = document.getElementById('pomodoro-start-pause');
        if (pomoState === 'running') {
            clearInterval(pomoInterval);
            pomoState = 'paused';
            btn.textContent = '再開';
        } else {
            pomoState = 'running';
            btn.textContent = '一時停止';
            pomoInterval = setInterval(pomoTick, 1000);
        }
    }
    function resetPomodoro() {
        clearInterval(pomoInterval);
        pomoState = 'stopped';
        pomoMode = 'work';
        pomoSecondsLeft = POMO_DURATIONS.work;
        updatePomodoroDisplay();
        document.getElementById('pomodoro-status').textContent = '作業時間';
        document.getElementById('pomodoro-start-pause').textContent = '開始';
    }
    function pomoTick() {
        pomoSecondsLeft--;
        updatePomodoroDisplay();
        if (pomoSecondsLeft < 0) {
            clearInterval(pomoInterval);
            pomoState = 'stopped';
            const completedMode = pomoMode;
            if (completedMode === 'work') {
                pomoSessions++;
                autoSavePomodoroRecord();
                pomoMode = (pomoSessions % 4 === 0) ? 'long_break' : 'short_break';
                alert('作業セッションが完了しました。休憩を開始します。');
            } else {
                pomoMode = 'work';
                alert('休憩が完了しました。作業を開始してください。');
            }
            pomoSecondsLeft = POMO_DURATIONS[pomoMode];
            preparePomodoroView();
        }
    }
    function autoSavePomodoroRecord() {
        const today = new Date().toISOString().split('T')[0];
        const records = getLearningRecords();
        const existing = records.find(r => r.date === today && r.category === 'ポモドーロ');
        if (existing) {
            existing.studyTimeMinutes += 25;
        } else {
            records.push({ date: today, studyTimeMinutes: 25, category: 'ポモドーロ', memo: 'ポモドーロタイマーによる自動記録' });
        }
        saveLearningRecords(records);
        if (!getStudyCategories().includes('ポモドーロ')) {
            saveStudyCategories([...getStudyCategories(), 'ポモドーロ']);
        }
        showToast('save-toast', 'ポモドーロセッション(25分)を記録しました。');
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        navItems.dashboard.addEventListener('click', (e) => { e.preventDefault(); navigateTo('dashboard'); });
        navItems.addRecord.addEventListener('click', (e) => { e.preventDefault(); navigateTo('record'); });
        navItems.pomodoro.addEventListener('click', (e) => { e.preventDefault(); navigateTo('pomodoro'); });
        document.getElementById('back-to-dashboard').addEventListener('click', (e) => { e.preventDefault(); navigateTo('dashboard'); });
        document.getElementById('prev-month-btn').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); updateDashboard(); });
        document.getElementById('next-month-btn').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); updateDashboard(); });
        document.getElementById('settingsModal').addEventListener('show.bs.modal', () => {
            const goal = getMonthlyGoal();
            if (goal) document.getElementById('monthly-goal-input').value = goal;
            renderCategoryList();
        });
        document.getElementById('save-goal-btn').addEventListener('click', () => {
            const val = document.getElementById('monthly-goal-input').value;
            if (val && !isNaN(val) && val > 0) {
                saveMonthlyGoal(Number(val));
                showToast('goal-toast', '目標を保存しました！');
                bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
                updateDashboard();
            } else alert('有効な目標時間を時間単位で入力してください。');
        });
        document.getElementById('backup-button').addEventListener('click', () => {
            const data = { records: getLearningRecords(), categories: getStudyCategories(), goal: getMonthlyGoal() };
            const str = JSON.stringify(data, null, 2);
            const blob = new Blob([str], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `learning_records_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
        });
        const importInput = document.getElementById('import-file-input');
        document.getElementById('import-button').addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (re) => {
                try {
                    const data = JSON.parse(re.target.result);
                    if (confirm('現在の記録と設定を上書きします。よろしいですか？')) {
                        if (data.records) saveLearningRecords(data.records);
                        if (data.categories) saveStudyCategories(data.categories);
                        if (data.goal) saveMonthlyGoal(data.goal);
                        alert('データをインポートしました！');
                        bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
                        navigateTo('dashboard');
                    }
                } catch (err) { alert(`インポート失敗: ${err.message}`); }
                finally { importInput.value = ''; }
            };
            reader.readAsText(file);
        });
        document.getElementById('add-category-btn').addEventListener('click', () => {
            const input = document.getElementById('new-category-input');
            const cat = input.value.trim();
            if (cat) {
                const cats = getStudyCategories();
                if (!cats.includes(cat)) {
                    cats.push(cat);
                    saveStudyCategories(cats);
                    renderCategoryList();
                    input.value = '';
                } else alert('同じ名前のカテゴリが既に存在します。');
            }
        });
        document.getElementById('category-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-category-btn')) {
                const cat = e.target.dataset.category;
                if (confirm(`「${cat}」を削除しますか？関連する記録は「その他」に分類されます。`)) {
                    saveStudyCategories(getStudyCategories().filter(c => c !== cat));
                    saveLearningRecords(getLearningRecords().map(r => {
                        if (r.category === cat) r.category = 'その他';
                        return r;
                    }));
                    renderCategoryList();
                    updateDashboard();
                }
            }
        });
        document.getElementById('record-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('record-date').value;
            const start = timeToMinutes(document.getElementById('start-time').value);
            const end = timeToMinutes(document.getElementById('end-time').value);
            if (end <= start) { alert('終了時間は開始時間より後に設定してください。'); return; }
            let breakMins = 0;
            let breaksValid = true;
            const rawBreaks = [];
            document.querySelectorAll('#view-record .break-time-group').forEach(g => {
                const s = g.querySelector('.break-start-time-input').value;
                const e = g.querySelector('.break-end-time-input').value;
                if (s && e) {
                    const bStart = timeToMinutes(s), bEnd = timeToMinutes(e);
                    if (bEnd <= bStart) { breaksValid = false; }
                    breakMins += (bEnd - bStart);
                    rawBreaks.push({ start: s, end: e });
                }
            });
            if (!breaksValid) { alert('休憩の終了時間は開始時間より後に設定してください。'); return; }
            const record = {
                date,
                studyTimeMinutes: (end - start) - breakMins,
                breakTimeMinutes: breakMins,
                rawStartTime: document.getElementById('start-time').value,
                rawEndTime: document.getElementById('end-time').value,
                rawBreakTimes: rawBreaks,
                memo: document.getElementById('memo-input').value,
                category: document.getElementById('record-category').value
            };
            const records = getLearningRecords();
            const idx = records.findIndex(r => r.date === date);
            if (idx > -1) records[idx] = record;
            else records.push(record);
            saveLearningRecords(records);
            showToast('save-toast', `${date} の記録を保存しました！`);
            setTimeout(() => navigateTo('dashboard'), 1000);
        });
        document.getElementById('add-break-time').addEventListener('click', () => addBreakTimeRow());
        document.getElementById('delete-btn').addEventListener('click', () => {
            if (confirm('この日の記録を本当に削除しますか？')) {
                const date = document.getElementById('record-date').value;
                saveLearningRecords(getLearningRecords().filter(r => r.date !== date));
                showToast('delete-toast', `${date} の記録を削除しました。`);
                setTimeout(() => navigateTo('dashboard'), 1000);
            }
        });
        document.getElementById('tweet-btn').addEventListener('click', () => {
            const date = document.getElementById('record-date').value;
            const record = getLearningRecords().find(r => r.date === date);
            if (record) {
                const text = `今日の勉強時間は ${minutesToHHMM(record.studyTimeMinutes)} でした！📝 #学習記録`;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
            }
        });
        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('current-time-btn')) {
                const input = e.target.closest('.input-group').querySelector('input[type="time"]');
                if (input) {
                    const now = new Date();
                    input.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                }
            }
            if (e.target.classList.contains('remove-break-time')) {
                e.target.closest('.break-time-group').remove();
            }
        });
        document.getElementById('pomodoro-start-pause').addEventListener('click', startPausePomodoro);
        document.getElementById('pomodoro-reset').addEventListener('click', resetPomodoro);
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const btn = document.getElementById('install-pwa-button');
        if (btn) btn.style.display = 'block';
    });

    setupEventListeners();
    navigateTo('dashboard');
});
