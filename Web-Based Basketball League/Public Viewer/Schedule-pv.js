const games = [
    { date: "Monday, Oct 12", time: "07:00 PM", home: "Enopoly", homeIcon: "🛒", away: "RLC Wheelers", awayIcon: "🚲", venue: "Covered Court", status: "Regular" },
    { date: "Monday, Oct 12", time: "08:30 PM", home: "VanGuard", homeIcon: "🛡️", away: "D17", awayIcon: "🔢", venue: "Plaza", status: "Regular" },
    { date: "Wednesday, Oct 14", time: "06:30 PM", home: "RM Tattoo", homeIcon: "🎨", away: "Island Storm", awayIcon: "🌪️", venue: "Covered Court", status: "VENUE CHANGED" },
    { date: "Thursday, Oct 15", time: "08:00 PM", home: "Ren Farm", homeIcon: "🌿", away: "RoadRunners", awayIcon: "🏃", venue: "Plaza", status: "Regular" }
];

function renderSchedule() {
    const container = document.getElementById('schedule-container');
    if (!container) return;

    // Grouping games by date
    const grouped = games.reduce((acc, game) => {
        if (!acc[game.date]) acc[game.date] = [];
        acc[game.date].push(game);
        return acc;
    }, {});

    let html = '';

    for (const date in grouped) {
        html += `<div class="date-group-label">${date}</div>`;

        grouped[date].forEach(game => {
            const statusClass = game.status === "Regular" ? "text-muted-extra" : "status-changed";

            html += `
                <div class="content-card game-card">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <div class="time-slot">${game.time}</div>
                            <div class="text-muted small">Game ID: #10${Math.floor(Math.random() * 90)}</div>
                        </div>
                        <div class="col-md-7">
                            <div class="d-flex justify-content-center align-items-center gap-4">
                                <div class="text-center">
                                    <div class="fs-3">${game.homeIcon}</div>
                                    <div class="team-name">${game.home}</div>
                                </div>
                                <div class="vs-divider text-uppercase">vs</div>
                                <div class="text-center">
                                    <div class="fs-3">${game.awayIcon}</div>
                                    <div class="team-name">${game.away}</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3 text-md-end">
                            <span class="venue-tag">${game.venue}</span>
                            <span class="${statusClass} d-block mt-2 text-uppercase">${game.status}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', renderSchedule);