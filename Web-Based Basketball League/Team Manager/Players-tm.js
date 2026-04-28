const players = [
    { name: "Justin Mason", pos: "Point Guard", jersey: "04", status: "Active" },
    { name: "Marcus Rivera", pos: "Forward", jersey: "12", status: "Active" },
    { name: "Kevin Chen", pos: "Center", jersey: "33", status: "Pending" },
    { name: "David Miller", pos: "Guard", jersey: "08", status: "Active" }
];

document.addEventListener('DOMContentLoaded', () => {
    const playerBody = document.getElementById('playerTableBody');

    // Inject Players
    players.forEach(p => {
        const statusClass = p.status === "Active" ? "status-active" : "status-pending";
        playerBody.innerHTML += `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td class="text-muted">${p.pos}</td>
                <td class="text-center fw-bold">${p.jersey}</td>
                <td><span class="status-tag ${statusClass}">${p.status}</span></td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-secondary border-0">Edit</button>
                </td>
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