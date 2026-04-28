const standingsData = [
    { team: "Island Storm", ico: "🌪️", div: "A", gp: 10, w: 9, l: 1, form: ["W", "W", "W"] },
    { team: "Enopoly", ico: "🛒", div: "A", gp: 10, w: 8, l: 2, form: ["W", "W", "L"] },
    { team: "RLC Wheelers", ico: "🚲", div: "A", gp: 10, w: 7, l: 3, form: ["L", "W", "W"] },
    { team: "Ren Farm", ico: "🌿", div: "B", gp: 10, w: 6, l: 4, form: ["L", "W", "W"] },
    { team: "D17", ico: "🔢", div: "B", gp: 10, w: 5, l: 5, form: ["W", "L", "L"] },
    { team: "RM Tattoo Studio", ico: "🎨", div: "B", gp: 10, w: 4, l: 6, form: ["L", "L", "W"] }
];

function renderSeparatedStandings() {
    const divABody = document.getElementById('divisionA-Body');
    const divBBody = document.getElementById('divisionB-Body');

    const teamsA = standingsData.filter(t => t.div === "A");
    const teamsB = standingsData.filter(t => t.div === "B");

    divABody.innerHTML = teamsA.map((t, i) => createRow(t, i + 1)).join("");
    divBBody.innerHTML = teamsB.map((t, i) => createRow(t, i + 1)).join("");
}

function createRow(team, pos) {
    const dots = team.form.map(f => `<span class="form-dot ${f === 'W' ? 'dot-w' : 'dot-l'}"></span>`).join("");
    return `<tr>
        <td class="ps-4"><span class="team-rank ${pos <= 2 ? 'top-rank' : ''}">${pos}</span></td>
        <td><div class="d-flex align-items-center"><span class="me-2">${team.ico}</span><strong>${team.team}</strong></div></td>
        <td class="text-center fw-bold">${team.gp}</td>
        <td class="text-center text-success fw-bold">${team.w}</td>
        <td class="text-center text-danger fw-bold">${team.l}</td>
        <td class="pe-4 text-end">${dots}</td>
    </tr>`;
}

function filterBy(div, btn) {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');

    const secA = document.getElementById('sectionA');
    const secB = document.getElementById('sectionB');

    if (div === 'all') { secA.style.display = 'block'; secB.style.display = 'block'; }
    else if (div === 'A') { secA.style.display = 'block'; secB.style.display = 'none'; }
    else { secA.style.display = 'none'; secB.style.display = 'block'; }
}

document.addEventListener('DOMContentLoaded', () => {
    renderSeparatedStandings();
    const drawer = document.getElementById('adminDrawer');
    const overlay = document.getElementById('drawerOverlay');

    document.getElementById('openAdminMenu').addEventListener('click', () => {
        drawer.classList.add('open');
        overlay.classList.add('active');
    });

    overlay.addEventListener('click', () => {
        drawer.classList.remove('open');
        overlay.classList.remove('active');
    });
});