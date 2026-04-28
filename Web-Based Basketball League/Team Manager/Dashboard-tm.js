const matches = [
    { home: "Enopoly", homeIco: "🛒", away: "RLC Wheelers", awayIco: "🚲", date: "Oct 12, 2026", time: "07:00 PM", venue: "Bantayan" },
    { home: "RM Tattoo Studio", homeIco: "🎨", away: "Island Storm", awayIco: "🌪️", date: "Oct 14, 2026", time: "06:30 PM", venue: "Bantayan" },
    { home: "Ren Farm", homeIco: "🌿", away: "D17", awayIco: "🔢", date: "Oct 15, 2026", time: "08:00 PM", venue: "Bantayan" },
    { home: "RoadRunners", homeIco: "🏃", away: "VanGuard", awayIco: "🛡️", date: "Oct 17, 2026", time: "08:30 PM", venue: "Bantayan" }
];

const announcements = [
    { title: "Winter Season Registration Open", ico: "📢", time: "2 HOURS AGO" },
    { title: "Venue Change: Bantayan", ico: "ℹ️", time: "1 DAY AGO" },
    { title: "Referee Training Completion", ico: "✅", time: "3 DAYS AGO" }
];

document.addEventListener('DOMContentLoaded', () => {
    // Populate Matches
    const matchBody = document.getElementById('matchTableBody');
    matches.forEach(m => {
        matchBody.innerHTML += `
            <tr>
                <td><span class="me-2">${m.homeIco}</span> <strong>${m.home}</strong></td>
                <td><span class="me-2">${m.awayIco}</span> <strong>${m.away}</strong></td>
                <td><div class="fw-bold">${m.date}</div><div class="small text-muted">${m.time}</div></td>
                <td><span class="venue-tag">${m.venue}</span></td>
            </tr>`;
    });

    // Populate Announcements
    const annoList = document.getElementById('announcementsList');
    announcements.forEach(a => {
        annoList.innerHTML += `
            <div class="anno-item">
                <div class="anno-icon">${a.ico}</div>
                <div>
                    <h6 class="fw-bold mb-0" style="font-size: 0.9rem;">${a.title}</h6>
                    <small class="text-muted fw-bold" style="font-size: 0.7rem;">${a.time}</small>
                </div>
            </div>`;
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