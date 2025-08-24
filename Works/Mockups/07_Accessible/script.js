document.addEventListener('DOMContentLoaded', () => {
    const currentMonthEl = document.getElementById('current-month');
    const calendarGridEl = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');

    let currentDate = new Date();

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
            dayNameEl.setAttribute('role', 'columnheader');
            dayNameEl.classList.add('day-name');
            dayNameEl.textContent = day;
            calendarGridEl.appendChild(dayNameEl);
        });

        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.setAttribute('role', 'gridcell');
            calendarGridEl.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('day-cell');
            dayCell.setAttribute('role', 'gridcell');
            dayCell.setAttribute('tabindex', '-1'); // Make focusable with JS
            dayCell.textContent = day;
            dayCell.setAttribute('aria-label', `${month + 1}月${day}日`);
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
});