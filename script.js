const $ = (id) => document.getElementById(id);

const minutesEl = $("minutes");
const secondsEl = $("seconds");
const centisecondsEl = $("centiseconds");

const startBtn = $("startBtn");
const startText = $("startText");
const startIcon = $("startIcon");
const resetBtn = $("resetBtn");
const lapBtn = $("lapBtn");
const clearLapsBtn = $("clearLapsBtn");

const statusText = $("statusText");
const timerCaption = $("timerCaption");
const elapsedLabel = $("elapsedLabel");
const ringProgress = $("ringProgress");

const totalLapsEl = $("totalLaps");
const bestLapEl = $("bestLap");
const averageLapEl = $("averageLap");
const lapCountBadge = $("lapCountBadge");
const lapsList = $("lapsList");

const CIRCUMFERENCE = 2 * Math.PI * 137;

// Stopwatch state
let running = false;
let startTimestamp = 0;
let accumulatedTime = 0;
let animationFrame = null;
let laps = [];
let previousLapTime = 0;

const pad = (value) => String(value).padStart(2, "0");

// Format milliseconds as MM:SS.CC
function formatTime(milliseconds) {
  const totalCentiseconds = Math.floor(
    Math.max(0, milliseconds) / 10
  );

  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor(
    (totalCentiseconds % 6000) / 100
  );
  const centiseconds = totalCentiseconds % 100;

  return (
    `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`
  );
}

// Get the elapsed time from the monotonic clock
function getElapsedTime() {
  if (!running) return accumulatedTime;

  return accumulatedTime + (performance.now() - startTimestamp);
}

// Update the digital timer and progress ring
function renderTimer() {
  const elapsed = getElapsedTime();

  const totalCentiseconds = Math.floor(elapsed / 10);
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor(
    (totalCentiseconds % 6000) / 100
  );
  const centiseconds = totalCentiseconds % 100;

  minutesEl.textContent = pad(minutes);
  secondsEl.textContent = pad(seconds);
  centisecondsEl.textContent = pad(centiseconds);

  // One complete ring revolution per minute
  const minuteProgress = (elapsed % 60000) / 60000;

  ringProgress.style.strokeDasharray = CIRCUMFERENCE;
  ringProgress.style.strokeDashoffset =
    CIRCUMFERENCE * (1 - minuteProgress);

  if (running) {
    animationFrame = requestAnimationFrame(renderTimer);
  }
}

// Update the interface according to stopwatch state
function updateControls() {
  document.body.classList.toggle("running", running);

  startText.textContent = running
    ? "Pause timer"
    : accumulatedTime > 0
      ? "Resume timer"
      : "Start timer";

  startIcon.textContent = running ? "Ⅱ" : "▶";

  statusText.textContent = running
    ? "TIME IS RUNNING"
    : accumulatedTime > 0
      ? "SESSION PAUSED"
      : "READY TO BEGIN";

  timerCaption.textContent = running
    ? "TIME ELAPSED"
    : accumulatedTime > 0
      ? "PAUSED AT"
      : "YOUR TIME";

  elapsedLabel.textContent = running
    ? "Keep going. You're doing great."
    : accumulatedTime > 0
      ? "Take a breath. Resume when ready."
      : "Ready when you are";

  lapBtn.disabled = !running;
  resetBtn.disabled = running || accumulatedTime === 0;
}

// Start or resume the stopwatch
function startStopwatch() {
  if (running) {
    pauseStopwatch();
    return;
  }

  running = true;
  startTimestamp = performance.now();

  updateControls();

  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
  }

  animationFrame = requestAnimationFrame(renderTimer);
}

// Pause without losing elapsed time
function pauseStopwatch() {
  if (!running) return;

  accumulatedTime = getElapsedTime();
  running = false;

  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  renderTimer();
  updateControls();
}

// Record a lap with split and cumulative time
function recordLap() {
  if (!running) return;

  const totalTime = getElapsedTime();
  const splitTime = totalTime - previousLapTime;

  laps.unshift({
    number: laps.length + 1,
    split: splitTime,
    total: totalTime
  });

  previousLapTime = totalTime;

  renderLaps();
  updateStats();
}

// Render the lap history
function renderLaps() {
  lapsList.replaceChildren();

  if (laps.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const icon = document.createElement("div");
    icon.className = "empty-icon";
    icon.textContent = "◷";

    const message = document.createElement("p");
    message.textContent = "No laps recorded yet";

    const hint = document.createElement("span");
    hint.textContent = "Your journey starts with the first lap.";

    empty.append(icon, message, hint);
    lapsList.appendChild(empty);
  } else {
    const splits = laps.map((lap) => lap.split);
    const bestSplit = Math.min(...splits);
    const slowestSplit = Math.max(...splits);

    laps.forEach((lap) => {
      const row = document.createElement("div");
      row.className = "lap-row";

      if (lap.split === bestSplit) {
        row.classList.add("fastest");
      } else if (lap.split === slowestSplit) {
        row.classList.add("slowest");
      }

      const number = document.createElement("span");
      number.className = "lap-number";

      const rank = document.createElement("span");
      rank.className = "lap-rank";
      rank.textContent = `#${pad(lap.number)}`;

      number.appendChild(rank);

      if (lap.split === bestSplit) {
        const badge = document.createElement("span");
        badge.className = "lap-badge";
        badge.textContent = "BEST";
        number.appendChild(badge);
      }

      const split = document.createElement("span");
      split.className = "lap-split";
      split.textContent = formatTime(lap.split);

      const total = document.createElement("span");
      total.className = "lap-total";
      total.textContent = formatTime(lap.total);

      row.append(number, split, total);
      lapsList.appendChild(row);
    });
  }

  totalLapsEl.textContent = pad(laps.length);
  lapCountBadge.textContent = laps.length;

  clearLapsBtn.disabled = laps.length === 0;
}

// Calculate fastest and average lap
function updateStats() {
  if (laps.length === 0) {
    bestLapEl.textContent = "--:--.--";
    averageLapEl.textContent = "--:--.--";
    return;
  }

  const splitTimes = laps.map((lap) => lap.split);

  const best = Math.min(...splitTimes);
  const average =
    splitTimes.reduce((sum, time) => sum + time, 0) /
    splitTimes.length;

  bestLapEl.textContent = formatTime(best);
  averageLapEl.textContent = formatTime(average);
}

// Reset timer and lap history
function resetStopwatch() {
  if (running) return;

  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  accumulatedTime = 0;
  startTimestamp = 0;
  previousLapTime = 0;
  laps = [];

  minutesEl.textContent = "00";
  secondsEl.textContent = "00";
  centisecondsEl.textContent = "00";

  ringProgress.style.strokeDashoffset = CIRCUMFERENCE;

  renderLaps();
  updateStats();
  updateControls();
}

// Clear lap history while retaining stopwatch time
function clearLaps() {
  laps = [];
  previousLapTime = getElapsedTime();

  renderLaps();
  updateStats();
}

// Button listeners
startBtn.addEventListener("click", startStopwatch);
resetBtn.addEventListener("click", resetStopwatch);
lapBtn.addEventListener("click", recordLap);
clearLapsBtn.addEventListener("click", clearLaps);

// Keyboard shortcuts
document.addEventListener("keydown", (event) => {
  // Do not hijack keyboard input while typing in controls
  const target = event.target;
  const isTyping =
    target instanceof HTMLElement &&
    (
      target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
    );

  if (isTyping || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    startStopwatch();
  } else if (event.key.toLowerCase() === "l") {
    recordLap();
  } else if (event.key.toLowerCase() === "r") {
    resetStopwatch();
  }
});

// Initialize the interface
ringProgress.style.strokeDasharray = CIRCUMFERENCE;
ringProgress.style.strokeDashoffset = CIRCUMFERENCE;

renderLaps();
updateStats();
updateControls();