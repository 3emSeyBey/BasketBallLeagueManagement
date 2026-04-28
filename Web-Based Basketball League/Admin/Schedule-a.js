// Schedule Data
const games = [
    { date: "Oct 12, 2026", time: "07:00 PM", home: "Enopoly", away: "RLC Wheelers", venue: "Madridejos", div: "Division A" },
    { date: "Oct 14, 2026", time: "06:30 PM", home: "RM Tattoo Studio", away: "Island Storm", venue: "Madridejos", div: "Division A" },
    { date: "Oct 15, 2026", time: "08:00 PM", home: "Ren Farm", away: "D17", venue: "Madridejos", div: "Division B" },
    { date: "Oct 17, 2026", time: "08:30 PM", home: "RoadRunners", away: "VanGuard", venue: "Madridejos", div: "Division B" }
];

function renderSchedule(filter = "all") {
    const tableBody = document.getElementById('scheduleBody');
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const filteredGames = games.filter(g => filter === "all" || g.div === filter);

    filteredGames.forEach(g => {
        tableBody.innerHTML += `
            <tr>
                <td class="fw-bold">${g.date}</td>
                <td class="text-muted">${g.time}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <strong>${g.home}</strong> <span class="mx-2 text-muted">vs</span> <strong>${g.away}</strong>
                    </div>
                </td>
                <td><span class="venue-tag">${g.venue}</span></td>
                <td><span class="small fw-bold">${g.div}</span></td>
                <td><button class="btn btn-sm btn-outline-secondary">Edit</button></td>
            </tr>
        `;
    });
}

function filterSchedule(div, btn) {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    renderSchedule(div);
}

// Sidebar Controls
document.addEventListener('DOMContentLoaded', () => {
    const drawer = document.getElementById('adminDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const trigger = document.getElementById('openAdminMenu');

    trigger.addEventListener('click', () => {
        drawer.classList.add('open');
        overlay.classList.add('active');
    });

    overlay.addEventListener('click', () => {
        drawer.classList.remove('open');
        overlay.classList.remove('active');
    });

    renderSchedule();
});