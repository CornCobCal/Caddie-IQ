// Caddie IQ core logic
// - Profile + detailed avatar customization
// - What's in my bag (club yardages)
// - Course + hole notes
// - Shot advice (rule-based for now)
// - Simple stats tracking
// - Round summary + history
// - Mental coach
// - Theme toggle
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
const STORAGE_ROUNDS = "caddieIQ_rounds_v1";
const STORAGE_ACTIVE_ROUND = "caddieIQ_activeRound_v1";
const STORAGE_BAG = "caddieIQ_bag_v1";

// human-readable names for bag clubs
const CLUB_LABELS = {
  driver: "Driver",
  "3w": "3 wood",
  "5w": "5 wood",
  "2h": "2 hybrid",
  "3h": "3 hybrid",
  "4h": "4 hybrid",
  "4i": "4 iron",
  "5i": "5 iron",
  "6i": "6 iron",
  "7i": "7 iron",
  "8i": "8 iron",
  "9i": "9 iron",
  pw: "Pitching wedge",
  gw: "Gap wedge",
  sw: "Sand wedge",
  lw: "Lob wedge",
  putter: "Putter"
};

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
  const initialsEl = $("avatarInitials");
  const profile = loadJSON(STORAGE_PROFILE, {});

  const initials = (profile.name || "You")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  if (initialsEl) {
    initialsEl.textContent = initials || "Y";
  }

  // shirt
  const shirt = profile.avatarColor || "#22c55e";
  avatar.style.setProperty("--avatar-shirt", shirt);

  // skin
  const tone = profile.avatarTone || "medium";
  let skin = "#faccb0";
  if (tone === "light") skin = "#fde6c8";
  if (tone === "dark") skin = "#b8693d";
  avatar.style.setProperty("--avatar-skin", skin);

  // hair color
  avatar.style.setProperty("--avatar-hair", "#111827");

  // hair style & hat
  const hair = profile.avatarHair || "short";
  const hat = profile.avatarHat || "cap";
  avatar.dataset.hair = hair;
  avatar.dataset.hat = hat;

  // scene/background
  const bg = profile.avatarBg || "classic";
  avatar.dataset.bg = bg;
}

function saveProfile() {
  const profile = {
    name: $("playerName").value.trim(),
    handicap: $("playerHandicap").value,
    shape: $("playerShape").value,
    avatarColor: $("avatarColor").value,
    avatarTone: $("avatarTone").value,
    avatarHat: $("avatarHat").value,
    avatarHair: $("avatarHair").value,
    avatarBg: $("avatarBg").value
  };
  saveJSON(STORAGE_PROFILE, profile);
  updateAvatarFromProfile();

  const btn = $("saveProfileBtn");
  const original = btn.textContent;
  btn.textContent = "Profile saved";
  setTimeout(() => (btn.textContent = original), 900);
}

function loadProfileIntoUI() {
  const p = loadJSON(STORAGE_PROFILE, {});
  if (p.name) $("playerName").value = p.name;
  if (p.handicap) $("playerHandicap").value = p.handicap;
  if (p.shape) $("playerShape").value = p.shape;
  if (p.avatarColor) $("avatarColor").value = p.avatarColor;
  if (p.avatarTone) $("avatarTone").value = p.avatarTone;
  if (p.avatarHat) $("avatarHat").value = p.avatarHat;
  if (p.avatarHair) $("avatarHair").value = p.avatarHair;
  if (p.avatarBg) $("avatarBg").value = p.avatarBg;
  updateAvatarFromProfile();
}

// ---- What's in my bag ----

function getBag() {
  return loadJSON(STORAGE_BAG, {}); // object keyed by club id
}

function saveBag(bag) {
  saveJSON(STORAGE_BAG, bag);
}

function clearBagFields() {
  $("bagClub").value = "";
  $("bagCarry").value = "";
  $("bagNote").value = "";
}

function saveBagClub() {
  const clubKey = $("bagClub").value;
  const carryRaw = $("bagCarry").value;
  const note = $("bagNote").value.trim();

  if (!clubKey || !carryRaw) {
    return;
  }

  const carry = parseInt(carryRaw, 10);
  if (Number.isNaN(carry) || carry <= 0) {
    return;
  }

  const label = CLUB_LABELS[clubKey] || clubKey;
  const bag = getBag();
  bag[clubKey] = { key: clubKey, label, carry, note };

  saveBag(bag);
  renderBagList();
}

function deleteBagClub(key) {
  const bag = getBag();
  if (bag[key]) {
    delete bag[key];
    saveBag(bag);
    renderBagList();
  }
}

function renderBagList() {
  const container = $("bagList");
  const bag = getBag();
  const keys = Object.keys(bag);

  if (!keys.length) {
    container.textContent = "No clubs saved yet. Add your first club above.";
    return;
  }

  const sorted = keys
    .map((k) => bag[k])
    .sort((a, b) => {
      // rough order: driver -> woods -> hybrids -> irons -> wedges -> putter
      const order = [
        "driver",
        "3w",
        "5w",
        "2h",
        "3h",
        "4h",
        "4i",
        "5i",
        "6i",
        "7i",
        "8i",
        "9i",
        "pw",
        "gw",
        "sw",
        "lw",
        "putter"
      ];
      return order.indexOf(a.key) - order.indexOf(b.key);
    });

  container.innerHTML = sorted
    .map((club) => {
      const noteText = club.note ? ` · ${club.note}` : "";
      return `
        <div class="bag-item">
          <div class="bag-main">
            <span class="bag-title">${club.label}</span>
            <span class="bag-meta">${club.carry} yds carry${noteText}</span>
          </div>
          <button
            class="btn ghost small"
            type="button"
            data-bag-delete="${club.key}"
          >
            Remove
          </button>
        </div>
      `;
    })
    .join("");
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
  btn.textContent = "Hole plan saved";
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
      comment = "Steady headwind: roughly one extra club.";
    } else if (direction === "with") {
      adjusted *= 0.9;
      comment = "Steady downwind: roughly one less club.";
    }
  } else if (strength === "strong") {
    if (direction === "into") {
      adjusted *= 1.18;
      comment = "Heavy headwind: 1–2 extra clubs and a smooth, controlled swing.";
    } else if (direction === "with") {
      adjusted *= 0.85;
      comment = "Heavy downwind: club down and flight it a bit lower.";
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
      '<p class="muted">Give me at least a distance and a rough idea of the lie, and I\'ll turn it into a simple plan.</p>';
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
  const bag = getBag();

  // if bag has a near club, mention it
  const bagClubs = Object.values(bag);
  let bagSuggestion = "";
  if (bagClubs.length) {
    let best = null;
    let bestDiff = Infinity;
    bagClubs.forEach((c) => {
      const diff = Math.abs(c.carry - adjDistance);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = c;
      }
    });
    if (best) {
      bagSuggestion = ` Based on your bag, <strong>${best.label}</strong> (about ${best.carry} yds) is very close to this number.`;
    }
  }

  // Club section
  const preferred = holeNotes.preferredClub
    ? ` (you like ${holeNotes.preferredClub} here)`
    : "";
  const shape = profile.shape
    ? ` You tend to play a ${profile.shape}. Picture that shape tracing into your target.`
    : "";

  const clubHTML = `
    <div>
      <div class="advice-section-title">Club choice</div>
      <p><strong>Suggested club:</strong> ${club}${preferred} for about ${Math.round(
        adjDistance
      )} yards.${shape}${bagSuggestion}</p>
    </div>
  `;

  // Strategy section
  let strat = "";

  if (hazLeft && !hazRight) {
    strat += "See a shot that finishes safely on the right half of your target, away from the left trouble. ";
  } else if (hazRight && !hazLeft) {
    strat += "See your ball riding the left half of the fairway or green, never flirting with the right side. ";
  } else if (hazLeft && hazRight) {
    strat +=
      "Both sides have teeth, so think small and centered: a tight window right over the middle and a smooth, balanced swing. ";
  }

  if (hazShort && !hazLong) {
    strat += "Pick a number that comfortably carries the front edge and live with anything pin-high or a touch long. ";
  } else if (!hazShort && hazLong) {
    strat += "Plan for front or pin-high. Choose a yardage that simply cannot fly over the back. ";
  }

  if (!strat) {
    strat =
      "Aim for the fat part of the green or fairway—not the hero line—and let a solid, repeatable swing do the work.";
  }

  const safeTarget = holeNotes.safeTarget
    ? `<p class="advice-note"><strong>Your saved safe target:</strong> ${holeNotes.safeTarget}</p>`
    : "";
  const dangerNote = holeNotes.dangerNote
    ? `<p class="advice-note"><strong>Your danger reminder:</strong> ${holeNotes.dangerNote}</p>`
    : "";

  const stratHTML = `
    <div>
      <div class="advice-section-title">Strategy picture</div>
      <p>${strat}</p>
      ${safeTarget}
      ${dangerNote}
    </div>
  `;

  // Conditions section
  const lieNote =
    lie === "rough"
      ? "From the rough, expect less spin and possible flyers. Favor the big side of the target and commit to crisp contact."
      : lie === "sand"
      ? "From sand, build a stable base and focus on clipping the ball clean. Distance control is second to getting out."
      : lie === "other"
      ? "Weird lie? Shrink your goal: one calm, centered swing and solid contact."
      : "Standard lie: trust your normal yardages and tempo.";

  const windHTML = `
    <div>
      <div class="advice-section-title">Wind & lie</div>
      <p>${windComment || "Wind isn’t a major player here—swing your normal number."}</p>
      <p class="advice-note">${lieNote}</p>
    </div>
  `;

  // Mental cue section
  const cue =
    holeNotes.mentalCue ||
    "Deep breath… soft hands… one tiny target. Make a swing you could repeat all day.";
  const mentalHTML = `
    <div>
      <div class="advice-section-title">On the tee thoughts</div>
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

  // Also update current round, if one is active for this course
  updateRoundFromOutcome(tee, gir, puttsVal);
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
    Holes tracked: <strong>${s.shots}</strong><br />
    Fairways hit: <strong>${fairwayPct}%</strong> · GIR: <strong>${girPct}%</strong><br />
    Average putts on recorded holes: <strong>${avgPutts}</strong>
  `;
}

function resetStatsForCurrentCourse() {
  const course = getCurrentCourse();
  if (!course) return;
  const stats = loadJSON(STORAGE_STATS, {});
  if (stats[course.id]) {
    delete stats[course.id];
    saveJSON(STORAGE_STATS, stats);
  }
  updateStatsSummary();
}

// ---- Rounds (summary + history) ----

function getRounds() {
  return loadJSON(STORAGE_ROUNDS, []);
}

function saveRounds(rounds) {
  saveJSON(STORAGE_ROUNDS, rounds);
}

function getActiveRoundId() {
  return localStorage.getItem(STORAGE_ACTIVE_ROUND);
}

function setActiveRoundId(id) {
  if (id) {
    localStorage.setItem(STORAGE_ACTIVE_ROUND, id);
  } else {
    localStorage.removeItem(STORAGE_ACTIVE_ROUND);
  }
}

function getActiveRound() {
  const id = getActiveRoundId();
  if (!id) return null;
  const rounds = getRounds();
  return rounds.find((r) => r.id === id && !r.finished) || null;
}

function startNewRound() {
  const course = getCurrentCourse();
  if (!course) return;

  const rounds = getRounds();
  const id = "round-" + Date.now();
  const today = new Date().toISOString().slice(0, 10);

  const round = {
    id,
    courseId: course.id,
    courseName: course.name,
    date: today,
    shots: 0,
    fairways: 0,
    gir: 0,
    putts: 0,
    finished: false
  };

  rounds.push(round);
  saveRounds(rounds);
  setActiveRoundId(id);
  updateRoundUI();
}

function endCurrentRound() {
  const id = getActiveRoundId();
  const rounds = getRounds();
  if (!id) {
    updateRoundUI();
    return;
  }

  const idx = rounds.findIndex((r) => r.id === id);
  if (idx !== -1) {
    rounds[idx].finished = true;
    saveRounds(rounds);
  }
  setActiveRoundId(null);
  updateRoundUI();
}

function updateRoundFromOutcome(tee, gir, puttsVal) {
  const active = getActiveRound();
  const course = getCurrentCourse();
  if (!active || !course || active.courseId !== course.id) return;

  const rounds = getRounds();
  const idx = rounds.findIndex((r) => r.id === active.id);
  if (idx === -1) return;

  const r = rounds[idx];
  r.shots += 1;
  if (tee === "fairway") r.fairways += 1;
  if (gir === "yes") r.gir += 1;
  if (puttsVal > 0) r.putts += puttsVal;
  rounds[idx] = r;
  saveRounds(rounds);
  updateRoundUI();
}

function updateRoundUI() {
  const statusEl = $("roundStatus");
  const historyEl = $("roundHistory");
  const rounds = getRounds();
  const activeId = getActiveRoundId();
  const active = rounds.find((r) => r.id === activeId && !r.finished);

  if (!active) {
    statusEl.innerHTML =
      'No active round. Choose your course and tap <strong>Start new round</strong> when you hit your first tee shot.';
  } else {
    const fairwayPct = active.shots ? Math.round((active.fairways / active.shots) * 100) : 0;
    const girPct = active.shots ? Math.round((active.gir / active.shots) * 100) : 0;
    const avgPutts = active.shots ? (active.putts / active.shots).toFixed(1) : "0.0";

    statusEl.innerHTML = `
      Active round: <strong>${active.courseName}</strong> (${active.date})<br />
      Holes tracked so far: <strong>${active.shots}</strong> · FW: <strong>${fairwayPct}%</strong> · GIR: <strong>${girPct}%</strong> · Avg putts: <strong>${avgPutts}</strong>
    `;
  }

  const completed = rounds.filter((r) => r.finished).slice(-5).reverse();

  if (!completed.length) {
    historyEl.textContent = "No completed rounds yet. End a round to see it here.";
    return;
  }

  historyEl.innerHTML = completed
    .map((r) => {
      const fairwayPct = r.shots ? Math.round((r.fairways / r.shots) * 100) : 0;
      const girPct = r.shots ? Math.round((r.gir / r.shots) * 100) : 0;
      const avgPutts = r.shots ? (r.putts / r.shots).toFixed(1) : "0.0";
      return `
        <div class="round-history-item">
          <strong>${r.courseName}</strong> · ${r.date}<br />
          Holes: <strong>${r.shots}</strong> · FW: <strong>${fairwayPct}%</strong> · GIR: <strong>${girPct}%</strong> · Avg putts: <strong>${avgPutts}</strong>
        </div>
      `;
    })
    .join("");
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
    '<p class="muted">Drop in a distance and a little context, then tap <strong>Build my caddie plan</strong> to get started.</p>';
}

// ---- Mental coach ----

function buildMoodCue() {
  const mood = $("moodSelect").value;
  const out = $("moodOutput");

  let title = "Reset cue";
  let body =
    "Deep breath, soft grip, clear target. Let the last shot go and play the one in front of you.";
  let extra = "";

  if (mood === "nervous") {
    title = "Settle the nerves";
    body =
      "Breathe in for 4, hold for 2, out for 6. Your only job is a smooth, committed swing at a tiny target.";
    extra = "Pick a safe target, take one more club if you’re unsure, and swing at 80% speed.";
  } else if (mood === "frustrated") {
    title = "Let it go";
    body =
      "You can’t chase lost strokes. This swing is a brand new story. Ease your jaw, loosen your grip, and feel the clubhead get heavy.";
    extra = "Aim at the fat side of the hole, not the pin. Win back momentum with one boring, solid shot.";
  } else if (mood === "overconfident") {
    title = "Smart aggression";
    body =
      "Confidence is a weapon when it’s pointed at the right target. Choose the smart line first, then swing bravely.";
    extra = "Ask yourself: ‘If I hit this 8 out of 10, is it still okay?’ If not, dial back the line.";
  } else if (mood === "tired") {
    title = "Simple golf";
    body =
      "Tired swings love simple thoughts. One feel: smooth tempo and balanced finish.";
    extra = "Take a touch more club, favor the wide side of the green, and let go of perfect distance.";
  } else if (mood === "calm") {
    title = "Stay in the pocket";
    body =
      "You’re in a good place. Guard this feeling by keeping the same routine: breath, target, swing.";
    extra = "Stay patient. Great rounds are built one quietly solid swing at a time.";
  }

  out.innerHTML = `
    <p><strong>${title}</strong></p>
    <p>${body}</p>
    <p class="advice-note">${extra}</p>
  `;
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
  updateRoundUI();
  renderBagList();
  registerSW();
  setupInstallPrompt();

  // profile
  $("saveProfileBtn").addEventListener("click", saveProfile);
  $("avatarColor").addEventListener("change", saveProfile);
  $("avatarTone").addEventListener("change", saveProfile);
  $("avatarHat").addEventListener("change", saveProfile);
  $("avatarHair").addEventListener("change", saveProfile);
  $("avatarBg").addEventListener("change", saveProfile);

  // bag
  $("bagSaveBtn").addEventListener("click", saveBagClub);
  $("bagClearBtn").addEventListener("click", clearBagFields);
  $("bagList").addEventListener("click", (e) => {
    const key = e.target.getAttribute("data-bag-delete");
    if (key) {
      deleteBagClub(key);
    }
  });

  // course + holes
  $("courseSelect").addEventListener("change", () => {
    updateCourseAndHoleMeta();
    loadNotesForCurrentHole();
    updateStatsSummary();
    updateRoundUI();
  });
  $("holeSelect").addEventListener("change", () => {
    updateCourseAndHoleMeta();
    loadNotesForCurrentHole();
  });

  // notes / advice / stats
  $("saveNotesBtn").addEventListener("click", saveNotesForCurrentHole);
  $("getAdviceBtn").addEventListener("click", buildAdvice);
  $("clearShotBtn").addEventListener("click", clearShotInputs);
  $("saveOutcomeBtn").addEventListener("click", saveOutcome);
  $("resetStatsBtn").addEventListener("click", resetStatsForCurrentCourse);

  // mental coach
  $("getMoodBtn").addEventListener("click", buildMoodCue);

  // rounds
  $("startRoundBtn").addEventListener("click", startNewRound);
  $("endRoundBtn").addEventListener("click", endCurrentRound);

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
}

document.addEventListener("DOMContentLoaded", init);
