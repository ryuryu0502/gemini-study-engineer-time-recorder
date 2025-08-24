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

        // Add day names
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        dayNames.forEach(day => {
            const dayNameEl = document.createElement('div');
            dayNameEl.classList.add('day-name');
            dayNameEl.textContent = day;
            calendarGridEl.appendChild(dayNameEl);
        });

        // Add empty cells for days before the 1st
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            calendarGridEl.appendChild(emptyCell);
        }

        // Add day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.textContent = day;
            dayCell.classList.add('day-cell');
            // You can add click event listeners to each day here
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