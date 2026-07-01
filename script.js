const hour = document.querySelector(".hour");
const minute = document.querySelector(".minute");
const second = document.querySelector(".second");
const clock = document.getElementById("clock");

const clockItButton = document.getElementById("clock-button");

let lastAngle = null;

let clockMode = "real";
let clockAnimating = false;

let currentSecond = 0;
let currentMinute = 0;
let currentHour = 0;

const defaultNumerals = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

function displayNumerals(labels = defaultNumerals) {
    clock.querySelectorAll(".number").forEach((number) => number.remove());

    labels.forEach((text, i) => {
        const number = document.createElement("div");
        number.className = "number";
        number.textContent = text;

        const angle = (i * 30 - 90) * Math.PI / 180;
        const rect = clock.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const size = clock.getBoundingClientRect().width;
        const radius = size * 0.42;

        number.style.left = `${centerX + Math.cos(angle) * radius}px`;
        number.style.top = `${centerY + Math.sin(angle) * radius}px`;
        number.style.fontSize = `${size * 0.07}px`;

        clock.appendChild(number);
    });
}
displayNumerals();

function getClockSize() {
    return clock.getBoundingClientRect().width;
}
function updateHandSizes() {
    const size = getClockSize();

    hour.style.height = `${size * 0.25}px`;
    minute.style.height = `${size * 0.35}px`;
    second.style.height = `${size * 0.42}px`;
}

updateHandSizes();
window.addEventListener("resize", updateHandSizes);

function renderClock() {
    second.style.transform =
        `translateX(-50%) rotate(${currentSecond * 6}deg)`;

    minute.style.transform =
        `translateX(-50%) rotate(${currentMinute * 6 + currentSecond * 0.1}deg)`;

    hour.style.transform =
        `translateX(-50%) rotate(${(currentHour % 12) * 30 + currentMinute * 0.5}deg)`;
}

function updateClock() {
    if (clockMode === "real") {
        const now = new Date();

        currentSecond = now.getSeconds();
        currentMinute = now.getMinutes();
        currentHour = now.getHours() % 12;
    }

    renderClock();
}

let dragMode = null;
minute.addEventListener("mousedown", () => {
    dragMode = "minute";
    clockMode = "edit"
    lastAngle = ((currentMinute * 6 + currentSecond * 0.1) % 360 + 360) % 360;
});
hour.addEventListener("mousedown", () => {
    dragMode = "hour";
    clockMode = "edit"
    lastAngle = ((currentHour % 12) * 30 + currentMinute * 0.5);
});

document.addEventListener("mousemove", (e) => {

    if (!dragMode)
        return;

    if (clockAnimating)
        return;

    const rect = clock.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    const angle =
        Math.atan2(dy, dx) * 180 / Math.PI + 90;

    const snappedAngle = Math.round(angle / 6) * 6;
    const normalizedAngle = ((snappedAngle % 360) + 360) % 360;

    if (dragMode === "minute") {
        if (lastAngle !== null) {
            let diff = normalizedAngle - lastAngle;

            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;

            if (diff > 0 && lastAngle >= 300 && normalizedAngle <= 60) {
                currentHour = (currentHour + 1) % 12;
            } else if (diff < 0 && lastAngle <= 60 && normalizedAngle >= 300) {
                currentHour = (currentHour + 11) % 12;
            }
        }
        currentMinute = Math.round(normalizedAngle / 6) % 60;
        lastAngle = normalizedAngle;
    }
    else if (dragMode === "hour") {
        const snappedHourAngle = Math.round(normalizedAngle / 30) * 30;

        currentHour = Math.round(snappedHourAngle / 30) % 12;

        //preserve minute influence inside hour hand
        //currentMinute = Math.round((normalizedAngle % 30) * 2);

        lastAngle = normalizedAngle;
    }

    updateClock();

});

document.addEventListener("mouseup", () => {
    dragMode = null;
})

clock.addEventListener("dblclick", () => {
    clockMode = "real";
})

updateClock();
setInterval(updateClock, 1000);    

function animateClock(callback) {

    clockAnimating = true;

    const start = performance.now();
    const duration = 2000;

    const startHour = currentHour;
    const startMinute = currentMinute;
    const startSecond = currentSecond;

    function frame(now) {

        const progress = Math.min((now - start) / duration, 1);
        const eased = 0.5 - Math.cos(progress *Math.PI) / 2;

        const spins = 10;

        currentSecond =
            (startSecond + eased * spins * 60) % 60;

        currentMinute =
            (startMinute + eased * spins * 60) % 60;

        currentHour =
            (startHour + eased * spins * 12) % 12;

        renderClock();

        if (progress < 1) {
            requestAnimationFrame(frame);
        }
        else {

            currentHour = startHour;
            currentMinute = startMinute;
            currentSecond = startSecond;

            renderClock();

            clockAnimating = false;

            callback();

        }

    }

    requestAnimationFrame(frame);

}

function equationMode() {
    const equations = [
        "10+2",
        "5-4",
        "2x1",
        "9÷3",
        "2²",
        "√25",
        "5+1",
        "9-2",
        "2x4",
        "27÷3",
        "10¹",
        "√121"
    ];

    displayNumerals(equations);
}

function runClockFeature() {

    if (currentHour === 3 && currentMinute === 57) {
        equationMode();
    }
    console.log(currentHour, currentMinute)

}

clockItButton.addEventListener("click", () => {
    animateClock(runClockFeature);
    clockMode = "real";
})
