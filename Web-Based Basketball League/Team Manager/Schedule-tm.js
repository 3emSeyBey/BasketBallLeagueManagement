const schedule = [
    { date: "Oct 12, 2026", time: "07:00 PM", home: "Enopoly", homeIco: "🛒", away: "RLC Wheelers", awayIco: "🚲", venue: "Bantayan", status: "Upcoming" },
    { date: "Oct 14, 2026", time: "06:30 PM", home: "RM Tattoo Studio", homeIco: "🎨", away: "Island Storm", awayIco: "🌪️", venue: "Bantayan", status: "Upcoming" },
    { date: "Oct 15, 2026", time: "08:00 PM", home: "Ren Farm", homeIco: "🌿", away: "D17", awayIco: "🔢", venue: "Bantayan", status: "Upcoming" },
    { date: "Oct 10, 2026", time: "05:00 PM", home: "RoadRunners", homeIco: "🏃", away: "VanGuard", awayIco: "🛡️", venue: "Bantayan", status: "Finished" }
];

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('scheduleTableBody');

    // Inject Schedule Rows
    schedule.forEach(game => {
        const statusClass = game.status === "Upcoming" ? "status-upcoming" : "status-finished";
        tableBody.innerHTML += `
            <tr>
                <td><div class="fw-bold">${game.date}</div><div class="small text-muted">${game.time}</div></td>
                <td><span class="me-2">${game.homeIco}</span> <strong>${game.home}</strong></td>
                <td class="text-muted small fw-bold text-center">VS</td>
                <td><span class="me-2">${game.awayIco}</span> <strong>${game.away}</strong></td>
                <td><span class="venue-tag">${game.venue}</span></td>
                <td class="text-end pe-4"><span class="status-pill ${statusClass}">${game.status}</span></td>
            </tr>
        `;
    });

    // Sidebar Interactions
    const openBtn = document.getElementById('openSidebar');
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');

    openBtn.addEventListener('click', () => {
        sideMenu.classList.add('open');
        overlay.classList.add('active');
    });

    overlay.addEventListener('click', () => {
        sideMenu.classList.remove('open');
        overlay.classList.remove('active');
    });
});