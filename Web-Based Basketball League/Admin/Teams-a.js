// Mock Team Data
const teams = [
    { name: "Enopoly", logo: "🛒", div: "A", players: 12, wins: 8, losses: 2 },
    { name: "RLC Wheelers", logo: "🚲", div: "A", players: 11, wins: 7, losses: 3 },
    { name: "RM Tattoo Studio", logo: "🎨", div: "B", players: 12, wins: 5, losses: 5 },
    { name: "Island Storm", logo: "🌪️", div: "A", players: 10, wins: 9, losses: 1 },
    { name: "Ren Farm", logo: "🌿", div: "B", players: 13, wins: 4, losses: 6 },
    { name: "D17", logo: "🔢", div: "B", players: 12, wins: 6, losses: 4 }
];

let currentFilter = 'all';

function renderTeams(search = "") {
    const grid = document.getElementById('teamsGrid');
    if (!grid) return;
    grid.innerHTML = "";

    const filtered = teams.filter(t => {
        const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
        const matchDiv = currentFilter === 'all' || t.div === currentFilter;
        return matchSearch && matchDiv;
    });

    filtered.forEach(t => {
        grid.innerHTML += `
            <div class="col-md-3">
                <div class="content-card team-card">
                    <div class="team-logo-lg">${t.logo}</div>
                    <h5 class="fw-bold mb-1">${t.name}</h5>
                    <p class="text-muted small">Division ${t.div}</p>
                    <div class="d-flex justify-content-around align-items-center mt-4">
                        <div><div class="fw-bold">${t.players}</div><div class="text-muted small" style="font-size:10px">PLAYERS</div></div>
                        <div class="stat-divider"></div>
                        <div><div class="fw-bold text-success">${t.wins}</div><div class="text-muted small" style="font-size:10px">WINS</div></div>
                        <div class="stat-divider"></div>
                        <div><div class="fw-bold text-danger">${t.losses}</div><div class="text-muted small" style="font-size:10px">LOSS</div></div>
                    </div>
                    <button class="btn btn-light w-100 mt-3 py-2 fw-bold small">View Roster</button>
                </div>
            </div>
        `;
    });
}

function filterByDiv(div, btn) {
    currentFilter = div;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    renderTeams(document.getElementById('teamSearch').value);
}

// Function to handle Admin Menu
document.addEventListener('DOMContentLoaded', () => {
    const drawer = document.getElementById('adminDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const openBtn = document.getElementById('openAdminMenu');

    openBtn.addEventListener('click', () => {
        drawer.classList.add('open');
        overlay.classList.add('active');
    });

    overlay.addEventListener('click', () => {
        drawer.classList.remove('open');
        overlay.classList.remove('active');
    });

    renderTeams();
    document.getElementById('teamSearch').addEventListener('input', (e) => {
        renderTeams(e.target.value);
    });
});