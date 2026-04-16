const TIMER_PRESETS = Object.freeze({
  keycard: 15,
  comboard: 30,
  redKeycard: 30,
});

const timerSections = [
  {
    id: "checkmate",
    title: "Checkmate Self Timers",
    description: "Monitor every keycard and compboard reset on Checkmate.",
    groups: [
      {
        title: "Blue Keycards",
        preset: "keycard",
        timers: [
          { id: "checkmate-terminal-1", label: "Terminal 1" },
          { id: "checkmate-terminal-2", label: "Terminal 2" },
          { id: "checkmate-terminal-3", label: "Terminal 3" },
        ],
      },
      {
        title: "Comboards",
        preset: "comboard",
        timers: [
          { id: "checkmate-tablet-1", label: "Tablet 1" },
          { id: "checkmate-tablet-2", label: "Tablet 2" },
          { id: "checkmate-tablet-3", label: "Tablet 3" },
        ],
      },
    ],
  },
  {
    id: "orbituary",
    title: "Orbituary Self Timers",
    description: "Keep blue keycards and compboards in sync on Orbituary.",
    groups: [
      {
        title: "Blue Keycards",
        preset: "keycard",
        timers: [
          { id: "orbituary-terminal-1", label: "Terminal 1" },
          { id: "orbituary-terminal-2", label: "Terminal 2" },
        ],
      },
      {
        title: "Comboards",
        preset: "comboard",
        timers: [
          { id: "orbituary-tablet-4", label: "Tablet 4" },
          { id: "orbituary-tablet-7", label: "Tablet 7" },
        ],
      },
    ],
  },
  {
    id: "ruin",
    title: "Ruin Station Self Timers",
    description: "Track all Ruin Station self-serve keycards and tablets.",
    groups: [
      {
        title: "Keycards",
        preset: "keycard",
        timers: [
          { id: "ruin-crypt", label: "The Crypt" },
          { id: "ruin-last-resort", label: "The Last Resort" },
          { id: "ruin-wasteland", label: "The Wasteland" },
        ],
      },
      {
        title: "Comboards",
        preset: "comboard",
        timers: [
          { id: "ruin-tablet-5", label: "Tablet 5" },
          { id: "ruin-tablet-6", label: "Tablet 6" },
        ],
      },
    ],
  },
  {
    id: "pyam-supervisor",
    title: "PYAM-SUPVISR",
    description: "Red keycard reset guide for the supervisor wing.",
    groups: [
      {
        title: "Red Keycards",
        preset: "redKeycard",
        timers: [
          { id: "pyam-34", label: "3-4" },
          { id: "pyam-35", label: "3-5" },
        ],
      },
    ],
  },
].map((section) => ({
  ...section,
  groups: section.groups.map((group) => {
    const presetMinutes = TIMER_PRESETS[group.preset] ?? TIMER_PRESETS.keycard;
    return {
      title: group.title,
      timers: group.timers.map((timer) => ({
        ...timer,
        minutes: timer.minutes ?? presetMinutes,
      })),
    };
  }),
}));

let audioCtx;
let notificationPermissionRequested = false;

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

class SelfTimer {
  constructor(card, config) {
    this.card = card;
    this.config = config;
    this.defaultMs = config.minutes * 60 * 1000;
    this.remainingMs = this.defaultMs;
    this.isRunning = false;
    this.targetTimestamp = 0;
    this.intervalId = null;
    this.hasAnnounced = false;

    this.timeEl = card.querySelector("[data-role='time']");
    this.toggleBtn = card.querySelector("[data-action='toggle']");
    this.minusBtn = card.querySelector("[data-action='minus']");
    this.plusBtn = card.querySelector("[data-action='plus']");
    this.resetBtn = card.querySelector("[data-action='reset']");

    this.attachHandlers();
    this.updateDisplay();
  }

  attachHandlers() {
    this.toggleBtn.addEventListener("click", () => {
      if (this.isRunning) {
        this.pause();
      } else {
        this.start();
      }
    });

    this.resetBtn.addEventListener("click", () => this.reset());
    this.minusBtn.addEventListener("click", () => this.adjust(-60 * 1000));
    this.plusBtn.addEventListener("click", () => this.adjust(60 * 1000));
  }

  start() {
    if (this.isRunning) return;
    if (this.remainingMs <= 0) {
      this.remainingMs = this.defaultMs;
    }
    this.hasAnnounced = false;
    this.card.classList.remove("timer-card--complete", "timer-card--warning");
    this.isRunning = true;
    this.targetTimestamp = Date.now() + this.remainingMs;
    this.toggleBtn.textContent = "Pause";
    this.card.classList.add("timer-card--running");
    this.intervalId = setInterval(() => this.tick(), 200);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.toggleBtn.textContent = "Start";
    this.card.classList.remove("timer-card--running");
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.remainingMs = Math.max(0, this.targetTimestamp - Date.now());
    this.updateDisplay();
  }

  reset() {
    this.remainingMs = this.defaultMs;
    this.card.classList.remove("timer-card--complete", "timer-card--warning");
    this.hasAnnounced = false;
    if (this.isRunning) {
      this.targetTimestamp = Date.now() + this.remainingMs;
    }
    this.updateDisplay();
  }

  adjust(deltaMs) {
    const nextValue = Math.max(0, this.remainingMs + deltaMs);
    this.remainingMs = nextValue;
    if (this.remainingMs > 0) {
      this.card.classList.remove("timer-card--complete");
      this.hasAnnounced = false;
    }
    if (this.isRunning) {
      this.targetTimestamp = Date.now() + this.remainingMs;
    }
    this.updateDisplay();
  }

  tick() {
    this.remainingMs = Math.max(0, this.targetTimestamp - Date.now());
    this.updateDisplay();
    if (this.remainingMs <= 0) {
      if (!this.hasAnnounced) {
        this.hasAnnounced = true;
        announceTimerCompletion(this.config);
      }
      this.pause();
    }
  }

  updateDisplay() {
    if (this.timeEl) {
      this.timeEl.textContent = formatDuration(this.remainingMs);
    }
    this.updateVisualState();
  }

  updateVisualState() {
    const shouldWarn = this.remainingMs > 0 && this.remainingMs <= 60 * 1000;
    this.card.classList.toggle("timer-card--warning", shouldWarn);
    if (this.remainingMs <= 0) {
      this.card.classList.add("timer-card--complete");
    } else {
      this.card.classList.remove("timer-card--complete");
    }
  }
}

function renderTimerCard(timer, sectionTitle, groupTitle) {
  return `
    <div class="timer-card" data-timer-id="${timer.id}" data-default-minutes="${timer.minutes}" data-section="${sectionTitle}" data-group="${groupTitle}">
      <div class="timer-card__meta">
        <span class="timer-card__label">${timer.label}</span>
        <span class="timer-card__preset">${timer.minutes}:00 preset</span>
      </div>
      <div class="timer-card__display" data-role="time">--:--</div>
      <div class="timer-card__controls">
        <button type="button" class="timer-btn" data-action="minus">-1m</button>
        <button type="button" class="timer-btn" data-action="plus">+1m</button>
        <button type="button" class="timer-btn timer-btn--ghost" data-action="reset">Reset</button>
      </div>
      <button type="button" class="timer-btn timer-btn--primary" data-action="toggle">Start</button>
    </div>
  `;
}

function renderTimerGroup(section, group) {
  return `
    <article class="timer-group">
      <div class="timer-group__title">${group.title}</div>
      <div class="timer-grid">
        ${group.timers
          .map((timer) => renderTimerCard(timer, section.title, group.title))
          .join("")}
      </div>
    </article>
  `;
}

function renderTimerSections() {
  const mount = document.getElementById("timer-sections");
  if (!mount) return;
  mount.innerHTML = timerSections
    .map((section) => {
      const groupsMarkup = section.groups
        .map((group) => renderTimerGroup(section, group))
        .join("");
      return `
        <section class="timer-section" id="${section.id}">
          <header class="timer-section__header">
            <div>
              <h2>${section.title}</h2>
              <p>${section.description}</p>
            </div>
          </header>
          <div class="timer-section__groups">
            ${groupsMarkup}
          </div>
        </section>
      `;
    })
    .join("");
}

function hydrateTimers() {
  document.querySelectorAll(".timer-card").forEach((card) => {
    const id = card.dataset.timerId;
    const minutes = Number(card.dataset.defaultMinutes);
    const config = {
      id,
      minutes,
      label: card.querySelector(".timer-card__label").textContent,
      section: card.dataset.section,
      group: card.dataset.group,
    };
    new SelfTimer(card, config);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderTimerSections();
  hydrateTimers();
});

document.addEventListener(
  "pointerdown",
  () => {
    primeAudioContext();
    requestNotificationPermission();
  },
  { once: true, passive: true }
);

function announceTimerCompletion(details) {
  playTimerChime();
  showDesktopNotification(details);
}

function primeAudioContext() {
  if (audioCtx || !(window.AudioContext || window.webkitAudioContext)) {
    return;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  audioCtx = new Ctx();
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

function playTimerChime() {
  if (!(window.AudioContext || window.webkitAudioContext)) return;
  if (!audioCtx) {
    primeAudioContext();
  }
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.55);
}

function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  if (notificationPermissionRequested) return;
  notificationPermissionRequested = true;
  Notification.requestPermission().finally(() => {
    // no-op; future requests unnecessary
  });
}

function showDesktopNotification(details) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const title = details.section
    ? `${details.section} timer ready`
    : "Self timer complete";
  const contextBits = [];
  if (details.group) contextBits.push(details.group);
  contextBits.push(`${details.label} finished`);
  new Notification(title, {
    body: contextBits.join(" • "),
    renotify: false,
    tag: details.id,
  });
}
