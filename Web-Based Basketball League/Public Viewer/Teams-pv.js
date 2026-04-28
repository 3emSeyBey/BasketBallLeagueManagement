const leagueTeams = [
    { name: "Enopoly", logo: "🛒", division: "Division A", players: 12, wins: 8, losses: 2 },
    { name: "RLC Wheelers", logo: "🚲", division: "Division A", players: 11, wins: 7, losses: 3 },
    { name: "RM Tattoo Studio", logo: "🎨", division: "Division B", players: 12, wins: 5, losses: 5 },
    { name: "Island Storm", logo: "🌪️", division: "Division A", players: 10, wins: 9, losses: 1 },
    { name: "Ren Farm", logo: "🌿", division: "Division B", players: 13, wins: 4, losses: 6 },
    { name: "D17", logo: "🔢", division: "Division B", players: 12, wins: 6, losses: 4 },
    { name: "RoadRunners", logo: "🏃", division: "Division A", players: 11, wins: 3, losses: 7 },
    { name: "VanGuard", logo: "🛡️", division: "Division B", players: 12, wins: 2, losses: 8 }
];

let currentSearch = "";
let currentDivision = "All Teams";

function renderTeams() {
    const grid = document.getElementById('teams-grid');
    if (!grid) return;

    grid.innerHTML = "";

    // Comprehensive filter: matches search string AND division selection
    const filtered = leagueTeams.filter(team => {
        const matchesSearch = team.name.toLowerCase().includes(currentSearch.toLowerCase());
        const matchesDivision = currentDivision === "All Teams" || team.division === currentDivision;
        return matchesSearch && matchesDivision;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center py-5 text-muted">No teams found matching your selection.</div>`;
        return;
    }

    filtered.forEach(team => {
        grid.innerHTML += `
            <div class="col-md-3">
                <div class="content-card team-card">
                    <div class="team-logo-lg">${team.logo}</div>
                    <h5 class="fw-bold mb-1">${team.name}</h5>
                    <p class="text-muted small mb-3">${team.division}</p>
                    <hr>
                    <div class="d-flex justify-content-between px-2">
                        <div class="text-center">
                            <div class="fw-bold">${team.players}</div>
                            <div class="text-muted-extra">PLAYERS</div>
                        </div>
                        <div class="text-center">
                            <div class="fw-bold text-success">${team.wins}</div>
                            <div class="text-muted-extra">WINS</div>
                        </div>
                        <div class="text-center">
                            <div class="fw-bold text-danger">${team.losses}</div>
                            <div class="text-muted-extra">LOSS</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderTeams();

    // 1. Search Logic
    const searchInput = document.getElementById('teamSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            renderTeams();
        });
    }

    // 2. Division Filter Logic
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            // Update Active UI State
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Set Filter State from data attribute
            currentDivision = this.getAttribute('data-division');

            // Quick visual feedback (Fade out/in)
            const grid = document.getElementById('teams-grid');
            grid.style.opacity = '0';

            setTimeout(() => {
                renderTeams();
                grid.style.opacity = '1';
            }, 150);
        });
    });
});