// Create map
const map = L.map("map").setView([47.1625, 19.5033], 7);

// OpenStreetMap tiles
L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);

// Data storage
const stationMap = {};
const stationMarkers = {};
const renderedLines = {};

let infoboxData = {};

// Sidebar elements
const lineList = document.getElementById("line-list");
const stationList = document.getElementById("station-list");
const searchInput = document.getElementById("search");
const lineInfo = document.getElementById("infobox");

// Show one line and hide others
function showOnlyLine(selectedName) {

    Object.entries(renderedLines).forEach(
        ([name, polyline]) => {

            if (name === selectedName) {
                map.addLayer(polyline);
            } else {
                map.removeLayer(polyline);
            }

        }
    );
}

// Show station list
function showStations(line) {


    stationList.innerHTML = "";

    // Show markers only for stations on the selected line,
    // hide all other station markers.
    const visibleIds = new Set(line.stations);

    Object.entries(stationMarkers).forEach(([id, marker]) => {
        if (visibleIds.has(id)) {
            map.addLayer(marker);
        } else {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        }
    });

    // Populate station list in the order defined by the line
    line.stations.forEach(id => {

        const station = stationMap[id];

        const div = document.createElement("div");

        div.textContent = station.name;
        div.classList.add("station-item");

        div.addEventListener("click", () => {

            const marker = stationMarkers[id];

            map.setView(
                [station.lat, station.lng],
                14
            );

            marker.openPopup();

        });

        stationList.appendChild(div);

    });

}

// Load JSON

Promise.all([
    fetch("data.json").then(r => r.json()),
    fetch("infobox.json").then(r => r.json())
    ])
    //.then(response => response.json())
    .then(([data, loadedInfoboxData]) => {

        infoboxData = loadedInfoboxData;

        // Stations
        data.stations.forEach(station => {

            stationMap[station.id] = station;

            const marker = L.marker([
                station.lat,
                station.lng
            ])
            .addTo(map)
            .bindPopup(station.name);

            stationMarkers[station.id] = marker;

        });

        // Lines
        data.lines.forEach(line => {

            const polyline = L.polyline(
                line.route,
                {
                    color: line.color,
                    weight: 5
                }
            );

            polyline.addTo(map);

            renderedLines[line.name] =
                polyline;

            const button =
                document.createElement(
                    "button"
                );

            button.textContent =
                line.name;

            button.classList.add(
                "line-button"
            );

            button.style.backgroundColor =
                `${line.color}`;

            button.addEventListener(
                "click",
                () => selectLine(line)
            );

            lineList.appendChild(
                button
            );

        });

        // Show first line by default
        if (data.lines.length > 0) {
            selectLine(
                data.lines[0]
            );
        }

    })
    .catch(error => {
        console.error(
            "Failed to load JSON:",
            error
        );
    });

function updateInfoBox(line) {

    const info =
        infoboxData[line.name];

    if (!info) {

        lineInfo.innerHTML =
            "<p>No information available.</p>";

        return;
    }

    const notesHtml =
        info.notes
            .map(note => `<li>${note}</li>`)
            .join("");

    const sourcesHtml =
        info.sources
            .map(source => `<li><a href="${source}" target="_blank">${source}</a></li>`)
            .join("");

    lineInfo.innerHTML = `

        <h2>${info.name}</h2>

        <p>
            <strong>Operator:</strong>
            ${info.operator}
        </p>

        <p>
            <strong>Years:</strong>
            ${info.startYear}–${info.endYear}
        </p>

        <p>
            <strong>Stations:</strong>
            ${info.stationCount}
        </p>

        <p>
            <strong>Notes:</strong>
        </p>

        <ul>
            ${notesHtml}
        </ul>

        <p>
            <strong>Sources:</strong>
        </p>

        <ul>
            ${sourcesHtml}
        </ul>

    `;
}

// Select a line
function selectLine(line) {

    showOnlyLine(line.name);

    showStations(line);

    updateInfoBox(line)

    const polyline = renderedLines[line.name];

    map.fitBounds(
        polyline.getBounds(),
        { padding: [50, 50] }
    );

}

// Search
searchInput.addEventListener(
    "input",
    () => {

        const query =
            searchInput.value
                .toLowerCase();

        document
            .querySelectorAll(
                ".line-button"
            )
            .forEach(button => {

                button.style.display =
                    button.textContent
                        .toLowerCase()
                        .includes(query)
                    ? ""
                    : "none";

            });

    }
);