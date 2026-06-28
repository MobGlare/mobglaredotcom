// Create map
const map = L.map("map").setView([47.4983610112664, 19.04045507237725], 12);

// OpenStreetMap tiles
L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);

// Local storage
const settings = {
    networkView: false,
    showStationGroupsSetting: true,
    showAllStations: false
};

const savedSettings = localStorage.getItem("settings");
if (savedSettings) {
    Object.assign(settings, JSON.parse(savedSettings));
}

function saveSettings() {
    localStorage.setItem("settings", JSON.stringify(settings));
}

document.getElementById("network-view-toggle").checked = settings.networkView;
document.getElementById("station-groups-toggle").checked = settings.showStationGroupsSetting;
document.getElementById("all-stations-toggle").checked = settings.showAllStations;

// Data storage
const stationMap = {};
const stationMarkers = {};
const renderedLines = {};

const stationGroupMap = {};
const stationGroupMarkers = {};
const groupedStations = {};

let infoboxData = {};
let selectedLine = null;
let selectedYear = null;

let transitData = null;

// Sidebar elements
const stationList = document.getElementById("station-list");
const searchInput = document.getElementById("search-desktop");
const lineList = document.getElementById("line-list");
const closeInfobox = document.getElementById("deselect-line");
const lineInfo = document.getElementById("infobox-content");
const mapSettings = document.getElementById("settings");


const mobileSearch = document.getElementById("search-bar-mobile");
const results = document.getElementById("search-results");
const mobileHandle = document.getElementById("mobile-handle");
const mobileInfo = document.getElementById("mobile-infocontent");

mobileSearch.addEventListener("focus", () => {
    results.style.display = "block";
    lineList.style.display = "none";
});

mobileSearch.addEventListener("input", () => {
    const query = mobileSearch.value.toLowerCase();
    results.style.display = "block";
    document.querySelectorAll(".search-result").forEach(item => {
        const searchableName = item.textContent
            .replace(/\s*\(.*\)/, "")
            .toLowerCase();
        item.style.display =
            searchableName.includes(query)
            ? ""
            : "none";
    });
});

document.addEventListener("click", event => {
    if (!mobileSearch.contains(event.target) && !results.contains(event.target)) {
        results.style.display = "none";
    }
});

searchInput.addEventListener("focus", () => {
    lineList.style.display = "flex";
    results.style.display = "none";
});

searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    lineList.style.display = "flex";
    results.style.display = "none";
    document.querySelectorAll(".line-button").forEach(item => {
        const searchableName = item.textContent
            .replace(/\s*\(.*\)/, "")
            .toLowerCase();
        item.style.display =
            searchableName.includes(query)
            ? ""
            : "none";
    });
});

document.addEventListener("click", event => {
    if (!searchInput.contains(event.target) && !lineList.contains(event.target)) {
        lineList.style.display = "none";
    }
});

function updateMap() {
    const shouldShowGroups = settings.showStationGroupsSetting || settings.showAllStations;
    //Station Groups
    Object.values(stationGroupMarkers).forEach(marker => {
        if (
            shouldShowGroups &&
            !selectedLine
        ) {
            map.addLayer(marker);
        }
        else {
            map.removeLayer(marker);
        }
    });
    //All Stations
    if (settings.showAllStations && !selectedLine) {
        Object.entries(stationMarkers).forEach(([id, marker]) => {
            if (groupedStations[id]) {
                map.removeLayer(marker);
                return;
            }
            if (map.getZoom() >= 15) {
                map.addLayer(marker);
            }
            else {
                map.removeLayer(marker);
            }
});
    }
    else if (!selectedLine) {
        Object.values(stationMarkers).forEach(marker => {
            map.removeLayer(marker);
        });
    }
    //Network View
    Object.values(renderedLines).forEach(line => {
        if (
            settings.networkView &&
            !selectedLine
        ) {
            map.addLayer(line);
        }
        else if (!selectedLine) {
            map.removeLayer(line);
        }
    });

}

function getStationName(station, year) {

    // Determine which year to use for name lookup. Prefer the explicit
    // `year` argument, then the currently selected line year, then the
    // current calendar year.
    const y = (typeof year !== "undefined" && year !== null)
        ? year
        : (typeof selectedYear !== "undefined" && selectedYear !== null)
            ? selectedYear
            : new Date().getFullYear();

    if (!station.names) {
        return station.name || "Unknown";
    }

    const entry = station.names.find(name => {

        const startsBefore = name.startYear === null || y >= name.startYear;
        const endsAfter = name.endYear === null || y <= name.endYear;

        return startsBefore && endsAfter;

    });

    return entry ? entry.name : (station.name || "Unknown");
}

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

    // Populate station list in the order defined by the line
    line.stations.forEach(id => {

        const station = stationMap[id];

        const div = document.createElement("div");

        div.textContent = getStationName(station, selectedYear);
        div.classList.add("station-item");

        div.addEventListener("click", () => {

            const marker = stationMarkers[id];

            map.setView(
                [station.lat, station.lng],
                16
            );

            marker.openPopup();

        });

        stationList.appendChild(div);

    });

}

function showStationGroups() {

    Object.values(stationGroupMarkers).forEach(marker => {
        if (settings.showStationGroupsSetting && !selectedLine) {
            map.addLayer(marker);
        }
        else {
            map.removeLayer(marker);
        }
    });

}

function hideStationGroups() {

    Object.values(stationGroupMarkers).forEach(marker => {map.removeLayer(marker)});

}

function getLinesAtGroup(group) {

    const lines = [];

    transitData.lines.forEach(line => {
        const stopsHere = line.stations.some(stationId => group.stations.includes(stationId));
        if (stopsHere) {
            lines.push(line);
        }
    });

    return lines;

}

function getStationGroupName(group) {
    if (!group.names || group.names.length === 0) {
        return group.name || "Station Group";
    }

    const year = (selectedYear !== null && selectedYear !== undefined)
        ? selectedYear
        : new Date().getFullYear();

    const entry = group.names.find(name => {
        const startsBefore = name.startYear === null || year >= name.startYear;
        const endsAfter = name.endYear === null || year <= name.endYear;
        return startsBefore && endsAfter;
    });

    return entry ? entry.name : group.names[0].name;
}

function showStationGroup(group) {

    const lines = getLinesAtGroup(group);

    let html = `
        <h2>${getStationGroupName(group)}</h2>
    `;

    mobileInfo.innerHTML = html;
    lineInfo.innerHTML = html;

    lines.forEach(line => {

        const button = document.createElement("button");

        button.textContent = line.name;

        button.classList.add("group-line-button");

        button.style.backgroundColor = line.color;

        button.addEventListener("click", () => {
            selectLine(line);
        });

        if (window.innerWidth <= 768) {
            mobileInfo.appendChild(button);
        }
        else {
            lineInfo.appendChild(button);
        }

    });

}

function updateStationMarkers(line) {

    const visibleIds = new Set(line.stations);

    const firstStation = line.stations[0];
    const lastStation = line.stations[line.stations.length-1];

    Object.entries(stationMarkers).forEach(
        ([id, marker]) => {

            const isTerminus =
                id === firstStation ||
                id === lastStation;

            if (
                visibleIds.has(id) &&
                (
                    isTerminus ||
                    map.getZoom() >= 15
                )
            ) {

                map.addLayer(marker);

            } else {

                map.removeLayer(marker);

            }

        }
    );

}

map.on("zoomend", () => {

    if (selectedLine) {
        updateStationMarkers(selectedLine);
    }
    else {
        updateMap();
    }

});

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
            // create an initially-empty popup and update it when opened so
            // the popup reflects the currently selected year
            .bindPopup("");

            marker.on("popupopen", () => {
                const popup = marker.getPopup();
                if (popup) {
                    popup.setContent(getStationName(station));
                }
            });

            stationMarkers[station.id] = marker;

        });

        // Station Groups
        data.station_groups.forEach(group => {
            
            stationGroupMap[group.id] = group;

            const locationStation = stationMap[group.stations[0]];
            
            const marker = L.marker([
                locationStation.lat,
                locationStation.lng
            ])
            .bindPopup(group.names[0].name);

            marker.addEventListener("click", () => { showStationGroup(group); })

            stationGroupMarkers[group.id] = marker;

            group.stations.forEach(id => {groupedStations[id] = true});

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

            //polyline.addTo(map);

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
        data.lines.forEach(line => {

            const item = document.createElement("div");

            item.textContent = line.name;

            item.classList.add("search-result");

            item.addEventListener("click", () => {
                selectLine(line);
                results.style.display = "none";
                mobileSearch.value = "";
            });

            results.appendChild(item);

        });

        updateMap();

        // // Show first line by default
        // if (data.lines.length > 0) {
        //     selectLine(
        //         data.lines[0]
        //     );
        // }

        transitData = data;

        showStationGroups();

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

    const years = 
        info.endYear === null
        ? `${info.startYear}–Present`
        : `${info.startYear}–${info.endYear}`;

    const html = `
        <h2>${info.name}</h2>

        <p>
            <strong>Operator:</strong>
            ${info.operator}
        </p>

        <p>
            <strong>Years:</strong>
            ${years}
        </p>

        <p>
            <strong>Stations:</strong>
            ${info.stationCount}
        </p>

        <details>
            <summary>Sources:</summary>
            ${sourcesHtml}
        </details>

    `;
    lineInfo.innerHTML = html;
    mobileInfo.innerHTML = html;
}

// Select a line
function selectLine(line) {

    selectedLine = line;

    selectedYear = infoboxData[line.name].endYear;

    hideStationGroups();

    showOnlyLine(line.name);

    showStations(line);

    updateInfoBox(line);

    updateStationMarkers(line);

    stationList.style.display = "block";
    mapSettings.style.display = "none";
    lineList.style.display = "none";
    searchInput.value = "";

    const polyline = renderedLines[line.name];

    map.fitBounds(
        polyline.getBounds(),
        { padding: [50, 50] }
    );

}

function deselectLine() {

    selectedLine = null;

    showStationGroups();

    updateMap();

    mapSettings.style.display = "block";

    // // Hide all lines
    // Object.values(renderedLines)
    //     .forEach(polyline => {
    //         map.removeLayer(polyline);
    //     });

    // // Hide all stations
    // Object.values(stationMarkers)
    //     .forEach(marker => {
    //         map.removeLayer(marker);
    //     });

    // Clear station list
    stationList.innerHTML = "";

    // Reset infobox
    lineInfo.innerHTML = `
        <p>Select a line to begin.</p>
    `;

    mobileSearch.value = "";

    results.style.display = "none";

    stationList.style.display = "none";

    mobileInfo.innerHTML = `
        <center><p>Select a line from the search bar.</p></center>
    `;

}

mobileHandle.addEventListener(
    "click",
    deselectLine
);

closeInfobox.addEventListener(
    "click",
    deselectLine
);

document
    .getElementById("network-view-toggle")
    .addEventListener("change", function () {
        settings.networkView = this.checked;
        saveSettings();
        updateMap();
    });
document
    .getElementById("station-groups-toggle")
    .addEventListener("change", function () {
        settings.showStationGroupsSetting = this.checked;
        saveSettings();
        updateMap();
    });
document
    .getElementById("all-stations-toggle")
    .addEventListener("change", function () {
        settings.showAllStations = this.checked;
        saveSettings();
        updateMap();
    });