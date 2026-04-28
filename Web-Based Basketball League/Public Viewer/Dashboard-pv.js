const matchData = [
    { home: "Enopoly", homeLogo: "🛒", away: "RLC Wheelers", awayLogo: "🚲", date: "Oct 12, 2026", time: "07:00 PM", venue: "Bantayan" },
    { home: "RM Tattoo Studio", homeLogo: "🎨", away: "Island Storm", awayLogo: "🌪️", date: "Oct 14, 2026", time: "06:30 PM", venue: "Bantayan" },
    { home: "Ren Farm", homeLogo: "🌿", away: "D17", awayLogo: "🔢", date: "Oct 15, 2026", time: "08:00 PM", venue: "Bantayan" },
    { home: "RoadRunners", homeLogo: "🏃", away: "VanGuard", awayLogo: "🛡️", date: "Oct 17, 2026", time: "08:30 PM", venue: "Bantayan" }
];

function populateMatches() {
    const tableBody = document.getElementById('match-table-body');

    matchData.forEach(match => {
        const row = `
            <tr>
                <td><span class="me-2">${match.homeLogo}</span> <strong>${match.home}</strong></td>
                <td><span class="me-2">${match.awayLogo}</span> <strong>${match.away}</strong></td>
                <td>
                    <div class="fw-bold">${match.date}</div>
                    <div class="text-muted small">${match.time}</div>
                </td>
                <td><span class="venue-badge">${match.venue}</span></td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    populateMatches();
});