// Caddie IQ core logic
// - Profile + avatar
// - Course + hole notes
// - Shot advice (rule-based for now)
// - Simple stats tracking
// - PWA service worker registration

// ---- Data ----

const sampleCourses = [
  {
    id: "salt-creek-retreat-in",
    name: "Salt Creek Golf Retreat",
    city: "Nashville",
    state: "IN",
    par: 71,
    holes: [
      { number: 1, par: 4, yardage: 380 },
      { number: 2, par: 4, yardage: 355 },
      { number: 3, par: 3, yardage: 165 },
      { number: 4, par: 5, yardage: 520 },
      { number: 5, par: 4, yardage: 410 },
      { number: 6, par: 4, yardage: 360 },
      { number: 7, par: 3, yardage: 175 },
      { number: 8, par: 5, yardage: 535 },
      { number: 9, par: 4, yardage: 395 },
      { number: 10, par: 4, yardage: 370 },
      { number: 11, par: 4, yardage: 400 },
      { number: 12, par: 3, yardage: 185 },
      { number: 13, par: 5, yardage: 540 },
      { number: 14, par: 4, yardage: 365 },
      { number: 15, par: 4, yardage: 390 },
      { number: 16, par: 3, yardage: 170 },
      { number: 17, par: 4, yardage: 405 },
      { number: 18, par: 5, yardage: 530 }
    ]
  },
  {
    id: "home-course-generic",
    name: "My Home Course (Custom)",
    city: "Local",
    state: "USA",
    par: 72,
    holes: Array.from({ length: 18 }).map((_, i) => ({
      number: i + 1,
      par: 4,
      yardage: 380
    }))
  },
  {
    id: "brickyard-crossing-in",
    name: "Brickyard Crossing",
    city: "Indianapolis",
    state: "IN",
    par: 72,
    holes: Array.from({ length: 18 }).map((_, i) => ({
      number: i + 1,
      par: i === 4 || i === 13 ? 5 : i === 6 || i === 11 || i === 16 ? 3 : 4,
      yardage: 360 + (i % 6) * 20
    }))
  }
];

const STORAGE_PROFILE = "caddieIQ_profile_v1";
const STORAGE_NOTES = "caddieIQ_notes_v1";
const STORAGE_STATS = "caddieIQ_stats_v1";

// ---- Helpers ----

function $(id) {
  return document.getElementById(id);
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn("Error parsing storage for", key, e);
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Error saving storage for", key, e);
  }
}

// ---- Profile + avatar ----

function updateAvatarFromProfile() {
  const avatar = $("avatarCircle");
  const profile = loadJSON(STORAGE_PROFILE, {});
  const color = profile.avatarColor || "#22c55e";
  const initials = (profile.name || "You")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  avatar.style.background = color;
  avatar.textContent = initials || "Y";
}

function saveProfile() {
    const profile = {
    name: $("playerName").value.trim(),
    handicap: $("playerHandicap").value,
    shape: $("playerShape").value,
    avatarColor: $("avatarColor").value,
    avatarTone: $("avatarTone").value,
    avatarHat: $("avatarHat").value
  };

  };
  saveJSON(STORAGE_PROFILE, profile);
  updateAvatarFromProfile();

  const btn = $("saveProfileBtn");
  const original = btn.textContent;
  btn.textContent = "Saved";
  setTimeout(() => (btn.textContent = original), 900);
}

function loadProfileIntoUI() {
  const p = loadJSON(STORAGE_PROFILE, {});
  if (p.name) $("playerName").value = p.name;
  if (p.handicap) $("playerHandicap").value = p.handicap;
  if (p.shape) $("playerShape").value = p.shape;
  if (p.avatarColor) $("avatarColor").value = p.avatarColor;
  updateAvatarFromProfile();
}

// ---- Courses + hole notes ----

function populateCourseSelect() {
  const select = $("courseSelect");
  select.innerHTML = "";
  sampleCourses.forEach((course) => {
    const opt = document.createElement("option");
    opt.value = course.id;
    opt.textContent = course.name;
    select.appendChild(opt);
  });
}

function populateHoleSelect() {
  const select = $("holeSelect");
  select.innerHTML = "";
  for (let i = 1; i <= 18; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `Hole ${i}`;
    select.appendChild(opt);
  }
}

function getCurrentCourse() {
  const id = $("courseSelect").value;
  return sampleCourses.find((c) => c.id === id);
}

function getCurrentHoleNumber() {
  return parseInt($("holeSelect").value || "1", 10);
}

function updateCourseAndHoleMeta() {
  const course = getCurrentCourse();
  const courseMeta = $("courseMeta");
  const holeMeta = $("holeMeta");
  if (!course) {
    courseMeta.textContent = "";
    holeMeta.textContent = "";
    return;
  }
  courseMeta.textContent = `${course.city}, ${course.state} · Par ${course.par} · 18 holes`;

  const holeNum = getCurrentHoleNumber();
  const holeData = course.holes.find((h) => h.number === holeNum);
  if (holeData) {
    holeMeta.textContent = `Hole ${holeNum} · Par ${holeData.par} · ~${holeData.yardage} yds`;
  } else {
    holeMeta.textContent = `Hole ${holeNum}`;
  }
}

function loadNotesForCurrentHole() {
  const notes = loadJSON(STORAGE_NOTES, {});
  const course = getCurrentCourse();
  if (!course) return;
  const hole = getCurrentHoleNumber();

  const courseNotes = notes[course.id] || {};
  const holeNotes = courseNotes[hole] || {};

  $("preferredClub").value = holeNotes.preferredClub || "";
  $("usualMiss").value = holeNotes.usualMiss || "";
  $("safeTarget").value = holeNotes.safeTarget || "";
  $("dangerNote").value = holeNotes.dangerNote || "";
  $("mentalCue").value = holeNotes.mentalCue || "";
}

function saveNotesForCurrentHole() {
  const notes = loadJSON(STORAGE_NOTES, {});
  const course = getCurrentCourse();
  if (!course) return;
  const hole = getCurrentHoleNumber();

  if (!notes[course.id]) notes[course.id] = {};
  notes[course.id][hole] = {
    preferredClub: $("preferredClub").value.trim(),
    usualMiss: $("usualMiss").value.trim(),
    safeTarget: $("safeTarget").value.trim(),
    dangerNote: $("dangerNote").value.trim(),
    mentalCue: $("mentalCue").value.trim()
  };

  saveJSON(STORAGE_NOTES, notes);

  const btn = $("saveNotesBtn");
  const original = btn.textContent;
  btn.textContent = "Notes saved";
  setTimeout(() => (btn.textContent = original), 900);
}

// ---- Advice engine ----

function suggestClub(distance) {
  const d = distance;
  if (d > 230) return "Driver or strong 3 wood";
  if (d > 210) return "3 wood or hybrid";
  if (d > 195) return "5 wood / hybrid";
  if (d > 180) return "4 or 5 iron";
  if (d > 165) return "6 iron";
  if (d > 155) return "7 iron";
  if (d > 145) return "8 iron";
  if (d > 135) return "9 iron";
  if (d > 120) return "Pitching wedge";
  if (d > 105) return "Gap wedge";
  if (d > 90) return "Sand wedge";
  return "Lob wedge or bump-and-run";
}

function applyWindAdjustment(distance, strength, direction) {
  let adjusted = distance;
  let comment = "";

  if (strength === "none" || direction === "none") {
    return { distance: adjusted, comment };
  }

  if (strength === "light") {
    if (direction === "into") {
      adjusted *= 1.05;
      comment = "Light headwind: consider half a club more.";
    } else if (direction === "with") {
      adjusted *= 0.95;
      comment = "Light downwind: a touch less club.";
    }
  } else if (strength === "medium") {
    if (direction === "into") {
      adjusted *= 1.1;
      comment = "Medium headwind: roughly one extra club.";
    } else if (direction === "with") {
      adjusted *= 0.9;
      comment = "Medium downwind: roughly one less club.";
    }
  } else if (strength === "strong") {
    if (direction === "into") {
      adjusted *= 1.18;
      comment = "Strong headwind: 1–2 extra clubs and a solid, controlled swing.";
    } else if (direction === "with") {
      adjusted *= 0.85;
      comment = "Strong downwind: club down and flight it a bit lower.";
    }
  }

  if (direction === "cross-left" || direction === "cross-right") {
    const base = "Crosswind: favor the upwind side and commit to your start line.";
    comment = comment ? `${comment} ${base}` : base;
  }

  return { distance: adjusted, comment };
}

function buildAdvice() {
  const distRaw = parseFloat($("distanceInput").value || "0");
  const par = $("parSelect").value;
  const lie = $("lieSelect").value;
  const windStrength = $("windStrength").value;
  const windDirection = $("windDirection").value;

  const hazLeft = $("hazLeft").checked;
  const hazRight = $("hazRight").checked;
  const hazShort = $("hazShort").checked;
  const hazLong = $("hazLong").checked;

  const adviceEl = $("adviceContent");
  adviceEl.innerHTML = "";

  if (!distRaw || distRaw <= 0) {
    adviceEl.innerHTML =
      '<p class="muted">Give me at least a distance and I\'ll suggest a club and target.</p>';
    return;
  }

  const notes = loadJSON(STORAGE_NOTES, {});
  const course = getCurrentCourse();
  const hole = getCurrentHoleNumber();
  const courseNotes = course ? notes[course.id] || {} : {};
  const holeNotes = courseNotes[hole] || {};

  const { distance: adjDistance, comment: windComment } = applyWindAdjustment(
    distRaw,
    windStrength,
    windDirection
  );
  const club = suggestClub(adjDistance);

  const profile = loadJSON(STORAGE_PROFILE, {});

  // Club section
  const preferred = holeNotes.preferredClub
    ? ` (you like ${holeNotes.preferredClub} here)`
    : "";
  const shape = profile.shape
    ? ` You tend to play a ${profile.shape}, so picture that shape into this target.`
    : "";

  const clubHTML = `
    <div>
      <div class="advice-section-title">Club selection</div>
      <p><strong>Suggested club:</strong> ${club}${preferred} for about ${Math.round(
    adjDistance
  )} yards.${shape}</p>
    </div>
  `;

  // Strategy section
  let strat = "";

  if (hazLeft && !hazRight) {
    strat += "Favor the right half of your target and keep it away from the left trouble. ";
  } else if (hazRight && !hazLeft) {
    strat += "Favor the left half of your target and keep it away from the right trouble. ";
  } else if (hazLeft && hazRight) {
    strat +=
      "Both sides have trouble, so pick a small central target and focus on a solid, centered start line. ";
  }

  if (hazShort && !hazLong) {
    strat += "Anything just past the front edge is perfect; avoid coming up short. ";
  } else if (!hazShort && hazLong) {
    strat += "Short or pin-high is ideal; favor a yardage that cannot fly long of the green. ";
  }

  if (!strat) {
    strat =
      "Choose the safest part of the green or fairway as your target, not the pin, and commit fully to that picture.";
  }

  const safeTarget = holeNotes.safeTarget
    ? `<p class="advice-note"><strong>Your saved safe target:</strong> ${holeNotes.safeTarget}</p>`
    : "";
  const dangerNote = holeNotes.dangerNote
    ? `<p class="advice-note"><strong>Your danger reminder:</strong> ${holeNotes.dangerNote}</p>`
    : "";

  const stratHTML = `
    <div>
      <div class="advice-section-title">Strategy</div>
      <p>${strat}</p>
      ${safeTarget}
      ${dangerNote}
    </div>
  `;

  // Conditions section
  const lieNote =
    lie === "rough"
      ? "From the rough, expect less spin and possible flyers. Favor the fat side of the target."
      : lie === "sand"
      ? "From sand, prioritize solid contact and a stable base. Distance control is secondary."
      : lie === "other"
      ? "With a non-standard lie, simplify your thought: one smooth swing, solid contact."
      : "Standard lie: trust your normal yardages.";

  const windHTML = `
    <div>
      <div class="advice-section-title">Conditions</div>
      <p>${windComment || "Wind isn't a huge factor on this swing."}</p>
      <p class="advice-note">${lieNote}</p>
    </div>
  `;

  // Mental cue section
  const cue =
    holeNotes.mentalCue ||
    "Deep breath, soft grip, pick one small target, and make a smooth, committed swing.";
  const mentalHTML = `
    <div>
      <div class="advice-section-title">Mental cue</div>
      <p>${cue}</p>
    </div>
  `;

  adviceEl.innerHTML = clubHTML + stratHTML + windHTML + mentalHTML;
}

// ---- Stats tracking ----

function saveOutcome() {
  const stats = loadJSON(STORAGE_STATS, {});
  const course = getCurrentCourse();
  if (!course) return;
  const courseId = course.id;

  if (!stats[courseId]) {
    stats[courseId] = {
      shots: 0,
      fairways: 0,
      gir: 0,
      putts: 0
    };
  }

  const s = stats[courseId];

  const tee = $("outcomeTee").value;
  const gir = $("outcomeGir").value;
  const puttsVal = parseInt($("outcomePutts").value || "0", 10);

  if (!tee && !gir && !puttsVal) {
    return;
  }

  s.shots += 1;
  if (tee === "fairway") s.fairways += 1;
  if (gir === "yes") s.gir += 1;
  if (puttsVal > 0) s.putts += puttsVal;

  saveJSON(STORAGE_STATS, stats);
  updateStatsSummary();
}

function updateStatsSummary() {
  const course = getCurrentCourse();
  const el = $("statsSummary");
  if (!course) {
    el.textContent = "No stats saved yet for this course today.";
    return;
  }
  const stats = loadJSON(STORAGE_STATS, {});
  const s = stats[course.id];
  if (!s || !s.shots) {
    el.textContent = "No stats saved yet for this course today.";
    return;
  }

  const fairwayPct = s.fairways ? Math.round((s.fairways / s.shots) * 100) : 0;
  const girPct = s.gir ? Math.round((s.gir / s.shots) * 100) : 0;
  const avgPutts = s.putts ? (s.putts / s.shots).toFixed(1) : "0.0";

  el.innerHTML = `
    Shots tracked today: <strong>${s.shots}</strong><br />
    Fairways hit: <strong>${fairwayPct}%</strong> · GIR: <strong>${girPct}%</strong><br />
    Avg putts on recorded holes: <strong>${avgPutts}</strong>
  `;
}

// ---- Shot clear ----

function clearShotInputs() {
  $("parSelect").value = "4";
  $("distanceInput").value = "";
  $("lieSelect").value = "fairway";
  $("windStrength").value = "none";
  $("windDirection").value = "none";
  $("hazLeft").checked = false;
  $("hazRight").checked = false;
  $("hazShort").checked = false;
  $("hazLong").checked = false;

  $("adviceContent").innerHTML =
    '<p class="muted">Enter your distance and context, then tap <strong>Get caddie advice</strong>.</p>';
}

// ---- PWA: service worker ----

function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  }
}

// ---- Install prompt (for some browsers) ----

let deferredPrompt;

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = $("installBtn");
    btn.hidden = false;
    btn.addEventListener("click", async () => {
      btn.hidden = true;
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt = null;
    });
  });
}

// ---- Init ----

function init() {
  populateCourseSelect();
  populateHoleSelect();
  loadProfileIntoUI();
  updateCourseAndHoleMeta();
  loadNotesForCurrentHole();
  updateStatsSummary();
  registerSW();
  setupInstallPrompt();
  // Theme toggle
  const themeBtn = $("themeToggleBtn");
  const THEME_KEY = "caddieIQ_theme";
  const savedTheme = localStorage.getItem(THEME_KEY) || "auto";

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    if (theme === "light") themeBtn.textContent = "Theme: Light";
    else if (theme === "dark") themeBtn.textContent = "Theme: Dark";
    else themeBtn.textContent = "Theme: Auto";
  }

  applyTheme(savedTheme);

  themeBtn.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || "auto";
    const next = current === "auto" ? "light" : current === "light" ? "dark" : "auto";
    applyTheme(next);
  });

  $("saveProfileBtn").addEventListener("click", saveProfile);
  $("avatarColor").addEventListener("change", saveProfile);

  $("courseSelect").addEventListener("change", () => {
    updateCourseAndHoleMeta();
    loadNotesForCurrentHole();
    updateStatsSummary();
  });
  $("holeSelect").addEventListener("change", () => {
    updateCourseAndHoleMeta();
    loadNotesForCurrentHole();
  });

  $("saveNotesBtn").addEventListener("click", saveNotesForCurrentHole);
  $("getAdviceBtn").addEventListener("click", buildAdvice);
  $("clearShotBtn").addEventListener("click", clearShotInputs);
  $("saveOutcomeBtn").addEventListener("click", saveOutcome);
}

document.addEventListener("DOMContentLoaded", init);
