const standingsData = [
    { name: "Island Storm", logo: "🌪️", div: "A", gp: 10, w: 9, l: 1, strk: "W5", status: "P" },
    { name: "Enopoly", logo: "🛒", div: "A", gp: 10, w: 8, l: 2, strk: "W2", status: "P" },
    { name: "RLC Wheelers", logo: "🚲", div: "A", gp: 10, w: 7, l: 3, strk: "L1", status: "" },
    { name: "RoadRunners", logo: "🏃", div: "A", gp: 10, w: 3, l: 7, strk: "L2", status: "" },
    { name: "D17", logo: "🔢", div: "B", gp: 10, w: 6, l: 4, strk: "W1", status: "P" },
    { name: "RM Tattoo", logo: "🎨", div: "B", gp: 10, w: 5, l: 5, strk: "L1", status: "" },
    { name: "Ren Farm", logo: "🌿", div: "B", gp: 10, w: 4, l: 6, strk: "W1", status: "" },
    { name: "VanGuard", logo: "🛡️", div: "B", gp: 10, w: 2, l: 8, strk: "L4", status: "E" }
];

function renderStandings(division = 'A') {
    const tableBody = document.getElementById('standings-body');
    if (!tableBody) return;

    // Filter by division and sort by Wins (descending)
    const filtered = standingsData
        .filter(t => t.div === division)
        .sort((a, b) => b.w - a.w);

    tableBody.innerHTML = '';

    filtered.forEach((team, index) => {
        const pct = (team.w / team.gp).toFixed(3);
        const streakClass = team.strk.startsWith('W') ? 'streak-w' : 'streak-l';
        const statusBadge = team.status ? `<span class="badge ${team.status === 'P' ? 'bg-success' : 'bg-secondary'}">${team.status}</span>` : '';

        const row = `
            <tr>
                <td class="ps-4"><span class="rank-number">${index + 1}</span></td>
                <td>
                    <div class="team-cell">
                        <span class="fs-4">${team.logo}</span>
                        <strong>${team.name}</strong>
                    </div>
                </td>
                <td class="text-center">${team.gp}</td>
                <td class="text-center fw-bold">${team.w}</td>
                <td class="text-center">${team.l}</td>
                <td class="text-center pct-cell">${pct}</td>
                <td class="text-center ${streakClass}">${team.strk}</td>
                <td class="pe-4 text-center">${statusBadge}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function filterStandings(div) {
    // Update button UI
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(div)) btn.classList.add('active');
    });
    renderStandings(div);
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    renderStandings('A');
});