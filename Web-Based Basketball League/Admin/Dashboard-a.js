// Mock Data
const matches = [
    { home: "Enopoly", homeIcon: "🛒", away: "RLC Wheelers", awayIcon: "🚲", date: "Oct 12, 2026", time: "07:00 PM", venue: "Madridejos" },
    { home: "RM Tattoo Studio", homeIcon: "🎨", away: "Island Storm", awayIcon: "🌪️", date: "Oct 14, 2026", time: "06:30 PM", venue: "Madridejos" },
    { home: "Ren Farm", homeIcon: "🌿", away: "D17", awayIcon: "🔢", date: "Oct 15, 2026", time: "08:00 PM", venue: "Madridejos" },
    { home: "RoadRunners", homeIcon: "🏃", away: "VanGuard", awayIcon: "🛡️", date: "Oct 17, 2026", time: "08:30 PM", venue: "Madridejos" }
];

const announcements = [
    { title: "Winter Season Registration Open", desc: "Teams can now register...", time: "2 Hours Ago", icon: "📢" },
    { title: "Venue Change: Madridejos", desc: "Game scheduled for Oct 14 moved...", time: "1 Day Ago", icon: "ℹ️" },
    { title: "Referee Training Completion", desc: "All 15 referees completed safety...", time: "3 Days Ago", icon: "✅" }
];

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    // Populate Matches
    const matchContainer = document.getElementById('matchList');
    matches.forEach(m => {
        matchContainer.innerHTML += `
            <tr>
                <td><span class="me-2">${m.homeIcon}</span> <strong>${m.home}</strong></td>
                <td><span class="me-2">${m.awayIcon}</span> <strong>${m.away}</strong></td>
                <td><div class="fw-bold">${m.date}</div><div class="small text-muted">${m.time}</div></td>
                <td><span class="venue-tag">${m.venue}</span></td>
            </tr>
        `;
    });

    // Populate Announcements
    const annoContainer = document.querySelector('.announcement-stack');
    announcements.forEach(a => {
        annoContainer.innerHTML += `
            <div class="anno-item">
                <div class="anno-icon">${a.icon}</div>
                <div>
                    <h6 class="fw-bold mb-1">${a.title}</h6>
                    <p class="text-muted small mb-0">${a.desc}</p>
                    <small class="text-uppercase fw-bold text-muted" style="font-size: 10px">${a.time}</small>
                </div>
            </div>
        `;
    });

    // Drawer Logic
    const drawer = document.getElementById('adminDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const trigger = document.getElementById('openAdminMenu');

    trigger.addEventListener('click', () => {
        drawer.classList.add('open');
        overlay.style.display = 'block';
    });

    overlay.addEventListener('click', () => {
        drawer.classList.remove('open');
        overlay.style.display = 'none';
    });
});