/* FollowDIA - Main Application */
'use strict';
const APP_VERSION = '20260322a';

// ============================================================
// CONSTANTS
// ============================================================
const MEALS = [
    { id: 'petitdej', label: 'Petit-déj', time: '07:30', icon: '🌅', defaultRatio: 12, defaultSensitivity: 150, defaultTarget: 150, defaultWantPct: 100 },
    { id: 'dejeuner', label: 'Déjeuner', time: '12:00', icon: '☀️', defaultRatio: 22, defaultSensitivity: 150, defaultTarget: 150, defaultWantPct: 100 },
    { id: 'gouter', label: 'Goûter', time: '16:45', icon: '🍪', defaultRatio: 20, defaultSensitivity: 150, defaultTarget: 150, defaultWantPct: 100 },
    { id: 'diner', label: 'Dîner', time: '19:00', icon: '🌙', defaultRatio: 26, defaultSensitivity: 150, defaultTarget: 150, defaultWantPct: 100 }
];

const TRENDS = ['↑↑', '↑', '↗', '→', '↘', '↓', '↓↓'];
const TREND_OFFSETS = { '↑↑': 90, '↑': 60, '↗': 30, '→': 0, '↘': -30, '↓': -60, '↓↓': -90 };

// ============================================================
// STATE
// ============================================================
let foods = [];
let currentDate = todayStr();
let currentMeal = getMealByTime();
let state = {}; // { '2026-03-22': { petitdej: { ... }, dejeuner: { ... }, ... } }
let settings = {};
let glucoseData = [];
let _glucoseViewHours = 3; // default time window in hours
let _glucoseViewEnd = null; // null = latest data point
let _glucosePinchDist0 = null;
let _glucoseHours0 = null;
let _glucosePanStartX = null;
let _glucoseViewEnd0 = null;
let _glucoseSelPoint = null;  // selected point on the glucose chart
let _glucoseChartView = null; // px<->time mapping of the last chart render
let _glucoseDidPan = false;   // suppress the click that may follow a pan

// ============================================================
// UTILS
// ============================================================
function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function getMealByTime(d = new Date()) {
    const t = d.getHours() * 60 + d.getMinutes();
    if (t >= 4 * 60 && t < 11 * 60) return 'petitdej';
    if (t >= 11 * 60 && t < 15 * 60) return 'dejeuner';
    if (t >= 15 * 60 && t < 17 * 60 + 30) return 'gouter';
    return 'diner';
}

function formatDate(str) {
    const [y,m,d] = str.split('-');
    const days = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    const months = ['janv','fév','mars','avr','mai','juin','juil','août','sept','oct','nov','déc'];
    const dt = new Date(+y, +m-1, +d);
    return `${days[dt.getDay()]} ${+d} ${months[+m-1]} ${y}`;
}

function prevDate(str) {
    const d = new Date(str);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0,10);
}

function nextDate(str) {
    const d = new Date(str);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0,10);
}

function round2(n) { return Math.round(n * 100) / 100; }
function round1(n) { return Math.round(n * 10) / 10; }

function $(sel, parent) { return (parent || document).querySelector(sel); }
function $$(sel, parent) { return [...(parent || document).querySelectorAll(sel)]; }

function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

// ============================================================
// THEME
// ============================================================
function isLightTheme() {
    return document.documentElement.dataset.theme === 'light';
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#ffffff' : '#1a1a2e');
    updateThemeButtons();
}

function updateThemeButtons() {
    const dark = $('#btn-theme-dark');
    const light = $('#btn-theme-light');
    if (dark) dark.classList.toggle('active', !isLightTheme());
    if (light) light.classList.toggle('active', isLightTheme());
}

function setTheme(theme) {
    applyTheme(theme);
    settings.theme = theme;
    saveSettings();
    // Re-draw canvases so their colors match the new theme
    renderGlucoseChart();
    if ($('#tab-dashboard')?.classList.contains('active')) renderDashboard();
}

// ============================================================
// FONT SIZE (global)
// ============================================================
const FONT_SIZES = ['petit', 'moyen', 'grand', 'tresgrand'];
const FONT_SCALES = { petit: 1, moyen: 1.15, grand: 1.3, tresgrand: 1.5 };

function fontScale() {
    return FONT_SCALES[document.documentElement.dataset.fontsize] || 1;
}

function applyFontSize(size) {
    document.documentElement.dataset.fontsize = FONT_SIZES.includes(size) ? size : 'petit';
    updateFontSizeButtons();
}

function updateFontSizeButtons() {
    const current = document.documentElement.dataset.fontsize || 'petit';
    $$('.fs-btn').forEach(b => b.classList.toggle('active', b.dataset.fs === current));
}

function setFontSize(size) {
    applyFontSize(size);
    settings.fontSize = size;
    saveSettings();
    // Re-draw canvases so their label sizes match
    renderGlucoseChart();
    if ($('#tab-dashboard')?.classList.contains('active')) renderDashboard();
}

// Scaled canvas font
function chartFont(px) {
    return `${Math.round(px * fontScale())}px sans-serif`;
}

// Ink color for canvas text/grids, readable on both themes.
// Low alpha = grid lines; higher alpha = text, drawn fully opaque for contrast.
function chartInk(alpha) {
    const opacity = alpha >= 0.3 ? 1 : alpha;
    if (isLightTheme()) return `rgba(0,0,0,${opacity})`;
    return `rgba(255,255,255,${opacity})`;
}

function chartLineColor() {
    return isLightTheme() ? '#1d3fd6' : '#4361ee';
}

function glucosePointColor(val) {
    const light = isLightTheme();
    if (val < 70) return light ? '#c02717' : '#e74c3c';
    if (val <= 180) return light ? '#157a3a' : '#2ecc71';
    if (val <= 250) return light ? '#8a5a00' : '#f39c12';
    return light ? '#c02717' : '#e74c3c';
}

// ============================================================
// STORAGE
// ============================================================
function loadState() {
    try {
        state = JSON.parse(localStorage.getItem('followdia_data') || '{}');
    } catch { state = {}; }
    sanitizeState();
}

// Coerce a value to a finite number, or null
function toNum(v) {
    if (v == null || v === '') return null;
    const n = parseFloat(v);
    return isFinite(n) ? n : null;
}

// Repair a meal entry coming from storage or from the Gist so that the
// render code can never crash on an unexpected shape
function sanitizeMeal(md) {
    if (!md || typeof md !== 'object' || Array.isArray(md)) return null;
    if (!Array.isArray(md.foods)) md.foods = [];
    md.foods = md.foods
        .filter(f => f && typeof f === 'object')
        .map(f => ({
            name: typeof f.name === 'string' ? f.name : '',
            massServed: toNum(f.massServed),
            massRemaining: toNum(f.massRemaining)
        }));
    if (md.foods.length === 0) md.foods.push({ name: '', massServed: null, massRemaining: null });
    if (typeof md.trend !== 'string') md.trend = '→';
    return md;
}

// Walk the whole state and drop/repair anything malformed. Corrupted
// entries (e.g. from an old sync payload) used to crash renderMeal at
// startup, leaving a blank screen until browser data was cleared.
function sanitizeState() {
    if (!state || typeof state !== 'object' || Array.isArray(state)) { state = {}; return; }
    Object.keys(state).forEach(date => {
        const day = state[date];
        if (!day || typeof day !== 'object' || Array.isArray(day) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            delete state[date];
            return;
        }
        Object.keys(day).forEach(meal => {
            const cleaned = sanitizeMeal(day[meal]);
            if (cleaned) day[meal] = cleaned;
            else delete day[meal];
        });
    });
}

function saveState() {
    localStorage.setItem('followdia_data', JSON.stringify(state));
}

function loadSettings() {
    const defaults = {};
    MEALS.forEach(m => {
        defaults[m.id] = { ratio: m.defaultRatio, sensitivity: m.defaultSensitivity, target: m.defaultTarget, wantPct: m.defaultWantPct };
    });
    try {
        const saved = JSON.parse(localStorage.getItem('followdia_settings') || '{}');
        settings = { ...defaults, ...saved };
        MEALS.forEach(m => {
            settings[m.id] = { ...defaults[m.id], ...(saved[m.id] || {}) };
        });
    } catch {
        settings = defaults;
    }
}

function saveSettings() {
    localStorage.setItem('followdia_settings', JSON.stringify(settings));
}

function getMealData(date, mealId) {
    if (!state[date]) state[date] = {};
    if (!state[date][mealId]) {
        state[date][mealId] = {
            glucose: null,
            trend: '→',
            activeInsulin: 0,
            correctionGiven: 0,
            foods: [{ name: '', massServed: null, massRemaining: null }],
            bolus1_carbs: null,
            bolus1_ui: null,
            bolus2_carbs: null,
            bolus2_ui: null,
            wantPct: 100,
            timestamp: null,
            shape: 5,
            sensorCathChange: ''
        };
    }
    // Ensure at least one food entry exists (and that foods is an array)
    if (!Array.isArray(state[date][mealId].foods) || state[date][mealId].foods.length === 0) {
        state[date][mealId].foods = [{ name: '', massServed: null, massRemaining: null }];
    }
    return state[date][mealId];
}

// ============================================================
// FOOD DATABASE
// ============================================================
// A food entry is only usable if it has a non-empty string name
function isValidFood(f) {
    return f && typeof f === 'object' && typeof f.n === 'string' && f.n.length > 0;
}

function getCustomFoods() {
    try {
        const arr = JSON.parse(localStorage.getItem('followdia_custom_foods') || '[]');
        return Array.isArray(arr) ? arr.filter(isValidFood) : [];
    } catch { return []; }
}

function getDeletedFoods() {
    try {
        const arr = JSON.parse(localStorage.getItem('followdia_deleted_foods') || '[]');
        return Array.isArray(arr) ? arr.filter(n => typeof n === 'string') : [];
    } catch { return []; }
}

function setDeletedFoods(names) {
    localStorage.setItem('followdia_deleted_foods', JSON.stringify(names));
    localStorage.setItem('followdia_deleted_foods_ts', new Date().toISOString());
}

async function loadFoods() {
    const deleted = new Set(getDeletedFoods());
    const userFoods = getCustomFoods();
    let baseFoods = [];
    try {
        const resp = await fetch('foods.json');
        const parsed = await resp.json();
        if (Array.isArray(parsed)) baseFoods = parsed.filter(isValidFood);
    } catch(e) {
        console.error('Failed to load foods:', e);
    }
    foods = [...baseFoods, ...userFoods]
        .filter(f => !deleted.has(f.n.toLowerCase()))
        .sort((a,b) => a.n.localeCompare(b.n, 'fr'));
}

function deleteFoods(names) {
    const lower = names.map(n => n.toLowerCase());
    // Remove from custom foods
    const customFoods = getCustomFoods().filter(f => !lower.includes(f.n.toLowerCase()));
    localStorage.setItem('followdia_custom_foods', JSON.stringify(customFoods));
    // Blacklist (covers base foods from foods.json and re-imports via sync)
    const deleted = getDeletedFoods();
    lower.forEach(n => { if (!deleted.includes(n)) deleted.push(n); });
    setDeletedFoods(deleted);
    // Remove from in-memory list
    foods = foods.filter(f => !lower.includes(f.n.toLowerCase()));
    scheduleSyncPush();
}

function findFood(name) {
    if (!name) return null;
    const lower = name.toLowerCase().trim();
    return foods.find(f => f.n.toLowerCase() === lower);
}

function searchFoods(query) {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase().trim();
    const results = foods.filter(f => f.n.toLowerCase().includes(q));
    return results.slice(0, 20);
}

// ============================================================
// CALCULATIONS
// ============================================================
function calcCorrectionBolus(glucose, trend, sensitivity, target, activeInsulin) {
    if (!glucose || !trend) return { raw: 0, safe: 0 };
    const offset = TREND_OFFSETS[trend] || 0;
    const raw = ((glucose + offset - target) / sensitivity) - activeInsulin;
    // Safe: only if glucose >= target and result >= 0
    const safe = (glucose >= target && raw >= 0) ? raw : 0;
    return { raw: round2(raw), safe: round2(safe) };
}

function calcFoodCarbs(food) {
    // food: { name, massServed, massRemaining }
    if (!food.name || food.massServed == null) return { carbs: 0, massAbsorbed: 0, carbsPer100: 0, sugarPer100: 0 };
    const foodInfo = findFood(food.name);
    if (!foodInfo) return { carbs: 0, massAbsorbed: 0, carbsPer100: 0, sugarPer100: 0, error: 'Aliment inconnu' };
    const remaining = food.massRemaining || 0;
    const absorbed = food.massServed - remaining;
    if (absorbed < 0) return { carbs: 0, massAbsorbed: 0, carbsPer100: foodInfo.g, sugarPer100: foodInfo.s, error: 'Masse restante > masse servie' };
    const carbs = absorbed * foodInfo.g / 100;
    return { carbs: round2(carbs), massAbsorbed: round2(absorbed), carbsPer100: foodInfo.g, sugarPer100: foodInfo.s };
}

function calcMealTotals(mealData, mealId) {
    const params = settings[mealId] || {};
    const ratio = params.ratio || 12;

    // Total carbs from food
    let totalCarbs = 0;
    let totalMassServed = 0;
    let totalMassAbsorbed = 0;
    (mealData.foods || []).forEach(f => {
        const calc = calcFoodCarbs(f);
        totalCarbs += calc.carbs;
        totalMassServed += (f.massServed || 0);
        totalMassAbsorbed += calc.massAbsorbed;
    });

    // Correction bolus
    const correction = calcCorrectionBolus(
        mealData.glucose, mealData.trend,
        params.sensitivity || 150, params.target || 150,
        mealData.activeInsulin || 0
    );

    // Total bolus due (meal + correction)
    const mealBolusUI = totalCarbs / ratio;
    const totalBolusDue = mealBolusUI + correction.safe;

    // Bolus given (all boluses for % calculation)
    let bolus1 = 0;
    if (mealData.bolus1_ui != null && mealData.bolus1_ui !== '') {
        bolus1 = parseFloat(mealData.bolus1_ui) * ratio; // UI → carbs
    } else if (mealData.bolus1_carbs != null && mealData.bolus1_carbs !== '') {
        bolus1 = parseFloat(mealData.bolus1_carbs);
    }
    let bolus2 = 0;
    if (mealData.bolus2_ui != null && mealData.bolus2_ui !== '') {
        bolus2 = parseFloat(mealData.bolus2_ui) * ratio;
    } else if (mealData.bolus2_carbs != null && mealData.bolus2_carbs !== '') {
        bolus2 = parseFloat(mealData.bolus2_carbs);
    }
    const totalBolusGivenCarbs = bolus1 + bolus2;
    const totalBolusGivenUI = totalBolusGivenCarbs / ratio;

    // Boluses counted for "reste à faire" (only checked ones)
    const bolus1Counted = (mealData.bolus1_count !== false) ? bolus1 : 0;
    const bolus2Counted = (mealData.bolus2_count !== false) ? bolus2 : 0;
    const countedBolusUI = (bolus1Counted + bolus2Counted) / ratio;

    // Total bolus with correction given
    const correctionGivenUI = parseFloat(mealData.correctionGiven) || 0;
    const totalGivenWithCorrection = totalBolusGivenUI + correctionGivenUI;
    const totalDueWithCorrection = totalBolusDue;

    // Global %: (correction + meal) injected over theoretical
    const pctGiven = totalDueWithCorrection > 0 ? (totalGivenWithCorrection / totalDueWithCorrection) * 100 : 0;
    // Meal-only %: injected meal boluses over theoretical meal bolus (no correction)
    const mealPct = mealBolusUI > 0 ? (totalBolusGivenUI / mealBolusUI) * 100 : 0;
    // Correction %: injected correction over recommended correction
    const correctionPct = correction.safe > 0 ? (correctionGivenUI / correction.safe) * 100 : 0;

    // Remaining based on wantPct (uses only counted boluses)
    const wantPct = mealData.wantPct || 100;
    const wantedUI = (mealBolusUI * wantPct / 100);
    const remainingUI = wantedUI - countedBolusUI;
    const remainingCarbs = remainingUI * ratio;

    return {
        totalCarbs: round2(totalCarbs),
        totalMassServed: round1(totalMassServed),
        totalMassAbsorbed: round1(totalMassAbsorbed),
        correction,
        mealBolusUI: round2(mealBolusUI),
        totalBolusDue: round2(totalBolusDue),
        totalBolusGivenUI: round2(totalBolusGivenUI),
        totalGivenWithCorrection: round2(totalGivenWithCorrection),
        totalDueWithCorrection: round2(totalDueWithCorrection),
        pctGiven: round1(pctGiven),
        mealPct: round1(mealPct),
        correctionPct: round1(correctionPct),
        correctionGivenUI: round2(correctionGivenUI),
        remainingUI: round2(remainingUI),
        remainingCarbs: round2(remainingCarbs),
        wantPct,
        ratio
    };
}

// Color convention for bolus percentages
function pctColor(p) {
    return p < 80 ? 'var(--danger)' : p > 120 ? 'var(--warning)' : 'var(--success)';
}

// ============================================================
// RENDER MEAL
// ============================================================
function renderMeal() {
    const mealData = getMealData(currentDate, currentMeal);
    const mealInfo = MEALS.find(m => m.id === currentMeal);
    const params = settings[currentMeal] || {};
    const totals = calcMealTotals(mealData, currentMeal);

    // Daily summary mini
    let dailyMiniHtml = '<div class="daily-summary-mini">';
    MEALS.forEach(m => {
        const md = state[currentDate]?.[m.id];
        let pct = '-';
        let pctClass = '';
        if (md && md.foods && md.foods.length > 0) {
            const t = calcMealTotals(md, m.id);
            if (t.totalDueWithCorrection > 0) {
                pct = Math.round(t.pctGiven) + '%';
                pctClass = t.pctGiven < 80 ? 'pct-low' : (t.pctGiven > 120 ? 'pct-high' : 'pct-ok');
            }
        }
        const isActive = m.id === currentMeal ? ' active-meal' : '';
        dailyMiniHtml += `<div class="mini-item${isActive}">
            <div class="mini-pct" style="color: ${pctClass === 'pct-low' ? 'var(--danger)' : pctClass === 'pct-high' ? 'var(--warning)' : pctClass === 'pct-ok' ? 'var(--success)' : 'var(--text-dim)'}">${pct}</div>
            <div class="mini-label">${m.label}</div>
        </div>`;
    });
    dailyMiniHtml += '</div>';

    // Correction section (compact layout)
    const correctionHtml = `
    <div class="correction-section">
        <h4>Bolus de correction</h4>
        <div class="cc-inputs">
            <div class="cc-field">
                <label>Glycémie</label>
                <div class="cc-glucose-row">
                    <input type="number" id="meal-glucose" value="${mealData.glucose || ''}" placeholder="--" inputmode="numeric" autocomplete="off">
                    <button type="button" id="btn-fetch-cgm" class="btn-cgm" title="Récupérer depuis le capteur">CGM</button>
                </div>
            </div>
            <div class="cc-field">
                <label>Insuline active</label>
                <input type="number" id="meal-active-insulin" value="${mealData.activeInsulin || ''}" step="0.1" placeholder="0" inputmode="decimal" autocomplete="off">
            </div>
        </div>
        <div class="cc-field cc-trend">
            <label>Tendance</label>
            <div class="trend-selector">
                ${TRENDS.map(t => `<button class="trend-btn ${mealData.trend === t ? 'active' : ''}" data-trend="${t}">${t}</button>`).join('')}
            </div>
        </div>
        <div class="cc-results">
            <div class="cc-field">
                <label>Correction recommandée</label>
                <div class="cc-reco" id="correction-value">${totals.correction.safe > 0 ? round1(totals.correction.safe) + ' UI' : '-'}</div>
            </div>
            <div class="cc-field">
                <label>Correction faite (UI)</label>
                <input type="number" id="meal-correction-given" value="${mealData.correctionGiven || ''}" step="0.1" placeholder="0" inputmode="decimal" autocomplete="off">
            </div>
        </div>
    </div>`;

    // Food entries
    let foodsHtml = '';
    mealData.foods.forEach((f, i) => {
        const calc = calcFoodCarbs(f);
        foodsHtml += `
        <div class="food-entry" data-index="${i}">
            <div class="food-entry-header">
                <div class="autocomplete-container food-name-input">
                    <input type="text" class="food-name" value="${f.name || ''}" placeholder="Nom de l'aliment" data-index="${i}" autocomplete="off">
                    <div class="autocomplete-list" id="ac-${i}"></div>
                </div>
                <button class="btn-remove" data-index="${i}">&times;</button>
            </div>
            <div class="food-masses">
                <div class="input-group">
                    <label>Masse servie (g)</label>
                    <input type="number" class="food-served" value="${f.massServed != null ? f.massServed : ''}" placeholder="0" data-index="${i}" inputmode="decimal" step="0.1" autocomplete="off">
                </div>
                <div class="input-group">
                    <label>Masse restante (g)</label>
                    <input type="number" class="food-remaining" value="${f.massRemaining != null ? f.massRemaining : ''}" placeholder="0" data-index="${i}" inputmode="decimal" step="0.1" autocomplete="off">
                </div>
            </div>
            ${f.name && f.massServed != null ? `
            <div class="food-result">
                <span>${calc.error ? '<span style="color:var(--danger)">' + calc.error + '</span>' : calc.massAbsorbed + 'g absorbé'}</span>
                <span class="carbs">${calc.carbs}g glucides</span>
                <span class="ui">${round2(calc.carbs / (params.ratio || 12))} UI</span>
            </div>` : ''}
        </div>`;
    });

    // Totals bar
    const totalsHtml = `
    <div class="totals-bar">
        <div class="total-item">
            <span class="label">Glucides</span>
            <span class="value" style="color:var(--warning)">${totals.totalCarbs}g</span>
        </div>
        <div class="total-item">
            <span class="label">Bolus repas</span>
            <span class="value" style="color:var(--accent-light)">${round1(totals.mealBolusUI)} UI</span>
        </div>
        <div class="total-item">
            <span class="label">Total dû</span>
            <span class="value" style="color:var(--text-bright)">${round1(totals.totalBolusDue)} UI</span>
        </div>
    </div>`;

    // Bolus input section
    const bolusHtml = `
    <div class="bolus-input-section">
        <h4>Saisie des bolus repas</h4>
        <div class="bolus-step">
            <div class="bolus-step-label">1er bolus (début de repas)${mealData.bolusTimestamp ? ` <input type="time" id="bolus-time" value="${new Date(mealData.bolusTimestamp).getHours().toString().padStart(2,'0')}:${new Date(mealData.bolusTimestamp).getMinutes().toString().padStart(2,'0')}" style="margin-left:8px;padding:2px 4px;font-size:calc(12px * var(--fs, 1));background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:4px;width:80px">` : ''}</div>
            <div class="bolus-step-row">
                <div class="input-group">
                    <label>Glucides (g)</label>
                    <input type="number" id="bolus1-carbs" value="${mealData.bolus1_carbs != null ? mealData.bolus1_carbs : ''}" placeholder="glucides" inputmode="decimal" step="0.1" autocomplete="off">
                </div>
                <div class="input-group">
                    <label>UI (si différent)</label>
                    <input type="number" id="bolus1-ui" value="${mealData.bolus1_ui != null ? mealData.bolus1_ui : ''}" placeholder="UI" inputmode="decimal" step="0.1" autocomplete="off">
                </div>
            </div>
            <label class="bolus-count-check"><input type="checkbox" id="bolus1-count" ${mealData.bolus1_count !== false ? 'checked' : ''}> Compter dans le reste à faire</label>
        </div>
        <div class="bolus-step">
            <div class="bolus-step-label">2ème bolus (fin de repas)</div>
            <div class="bolus-step-row">
                <div class="input-group">
                    <label>Glucides (g)</label>
                    <input type="number" id="bolus2-carbs" value="${mealData.bolus2_carbs != null ? mealData.bolus2_carbs : ''}" placeholder="glucides" inputmode="decimal" step="0.1" autocomplete="off">
                </div>
                <div class="input-group">
                    <label>UI (si différent)</label>
                    <input type="number" id="bolus2-ui" value="${mealData.bolus2_ui != null ? mealData.bolus2_ui : ''}" placeholder="UI" inputmode="decimal" step="0.1" autocomplete="off">
                </div>
            </div>
            <label class="bolus-count-check"><input type="checkbox" id="bolus2-count" ${mealData.bolus2_count !== false ? 'checked' : ''}> Compter dans le reste à faire</label>
        </div>
        <div class="meal-real-pct-row">
            <span>Bolus repas effectué</span>
            <span id="meal-real-pct" style="color:${totals.mealBolusUI > 0 ? pctColor(totals.mealPct) : 'var(--text-dim)'}">${totals.mealBolusUI > 0 ? round1(totals.mealPct) + '%' : '-'}</span>
        </div>
        <div class="want-pct-section">
            <label>Je veux :</label>
            <input type="number" id="want-pct" value="${mealData.wantPct || 100}" min="0" max="200" inputmode="numeric" autocomplete="off">
            <label>%</label>
            <span class="remaining">Reste : ${totals.remainingUI > 0 ? round1(totals.remainingUI) + ' UI (' + round1(totals.remainingCarbs) + 'g)' : '0'}</span>
        </div>
    </div>`;

    // Bilan section
    const bilanHtml = `
    <div class="bilan-section">
        <h4>Bilan des bolus</h4>
        <div class="bilan-sub">Bolus de correction</div>
        <div class="bilan-row">
            <span class="bilan-label">Théorique</span>
            <span class="bilan-value" id="bilan-corr-theo" style="color:var(--warning)">${round1(totals.correction.safe)} UI</span>
        </div>
        <div class="bilan-row">
            <span class="bilan-label">% réalisé</span>
            <span class="bilan-value" id="bilan-corr-pct" style="color:${totals.correction.safe > 0 ? pctColor(totals.correctionPct) : 'var(--text-dim)'}">${totals.correction.safe > 0 ? round1(totals.correctionPct) + '%' : '-'}</span>
        </div>
        <div class="bilan-sub">Bolus repas</div>
        <div class="bilan-row">
            <span class="bilan-label">Théorique</span>
            <span class="bilan-value" id="bilan-meal-theo" style="color:var(--warning)">${round1(totals.mealBolusUI)} UI</span>
        </div>
        <div class="bilan-row">
            <span class="bilan-label">Réel injecté</span>
            <span class="bilan-value" id="bilan-meal-real" style="color:var(--success)">${round1(totals.totalBolusGivenUI)} UI</span>
        </div>
        <div class="bilan-row">
            <span class="bilan-label">% injecté / théorique</span>
            <span class="bilan-value" id="bilan-meal-pct" style="color:${totals.mealBolusUI > 0 ? pctColor(totals.mealPct) : 'var(--text-dim)'}">${totals.mealBolusUI > 0 ? round1(totals.mealPct) + '%' : '-'}</span>
        </div>
        <div class="bilan-sub">Bolus global (correction + repas)</div>
        <div class="bilan-row">
            <span class="bilan-label">Théorique</span>
            <span class="bilan-value" id="bilan-glob-theo" style="color:var(--warning)">${round1(totals.totalDueWithCorrection)} UI</span>
        </div>
        <div class="bilan-row">
            <span class="bilan-label">Réel injecté</span>
            <span class="bilan-value" id="bilan-glob-real" style="color:var(--success)">${round1(totals.totalGivenWithCorrection)} UI</span>
        </div>
        <div class="bilan-row">
            <span class="bilan-label">% injecté / théorique</span>
            <span class="bilan-value" id="bilan-glob-pct" style="color:${totals.totalDueWithCorrection > 0 ? pctColor(totals.pctGiven) : 'var(--text-dim)'}">${totals.totalDueWithCorrection > 0 ? round1(totals.pctGiven) + '%' : '-'}</span>
        </div>
    </div>`;

    // Assemble
    const content = $('#meal-content');
    content.innerHTML = `
        ${dailyMiniHtml}
        <div class="date-nav">
            <button id="btn-prev-day">&larr;</button>
            <span class="date-label">${formatDate(currentDate)}</span>
            <button id="btn-next-day">&rarr;</button>
        </div>
        <div class="card">
            <h3>${mealInfo.icon} ${mealInfo.label} - ${mealInfo.time}</h3>
            <div class="correction-row triple" style="margin-bottom:12px">
                <div class="param-display">
                    <span class="label">Ratio</span>
                    <span class="value">${params.ratio || 12}</span>
                </div>
                <div class="param-display">
                    <span class="label">Sensibilité</span>
                    <span class="value">${params.sensitivity || 150}</span>
                </div>
                <div class="param-display">
                    <span class="label">Cible</span>
                    <span class="value">${params.target || 150}</span>
                </div>
            </div>
            ${correctionHtml}
        </div>
        <div class="card">
            <h3>Aliments</h3>
            ${foodsHtml}
            <button class="btn-add-food-entry" id="btn-add-food-entry">+ Ajouter un aliment</button>
            ${totalsHtml}
        </div>
        ${bolusHtml}
        ${bilanHtml}
    `;

    // Save bar
    let saveBar = document.getElementById('save-bar');
    if (!saveBar) {
        saveBar = document.createElement('div');
        saveBar.id = 'save-bar';
        saveBar.className = 'save-bar';
        saveBar.innerHTML = '<button class="btn btn-primary" id="btn-save">Sauvegarder</button>';
        document.body.appendChild(saveBar);
    }

    bindMealEvents();
}

let _mealEventsbound = false;
function bindMealEvents() {
    // Use event delegation on #meal-content so we never lose listeners after re-render
    const container = $('#meal-content');
    if (!container) return;

    // Only bind delegation once
    if (!_mealEventsbound) {
        _mealEventsbound = true;

        // Click delegation
        container.addEventListener('click', e => {
            // Date nav
            if (e.target.closest('#btn-prev-day')) { currentDate = prevDate(currentDate); renderMeal(); updateDateDisplay(); return; }
            if (e.target.closest('#btn-next-day')) { currentDate = nextDate(currentDate); renderMeal(); updateDateDisplay(); return; }

            // Trend buttons
            const trendBtn = e.target.closest('.trend-btn');
            if (trendBtn) {
                $$('.trend-btn', container).forEach(b => b.classList.remove('active'));
                trendBtn.classList.add('active');
                updateMealField('trend', trendBtn.dataset.trend);
                return;
            }

            // Remove food
            const removeBtn = e.target.closest('.btn-remove');
            if (removeBtn) {
                const md = getMealData(currentDate, currentMeal);
                const idx = parseInt(removeBtn.dataset.index);
                md.foods.splice(idx, 1);
                if (md.foods.length === 0) md.foods.push({ name: '', massServed: null, massRemaining: null });
                renderMeal();
                return;
            }

            // Fetch CGM glucose + trend
            if (e.target.closest('#btn-fetch-cgm')) {
                fillGlucoseFromCGM();
                return;
            }

            // Add food entry
            if (e.target.closest('#btn-add-food-entry')) {
                const md = getMealData(currentDate, currentMeal);
                md.foods.push({ name: '', massServed: null, massRemaining: null });
                renderMeal();
                // Focus the new food name input
                setTimeout(() => {
                    const inputs = $$('.food-name', container);
                    if (inputs.length > 0) inputs[inputs.length - 1].focus();
                }, 50);
                return;
            }
        });

        // Input delegation
        container.addEventListener('input', e => {
            const t = e.target;

            if (t.id === 'bolus1-count') {
                const md = getMealData(currentDate, currentMeal);
                md.bolus1_count = t.checked;
                refreshComputedValues(); autoSave(); return;
            }
            if (t.id === 'bolus2-count') {
                const md = getMealData(currentDate, currentMeal);
                md.bolus2_count = t.checked;
                refreshComputedValues(); autoSave(); return;
            }
            if (t.id === 'bolus-time') {
                const md = getMealData(currentDate, currentMeal);
                if (md.bolusTimestamp && t.value) {
                    const d = new Date(md.bolusTimestamp);
                    const [h, m] = t.value.split(':').map(Number);
                    d.setHours(h, m);
                    md.bolusTimestamp = d.toISOString();
                    autoSave();
                }
                return;
            }
            if (t.id === 'meal-glucose') { updateMealField('glucose', t.value ? parseFloat(t.value) : null); return; }
            if (t.id === 'meal-active-insulin') { updateMealField('activeInsulin', parseFloat(t.value) || 0); return; }
            if (t.id === 'meal-correction-given') { updateMealField('correctionGiven', parseFloat(t.value) || 0); return; }
            if (t.id === 'want-pct') { updateMealField('wantPct', parseInt(t.value) || 100); return; }

            // Bolus inputs
            if (t.id === 'bolus1-carbs') {
                const md = getMealData(currentDate, currentMeal);
                md.bolus1_carbs = t.value !== '' ? parseFloat(t.value) : null;
                // Record first bolus timestamp
                if (md.bolus1_carbs != null && !md.bolusTimestamp) {
                    md.bolusTimestamp = new Date().toISOString();
                }
                refreshComputedValues(); autoSave(); return;
            }
            if (t.id === 'bolus1-ui') {
                const md = getMealData(currentDate, currentMeal);
                md.bolus1_ui = t.value !== '' ? parseFloat(t.value) : null;
                if (md.bolus1_ui != null && !md.bolusTimestamp) {
                    md.bolusTimestamp = new Date().toISOString();
                }
                refreshComputedValues(); autoSave(); return;
            }
            if (t.id === 'bolus2-carbs') {
                const md = getMealData(currentDate, currentMeal);
                md.bolus2_carbs = t.value !== '' ? parseFloat(t.value) : null;
                refreshComputedValues(); autoSave(); return;
            }
            if (t.id === 'bolus2-ui') {
                const md = getMealData(currentDate, currentMeal);
                md.bolus2_ui = t.value !== '' ? parseFloat(t.value) : null;
                refreshComputedValues(); autoSave(); return;
            }

            // Food name autocomplete
            if (t.classList.contains('food-name')) {
                const idx = parseInt(t.dataset.index);
                const acList = $(`#ac-${idx}`);
                if (acList) {
                    const results = searchFoods(t.value);
                    if (results.length > 0 && t.value.length >= 1) {
                        acList.innerHTML = results.map(f => `<div class="autocomplete-item" data-name="${f.n}">${f.n} <span class="carb-info">${f.g}g/100g</span></div>`).join('');
                        acList.classList.add('show');
                    } else {
                        acList.classList.remove('show');
                    }
                }
                return;
            }

            // Food mass inputs
            if (t.classList.contains('food-served')) {
                updateFoodField(parseInt(t.dataset.index), 'massServed', t.value !== '' ? parseFloat(t.value) : null);
                return;
            }
            if (t.classList.contains('food-remaining')) {
                updateFoodField(parseInt(t.dataset.index), 'massRemaining', t.value !== '' ? parseFloat(t.value) : null);
                return;
            }
        });

        // Blur delegation for food name (save on blur)
        container.addEventListener('focusout', e => {
            if (e.target.classList.contains('food-name')) {
                const idx = parseInt(e.target.dataset.index);
                const val = e.target.value;
                setTimeout(() => {
                    const acList = $(`#ac-${idx}`);
                    if (acList) acList.classList.remove('show');
                    const md = getMealData(currentDate, currentMeal);
                    if (!md.foods[idx]) md.foods[idx] = { name: '', massServed: null, massRemaining: null };
                    md.foods[idx].name = val;
                    refreshFoodResult(idx);
                    refreshComputedValues();
                    autoSave();
                }, 250);
            }
        });

        // Mousedown delegation for autocomplete selection
        container.addEventListener('mousedown', e => {
            const item = e.target.closest('.autocomplete-item');
            if (item) {
                e.preventDefault();
                const entry = item.closest('.food-entry');
                const idx = entry ? parseInt(entry.dataset.index) : 0;
                const nameInput = $(`.food-name[data-index="${idx}"]`, container);
                if (nameInput) nameInput.value = item.dataset.name;
                const acList = item.closest('.autocomplete-list');
                if (acList) acList.classList.remove('show');
                const md = getMealData(currentDate, currentMeal);
                if (!md.foods[idx]) md.foods[idx] = { name: '', massServed: null, massRemaining: null };
                md.foods[idx].name = item.dataset.name;
                refreshFoodResult(idx);
                refreshComputedValues();
                autoSave();
            }
        });

        // Touch tracking to distinguish scroll from tap in autocomplete
        let _acTouchStartY = null;
        container.addEventListener('touchstart', e => {
            if (e.target.closest('.autocomplete-item')) {
                _acTouchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        container.addEventListener('touchend', e => {
            const item = e.target.closest('.autocomplete-item');
            if (item) {
                // If finger moved more than 10px, it was a scroll, not a tap
                const endY = e.changedTouches[0].clientY;
                if (_acTouchStartY != null && Math.abs(endY - _acTouchStartY) > 10) {
                    _acTouchStartY = null;
                    return;
                }
                _acTouchStartY = null;
                e.preventDefault();
                const entry = item.closest('.food-entry');
                const idx = entry ? parseInt(entry.dataset.index) : 0;
                const nameInput = $(`.food-name[data-index="${idx}"]`, container);
                if (nameInput) nameInput.value = item.dataset.name;
                const acList = item.closest('.autocomplete-list');
                if (acList) acList.classList.remove('show');
                const md = getMealData(currentDate, currentMeal);
                if (!md.foods[idx]) md.foods[idx] = { name: '', massServed: null, massRemaining: null };
                md.foods[idx].name = item.dataset.name;
                refreshFoodResult(idx);
                refreshComputedValues();
                autoSave();
            }
        });
    }

    // Save button (outside meal-content, only bind once)
    const saveBtn = document.getElementById('btn-save');
    if (saveBtn && !saveBtn._bound) {
        saveBtn._bound = true;
        saveBtn.addEventListener('click', () => {
            const md = getMealData(currentDate, currentMeal);
            if (!md.timestamp) md.timestamp = new Date().toISOString();
            saveState();
            toast('Sauvegardé');
            updateMealTabs();
        });
    }
}

function updateMealField(field, value) {
    const md = getMealData(currentDate, currentMeal);
    md[field] = value;
    refreshComputedValues();
    autoSave();
}

function updateFoodField(index, field, value) {
    const md = getMealData(currentDate, currentMeal);
    if (!md.foods[index]) md.foods[index] = { name: '', massServed: null, massRemaining: null };
    md.foods[index][field] = value;
    // Update this food's result display without re-rendering everything
    refreshFoodResult(index);
    refreshComputedValues();
    autoSave();
}

// Refresh the result line of a single food entry
function refreshFoodResult(index) {
    const md = getMealData(currentDate, currentMeal);
    const f = md.foods[index];
    if (!f) return;
    const params = settings[currentMeal] || {};
    const calc = calcFoodCarbs(f);
    const entry = $(`.food-entry[data-index="${index}"]`);
    if (!entry) return;
    // Remove old result
    const oldResult = entry.querySelector('.food-result');
    if (oldResult) oldResult.remove();
    // Add new result if we have enough data
    if (f.name && f.massServed != null) {
        const div = document.createElement('div');
        div.className = 'food-result';
        div.innerHTML = `
            <span>${calc.error ? '<span style="color:var(--danger)">' + calc.error + '</span>' : calc.massAbsorbed + 'g absorbé'}</span>
            <span class="carbs">${calc.carbs}g glucides</span>
            <span class="ui">${round2(calc.carbs / (params.ratio || 12))} UI</span>`;
        entry.appendChild(div);
    }
}

// Refresh all computed values (totals, bilan, correction, etc.) without re-rendering inputs
function refreshComputedValues() {
    const md = getMealData(currentDate, currentMeal);
    const params = settings[currentMeal] || {};
    const totals = calcMealTotals(md, currentMeal);

    // Correction value
    const corrEl = $('#correction-value');
    if (corrEl) corrEl.textContent = totals.correction.safe > 0 ? round1(totals.correction.safe) + ' UI' : '-';

    // Totals bar
    const totalsBar = $('.totals-bar');
    if (totalsBar) {
        const items = totalsBar.querySelectorAll('.total-item .value');
        if (items[0]) items[0].textContent = totals.totalCarbs + 'g';
        if (items[1]) items[1].textContent = round1(totals.mealBolusUI) + ' UI';
        if (items[2]) items[2].textContent = round1(totals.totalBolusDue) + ' UI';
    }

    // Remaining in want-pct section
    const remainingEl = $('.want-pct-section .remaining');
    if (remainingEl) {
        remainingEl.textContent = 'Reste : ' + (totals.remainingUI > 0 ? round1(totals.remainingUI) + ' UI (' + round1(totals.remainingCarbs) + 'g)' : '0');
    }

    // Bilan section + real meal pct (updated by id)
    const setVal = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const setPct = (id, pct, theo) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = theo > 0 ? round1(pct) + '%' : '-';
        el.style.color = theo > 0 ? pctColor(pct) : 'var(--text-dim)';
    };
    setVal('bilan-corr-theo', round1(totals.correction.safe) + ' UI');
    setPct('bilan-corr-pct', totals.correctionPct, totals.correction.safe);
    setVal('bilan-meal-theo', round1(totals.mealBolusUI) + ' UI');
    setVal('bilan-meal-real', round1(totals.totalBolusGivenUI) + ' UI');
    setPct('bilan-meal-pct', totals.mealPct, totals.mealBolusUI);
    setVal('bilan-glob-theo', round1(totals.totalDueWithCorrection) + ' UI');
    setVal('bilan-glob-real', round1(totals.totalGivenWithCorrection) + ' UI');
    setPct('bilan-glob-pct', totals.pctGiven, totals.totalDueWithCorrection);
    setPct('meal-real-pct', totals.mealPct, totals.mealBolusUI);

    // Daily summary mini
    const miniItems = $$('.daily-summary-mini .mini-item');
    MEALS.forEach((m, i) => {
        if (!miniItems[i]) return;
        const mealD = state[currentDate]?.[m.id];
        const pctEl = miniItems[i].querySelector('.mini-pct');
        if (!pctEl) return;
        if (mealD && mealD.foods && mealD.foods.length > 0 && mealD.foods.some(f => f.name)) {
            const t = calcMealTotals(mealD, m.id);
            if (t.totalDueWithCorrection > 0) {
                const p = Math.round(t.pctGiven);
                pctEl.textContent = p + '%';
                pctEl.style.color = p < 80 ? 'var(--danger)' : p > 120 ? 'var(--warning)' : 'var(--success)';
            } else {
                pctEl.textContent = '-';
                pctEl.style.color = 'var(--text-dim)';
            }
        } else {
            pctEl.textContent = '-';
            pctEl.style.color = 'var(--text-dim)';
        }
    });
}

// Auto-save with debounce + sync push
let _autoSaveTimer = null;
function autoSave() {
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(() => {
        const md = getMealData(currentDate, currentMeal);
        if (!md.timestamp) md.timestamp = new Date().toISOString();
        md.lastModified = new Date().toISOString();
        saveState();
        scheduleSyncPush();
    }, 1500);
}

// ============================================================
// MEAL TABS
// ============================================================
function updateMealTabs() {
    $$('.meal-tab[data-meal]').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.meal === currentMeal);
        const md = state[currentDate]?.[tab.dataset.meal];
        const hasData = md && md.foods && md.foods.length > 0 && md.foods.some(f => f.name);
        tab.classList.toggle('has-data', hasData);
    });
}

// ============================================================
// GLUCOSE (Nightscout)
// ============================================================
async function fetchGlucose() {
    const url = settings.nightscoutUrl || localStorage.getItem('followdia_ns_url');
    if (!url) return;

    const statusEl = $('#glucose-status');

    try {
        const token = settings.nightscoutToken || localStorage.getItem('followdia_ns_token') || '';
        const baseUrl = url.replace(/\/+$/, '');

        // First test server connectivity with status endpoint
        let statusUrl = `${baseUrl}/api/v1/status.json`;
        if (token) statusUrl += `?token=${token}`;

        if (statusEl) statusEl.textContent = 'Connexion en cours...';

        const statusResp = await fetch(statusUrl);
        if (!statusResp.ok) {
            const errText = await statusResp.text().catch(() => '');
            throw new Error(`Serveur Nightscout: erreur ${statusResp.status}. ${errText.slice(0, 100)}`);
        }

        // Fetch 3 days of glucose entries (for dashboard post-bolus charts)
        const now = Date.now();
        const from = now - 3 * 24 * 60 * 60 * 1000;
        let apiUrl = `${baseUrl}/api/v1/entries/sgv.json?find[dateString][$gte]=${new Date(from).toISOString()}&count=864`;
        if (token) apiUrl += `&token=${token}`;

        const resp = await fetch(apiUrl);
        if (!resp.ok) throw new Error(`Erreur ${resp.status} lors de la récupération des glycémies`);
        glucoseData = await resp.json();

        if (!Array.isArray(glucoseData) || glucoseData.length === 0) {
            if (statusEl) statusEl.textContent = 'Connecté mais aucune glycémie trouvée (xDrip envoie-t-il des données ?)';
            glucoseData = [];
            return;
        }

        glucoseData.sort((a, b) => a.date - b.date);
        _glucoseViewEnd = null; // reset to latest on fresh fetch
        renderGlucoseChart();
        _initGlucoseChartGestures();
        renderGlucoseCurrent();
        $('#glucose-current').classList.remove('hidden');
        if (statusEl) statusEl.textContent = '';
        toast(`${glucoseData.length} glycémies récupérées`);
    } catch(e) {
        console.error('Glucose fetch error:', e);
        const msg = e.message || String(e);
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS')) {
            if (statusEl) statusEl.textContent = 'Erreur CORS ou réseau. Vérifiez que l\'URL est correcte et que le serveur autorise les requêtes depuis d\'autres sites. Essayez d\'ajouter un token API.';
        } else {
            if (statusEl) statusEl.textContent = 'Erreur : ' + msg;
        }
        toast('Erreur connexion Nightscout');
    }
}

function renderGlucoseCurrent() {
    if (glucoseData.length === 0) return;
    const latest = glucoseData[glucoseData.length - 1];
    $('#glucose-val').textContent = latest.sgv || latest.value || '--';
    $('#glucose-trend').textContent = DIRECTION_TO_TREND[latest.direction] || latest.direction || '→';
    const mins = Math.round((Date.now() - latest.date) / 60000);
    $('#glucose-time').textContent = mins < 60 ? `il y a ${mins} min` : `il y a ${Math.round(mins/60)}h`;

    // Delta between the last two readings
    const deltaEl = $('#glucose-delta');
    if (deltaEl) {
        const prev = glucoseData[glucoseData.length - 2];
        const vLatest = latest.sgv || latest.value;
        const vPrev = prev ? (prev.sgv || prev.value) : null;
        if (vPrev > 0 && vLatest > 0) {
            const d = vLatest - vPrev;
            deltaEl.textContent = `Δ ${d > 0 ? '+' : ''}${d} mg/dl`;
            deltaEl.style.color = d >= 10 ? 'var(--warning)' : d <= -10 ? 'var(--danger)' : 'var(--text-dim)';
        } else {
            deltaEl.textContent = '';
        }
    }

    const val = latest.sgv || latest.value;
    const valEl = $('#glucose-val');
    valEl.style.color = val < 70 ? 'var(--glucose-low)' : val < 180 ? 'var(--glucose-ok)' : val < 250 ? 'var(--glucose-high)' : 'var(--glucose-very-high)';
}

const DIRECTION_TO_TREND = { 'DoubleUp': '↑↑', 'SingleUp': '↑', 'FortyFiveUp': '↗', 'Flat': '→', 'FortyFiveDown': '↘', 'SingleDown': '↓', 'DoubleDown': '↓↓' };

const CGM_FRESH_MS = 5 * 60 * 1000;

async function fillGlucoseFromCGM() {
    const btn = $('#btn-fetch-cgm');
    if (btn) btn.classList.remove('cgm-ok');

    // Fetch (or re-fetch if cached data is older than 5 min)
    let latest = glucoseData[glucoseData.length - 1];
    if (!latest || Date.now() - latest.date > CGM_FRESH_MS) {
        await fetchGlucose();
        latest = glucoseData[glucoseData.length - 1];
    }
    if (!latest) {
        toast('Aucune glycémie disponible');
        return;
    }

    const ageMin = Math.round((Date.now() - latest.date) / 60000);
    if (Date.now() - latest.date > CGM_FRESH_MS) {
        toast(`Glycémie actuelle impossible à récupérer (dernière mesure il y a ${ageMin} min)`);
        return;
    }

    const val = latest.sgv || latest.value;
    const trend = DIRECTION_TO_TREND[latest.direction] || latest.direction || '→';

    // Update state
    const md = getMealData(currentDate, currentMeal);
    md.glucose = val;
    md.trend = trend;

    // Update UI inputs
    const glucoseInput = $('#meal-glucose');
    if (glucoseInput) glucoseInput.value = val;

    // Update trend buttons
    $$('.trend-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = Array.from($$('.trend-btn')).find(b => b.dataset.trend === trend);
    if (activeBtn) activeBtn.classList.add('active');

    refreshComputedValues();
    autoSave();

    if (btn) btn.classList.add('cgm-ok');
    toast(`${val} mg/dl ${trend} (il y a ${ageMin} min)`);
}

function renderGlucoseChart() {
    const canvas = $('#glucose-chart');
    if (!canvas || glucoseData.length === 0) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    // Calculate available height: subtract top bar, nav tabs, glucose current, status, and padding
    const chartContainer = canvas.closest('.glucose-chart-container');
    const containerTop = chartContainer ? chartContainer.getBoundingClientRect().top : 120;
    const availableHeight = window.innerHeight - containerTop - 8;
    const containerWidth = canvas.parentElement.offsetWidth || window.innerWidth;
    const H = Math.max(200, Math.min(availableHeight, 600));
    const W = containerWidth;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const padding = { top: 20, right: 10, bottom: 30, left: 40 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    // Time window
    const dataMaxTime = glucoseData[glucoseData.length - 1].date;
    const dataMinTime = glucoseData[0].date;
    const windowMs = _glucoseViewHours * 3600000;
    const viewEnd = _glucoseViewEnd != null ? _glucoseViewEnd : dataMaxTime;
    const viewStart = viewEnd - windowMs;

    // Store the px<->time mapping for tap-to-select
    _glucoseChartView = { viewStart, viewEnd, left: padding.left, chartW };

    // Filter visible data
    const visible = glucoseData.filter(d => d.date >= viewStart && d.date <= viewEnd);

    // Y range from visible data only
    const visValues = visible.map(d => d.sgv || d.value).filter(v => v > 0);
    const minVal = visValues.length > 0 ? Math.min(40, Math.min(...visValues)) : 40;
    const maxVal = visValues.length > 0 ? Math.max(300, Math.max(...visValues)) : 300;

    function x(time) { return padding.left + ((time - viewStart) / windowMs) * chartW; }
    function y(val) { return padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH; }

    // Target zones
    ctx.fillStyle = 'rgba(46, 204, 113, 0.08)';
    ctx.fillRect(padding.left, y(180), chartW, y(70) - y(180));
    ctx.fillStyle = 'rgba(231, 76, 60, 0.08)';
    ctx.fillRect(padding.left, y(70), chartW, y(minVal) - y(70));

    // Grid lines
    ctx.strokeStyle = chartInk(0.07);
    ctx.lineWidth = 1;
    [70, 100, 150, 180, 250].forEach(v => {
        ctx.beginPath();
        ctx.moveTo(padding.left, y(v));
        ctx.lineTo(W - padding.right, y(v));
        ctx.stroke();
        ctx.fillStyle = chartInk(0.6);
        ctx.font = chartFont(12);
        ctx.textAlign = 'right';
        ctx.fillText(v, padding.left - 4, y(v) + 3);
    });

    // Time labels — adaptive interval
    ctx.fillStyle = chartInk(0.6);
    ctx.font = chartFont(12);
    ctx.textAlign = 'center';
    const labelIntervalMs = _glucoseViewHours <= 2 ? 1800000 : _glucoseViewHours <= 6 ? 3600000 : 7200000;
    const firstLabel = Math.ceil(viewStart / labelIntervalMs) * labelIntervalMs;
    for (let t = firstLabel; t <= viewEnd; t += labelIntervalMs) {
        const d = new Date(t);
        ctx.fillText(`${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`, x(t), H - 5);
    }

    // Line (draw all data for smooth edges at boundaries)
    ctx.beginPath();
    ctx.strokeStyle = chartLineColor();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.save();
    ctx.rect(padding.left, padding.top, chartW, chartH);
    ctx.clip();
    let started = false;
    glucoseData.forEach(d => {
        const val = d.sgv || d.value;
        if (val <= 0) return;
        if (!started) { ctx.moveTo(x(d.date), y(val)); started = true; }
        else ctx.lineTo(x(d.date), y(val));
    });
    ctx.stroke();

    // Dots for visible points
    visible.forEach(d => {
        const val = d.sgv || d.value;
        if (val <= 0) return;
        ctx.beginPath();
        ctx.arc(x(d.date), y(val), 3, 0, Math.PI * 2);
        ctx.fillStyle = glucosePointColor(val);
        ctx.fill();
    });
    ctx.restore();

    // Selected point: crosshair + label with time and value
    if (_glucoseSelPoint && _glucoseSelPoint.date >= viewStart && _glucoseSelPoint.date <= viewEnd) {
        const sv = _glucoseSelPoint.sgv || _glucoseSelPoint.value;
        if (sv > 0) {
            const sx = x(_glucoseSelPoint.date);
            const sy = y(sv);
            // Vertical line
            ctx.strokeStyle = chartInk(0.4);
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(sx, padding.top);
            ctx.lineTo(sx, padding.top + chartH);
            ctx.stroke();
            ctx.setLineDash([]);
            // Highlight circle
            ctx.beginPath();
            ctx.arc(sx, sy, 6, 0, Math.PI * 2);
            ctx.strokeStyle = chartLineColor();
            ctx.lineWidth = 2;
            ctx.stroke();
            // Label box
            const d = new Date(_glucoseSelPoint.date);
            const label = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} — ${sv} mg/dl`;
            const fontPx = Math.round(13 * fontScale());
            ctx.font = `bold ${fontPx}px sans-serif`;
            const tw = ctx.measureText(label).width;
            const bw = tw + 16;
            const bh = fontPx + 12;
            const bx = Math.max(padding.left, Math.min(W - padding.right - bw, sx - bw / 2));
            const by = padding.top + 4;
            ctx.fillStyle = isLightTheme() ? 'rgba(255,255,255,0.95)' : 'rgba(26,26,46,0.95)';
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = chartLineColor();
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, bw, bh);
            ctx.fillStyle = chartInk(1);
            ctx.textAlign = 'center';
            ctx.fillText(label, bx + bw / 2, by + bh - 8);
        }
    }

    // Zoom hint
    ctx.fillStyle = chartInk(0.5);
    ctx.font = chartFont(11);
    ctx.textAlign = 'right';
    ctx.fillText(`${_glucoseViewHours <= 1 ? Math.round(_glucoseViewHours * 60) + ' min' : round1(_glucoseViewHours) + 'h'}`, W - padding.right, padding.top - 6);

    // Derivative chart follows the same time window
    renderGlucoseDerivChart();
}

// Derivative of glucose (mg/dl per minute), smoothed over 3 points,
// sharing the main chart's time window (zoom/pan follow along)
function renderGlucoseDerivChart() {
    const canvas = $('#glucose-deriv-chart');
    if (!canvas || glucoseData.length < 2) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement.offsetWidth || window.innerWidth;
    const H = 150;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const padding = { top: 10, right: 10, bottom: 22, left: 40 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    // Raw derivative between consecutive readings
    const der = [];
    for (let i = 1; i < glucoseData.length; i++) {
        const a = glucoseData[i - 1], b = glucoseData[i];
        const va = a.sgv || a.value, vb = b.sgv || b.value;
        const dtMin = (b.date - a.date) / 60000;
        if (va > 0 && vb > 0 && dtMin > 0 && dtMin <= 20) {
            der.push({ date: (a.date + b.date) / 2, v: (vb - va) / dtMin });
        }
    }
    if (der.length === 0) return;

    // 3-point moving average to tame sensor noise
    const smooth = der.map((p, i) => {
        const s = der.slice(Math.max(0, i - 1), i + 2);
        return { date: p.date, v: s.reduce((t, q) => t + q.v, 0) / s.length };
    });

    // Same time window as the main chart
    const dataMaxTime = glucoseData[glucoseData.length - 1].date;
    const windowMs = _glucoseViewHours * 3600000;
    const viewEnd = _glucoseViewEnd != null ? _glucoseViewEnd : dataMaxTime;
    const viewStart = viewEnd - windowMs;
    const visible = smooth.filter(p => p.date >= viewStart && p.date <= viewEnd);

    // Symmetric Y range
    const maxAbs = Math.max(1.5, ...visible.map(p => Math.abs(p.v)));
    const yMax = Math.min(6, Math.ceil(maxAbs * 2) / 2);

    function x(time) { return padding.left + ((time - viewStart) / windowMs) * chartW; }
    function y(val) { return padding.top + chartH / 2 - (val / yMax) * (chartH / 2); }

    // Grid lines and labels
    ctx.font = chartFont(11);
    ctx.textAlign = 'right';
    [-2, -1, 1, 2].forEach(v => {
        if (Math.abs(v) > yMax) return;
        ctx.strokeStyle = chartInk(0.07);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, y(v));
        ctx.lineTo(W - padding.right, y(v));
        ctx.stroke();
        ctx.fillStyle = chartInk(0.6);
        ctx.fillText((v > 0 ? '+' : '') + v, padding.left - 4, y(v) + 3);
    });

    // Zero line
    ctx.strokeStyle = chartInk(0.25);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, y(0));
    ctx.lineTo(W - padding.right, y(0));
    ctx.stroke();
    ctx.fillStyle = chartInk(0.6);
    ctx.fillText('0', padding.left - 4, y(0) + 3);

    // Time labels (same interval logic as the main chart)
    ctx.textAlign = 'center';
    const labelIntervalMs = _glucoseViewHours <= 2 ? 1800000 : _glucoseViewHours <= 6 ? 3600000 : 7200000;
    const firstLabel = Math.ceil(viewStart / labelIntervalMs) * labelIntervalMs;
    ctx.fillStyle = chartInk(0.6);
    for (let t = firstLabel; t <= viewEnd; t += labelIntervalMs) {
        const d = new Date(t);
        ctx.fillText(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`, x(t), H - 5);
    }

    // Line
    ctx.save();
    ctx.rect(padding.left, padding.top, chartW, chartH);
    ctx.clip();
    ctx.beginPath();
    ctx.strokeStyle = chartLineColor();
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    let started = false;
    smooth.forEach(p => {
        const py = Math.max(padding.top, Math.min(padding.top + chartH, y(p.v)));
        if (!started) { ctx.moveTo(x(p.date), py); started = true; }
        else ctx.lineTo(x(p.date), py);
    });
    ctx.stroke();

    // Dots, colored by rate of change
    visible.forEach(p => {
        ctx.beginPath();
        ctx.arc(x(p.date), Math.max(padding.top, Math.min(padding.top + chartH, y(p.v))), 2, 0, Math.PI * 2);
        const light = isLightTheme();
        ctx.fillStyle = p.v >= 2 ? (light ? '#8a5a00' : '#f39c12')
            : p.v <= -2 ? (light ? '#c02717' : '#e74c3c')
            : (light ? '#157a3a' : '#2ecc71');
        ctx.fill();
    });
    ctx.restore();
}

function _initGlucoseChartGestures() {
    const canvas = $('#glucose-chart');
    if (!canvas || canvas._gesturesInit) return;
    canvas._gesturesInit = true;

    const dataTimeRange = () => {
        if (glucoseData.length < 2) return 24;
        return (glucoseData[glucoseData.length - 1].date - glucoseData[0].date) / 3600000;
    };

    // Pinch to zoom (touch)
    canvas.addEventListener('touchstart', e => {
        if (e.touches.length === 2) {
            e.preventDefault();
            _glucosePinchDist0 = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
            _glucoseHours0 = _glucoseViewHours;
        } else if (e.touches.length === 1) {
            _glucosePanStartX = e.touches[0].clientX;
            _glucoseViewEnd0 = _glucoseViewEnd != null ? _glucoseViewEnd : glucoseData[glucoseData.length - 1]?.date || Date.now();
            _glucoseDidPan = false;
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        if (e.touches.length === 2 && _glucosePinchDist0 != null) {
            e.preventDefault();
            const dist = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
            const scale = _glucosePinchDist0 / Math.max(dist, 10);
            _glucoseViewHours = Math.max(0.5, Math.min(dataTimeRange(), _glucoseHours0 * scale));
            renderGlucoseChart();
        } else if (e.touches.length === 1 && _glucosePanStartX != null) {
            e.preventDefault();
            const dx = e.touches[0].clientX - _glucosePanStartX;
            if (Math.abs(dx) > 8) _glucoseDidPan = true;
            const rect = canvas.getBoundingClientRect();
            const pxPerMs = rect.width / (_glucoseViewHours * 3600000);
            const dtMs = -dx / pxPerMs;
            const maxEnd = glucoseData[glucoseData.length - 1]?.date || Date.now();
            const minEnd = (glucoseData[0]?.date || 0) + _glucoseViewHours * 3600000;
            _glucoseViewEnd = Math.max(minEnd, Math.min(maxEnd, _glucoseViewEnd0 + dtMs));
            renderGlucoseChart();
        }
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
        if (e.touches.length < 2) { _glucosePinchDist0 = null; _glucoseHours0 = null; }
        if (e.touches.length < 1) { _glucosePanStartX = null; _glucoseViewEnd0 = null; }
    });

    // Mouse wheel to zoom (PC)
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.2 : 0.8;
        _glucoseViewHours = Math.max(0.5, Math.min(dataTimeRange(), _glucoseViewHours * factor));
        renderGlucoseChart();
    }, { passive: false });

    // Tap/click to select a point (shows its time and value)
    canvas.addEventListener('click', e => {
        if (_glucoseDidPan) { _glucoseDidPan = false; return; }
        if (!_glucoseChartView || glucoseData.length === 0) return;
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const { viewStart, viewEnd, left, chartW } = _glucoseChartView;
        const t = viewStart + ((px - left) / chartW) * (viewEnd - viewStart);
        let best = null, bestDt = Infinity;
        glucoseData.forEach(p => {
            if (p.date < viewStart || p.date > viewEnd) return;
            const dt = Math.abs(p.date - t);
            if (dt < bestDt) { bestDt = dt; best = p; }
        });
        const pxPerMs = chartW / (viewEnd - viewStart);
        if (best && bestDt * pxPerMs <= 30) {
            _glucoseSelPoint = (best === _glucoseSelPoint) ? null : best;
        } else {
            _glucoseSelPoint = null;
        }
        renderGlucoseChart();
    });
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
    render3DaysDashboard();
    render30DaysTrend();
}

function render3DaysDashboard() {
    const container = $('#dashboard-3days');
    if (!container) return;

    let html = '';
    for (let d = 0; d < 3; d++) {
        let date = currentDate;
        for (let i = 0; i < d; i++) date = prevDate(date);
        const dayData = state[date] || {};

        html += `<div class="dashboard-day card">
            <div class="dashboard-day-header">${formatDate(date)}</div>`;

        MEALS.forEach((m, mi) => {
            const md = dayData[m.id];
            let pct = 0;
            if (md && md.foods && md.foods.length > 0 && md.foods.some(f => f.name)) {
                const t = calcMealTotals(md, m.id);
                if (t.totalDueWithCorrection > 0) {
                    pct = Math.round(t.pctGiven);
                }
            }

            const canvasId = `postbolus-${d}-${mi}`;
            const gaugeColor = pct === 0 ? 'var(--text-dim)' : pct < 80 ? 'var(--danger)' : pct > 120 ? 'var(--warning)' : 'var(--success)';
            const hasBolus = md && (md.bolus1_carbs != null || md.bolus1_ui != null || md.bolus2_ui != null);
            const hasData = pct > 0 || hasBolus;

            html += `<div class="db-meal-block">
                <div class="db-meal-label">${m.icon} ${m.label}</div>
                <div class="db-meal-content">
                    <div class="db-gauge-col">
                        <div class="db-gauge">
                            <div class="db-gauge-fill" style="height:${Math.min(pct, 100)}%;background:${gaugeColor}"></div>
                            <div class="db-gauge-marker"></div>
                        </div>
                        <div class="db-gauge-value" style="color:${gaugeColor}">${pct > 0 ? pct + '%' : '-'}</div>
                    </div>
                    <div class="db-chart-col">
                        ${hasData ? `<canvas id="${canvasId}" class="db-postbolus-canvas"></canvas>` : '<div class="db-no-data">Pas de données</div>'}
                    </div>
                </div>
            </div>`;
        });

        html += '</div>';
    }
    container.innerHTML = html;

    // Now draw the post-bolus glucose charts on each canvas
    for (let d = 0; d < 3; d++) {
        let date = currentDate;
        for (let i = 0; i < d; i++) date = prevDate(date);
        const dayData = state[date] || {};

        MEALS.forEach((m, mi) => {
            const canvasId = `postbolus-${d}-${mi}`;
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const md = dayData[m.id];
            drawPostBolusChart(canvas, md, m.id);
        });
    }
}

function drawPostBolusChart(canvas, mealData, mealId) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width || 250;
    const H = rect.height || 80;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // Find bolus timestamp (use bolusTimestamp if available, fallback to timestamp)
    let bolusTime = null;
    if (mealData && mealData.bolusTimestamp) {
        bolusTime = new Date(mealData.bolusTimestamp).getTime();
    } else if (mealData && mealData.timestamp) {
        // Legacy fallback: only use if actual bolus data exists
        const hasBolus = mealData.bolus1_carbs != null || mealData.bolus1_ui != null || mealData.bolus2_ui != null;
        if (hasBolus) {
            bolusTime = new Date(mealData.timestamp).getTime();
        }
    }

    if (!bolusTime) {
        ctx.fillStyle = chartInk(0.4);
        ctx.font = chartFont(11);
        ctx.textAlign = 'center';
        ctx.fillText('Pas de bolus enregistré', W / 2, H / 2 + 4);
        return;
    }

    const endTime = bolusTime + 4 * 60 * 60 * 1000;

    // Filter glucose data for this 4h window
    const points = glucoseData.filter(g => g.date >= bolusTime && g.date <= endTime);

    if (points.length === 0) {
        ctx.fillStyle = chartInk(0.4);
        ctx.font = chartFont(11);
        ctx.textAlign = 'center';
        ctx.fillText('Pas de glycémie disponible', W / 2, H / 2 + 4);
        return;
    }

    const padding = { top: 8, right: 6, bottom: 18, left: 28 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    const values = points.map(p => p.sgv || p.value).filter(v => v > 0);
    const minVal = Math.min(50, Math.min(...values) - 10);
    const maxVal = Math.max(300, Math.max(...values) + 10);

    function x(time) { return padding.left + ((time - bolusTime) / (endTime - bolusTime)) * chartW; }
    function y(val) { return padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH; }

    // Target zone (70-180)
    ctx.fillStyle = 'rgba(46, 204, 113, 0.07)';
    const y180 = y(180);
    const y70 = y(70);
    ctx.fillRect(padding.left, y180, chartW, y70 - y180);

    // Low zone
    ctx.fillStyle = 'rgba(231, 76, 60, 0.07)';
    ctx.fillRect(padding.left, y70, chartW, y(minVal) - y70);

    // Target lines
    ctx.strokeStyle = chartInk(0.1);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    [70, 180].forEach(v => {
        ctx.beginPath();
        ctx.moveTo(padding.left, y(v));
        ctx.lineTo(W - padding.right, y(v));
        ctx.stroke();
    });
    ctx.setLineDash([]);

    // Y-axis labels
    ctx.fillStyle = chartInk(0.6);
    ctx.font = chartFont(11);
    ctx.textAlign = 'right';
    [70, 150, 250].forEach(v => {
        if (v >= minVal && v <= maxVal) {
            ctx.fillText(v, padding.left - 3, y(v) + 3);
        }
    });

    // X-axis labels (real clock times)
    ctx.textAlign = 'center';
    for (let h = 0; h <= 4; h++) {
        const t = bolusTime + h * 60 * 60 * 1000;
        const dt = new Date(t);
        const lbl = dt.getHours() + ':' + String(dt.getMinutes()).padStart(2, '0');
        ctx.fillText(lbl, x(t), H - 3);
    }

    // Draw glucose line
    ctx.beginPath();
    ctx.strokeStyle = chartLineColor();
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    let started = false;
    points.forEach(p => {
        const val = p.sgv || p.value;
        if (val <= 0) return;
        if (!started) { ctx.moveTo(x(p.date), y(val)); started = true; }
        else ctx.lineTo(x(p.date), y(val));
    });
    ctx.stroke();

    // Color-coded dots
    points.forEach(p => {
        const val = p.sgv || p.value;
        if (val <= 0) return;
        ctx.beginPath();
        ctx.arc(x(p.date), y(val), 1.5, 0, Math.PI * 2);
        ctx.fillStyle = glucosePointColor(val);
        ctx.fill();
    });

    // Start marker (bolus moment)
    ctx.beginPath();
    ctx.strokeStyle = chartInk(0.3);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, H - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
}

function render30DaysTrend() {
    const canvas = $('#trend-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const padding = { top: 20, right: 10, bottom: 30, left: 40 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    // Get active filter
    const filter = $('.meal-filter-row .chip.active')?.dataset?.filter || 'all';

    // Collect 30 days data
    const days = [];
    let d = currentDate;
    for (let i = 0; i < 30; i++) {
        days.unshift(d);
        d = prevDate(d);
    }

    // For each day, calculate average pct
    const dataPoints = [];
    days.forEach((date, i) => {
        const dayData = state[date] || {};
        let totalPct = 0;
        let count = 0;
        const mealsToCheck = filter === 'all' ? MEALS : MEALS.filter(m => m.id === filter);
        mealsToCheck.forEach(m => {
            const md = dayData[m.id];
            if (md && md.foods && md.foods.length > 0) {
                const t = calcMealTotals(md, m.id);
                if (t.totalDueWithCorrection > 0) {
                    totalPct += t.pctGiven;
                    count++;
                }
            }
        });
        if (count > 0) {
            dataPoints.push({ x: i, y: totalPct / count, date });
        }
    });

    if (dataPoints.length === 0) {
        ctx.fillStyle = chartInk(0.6);
        ctx.font = chartFont(14);
        ctx.textAlign = 'center';
        ctx.fillText('Pas de données sur 30 jours', W/2, H/2);
        return;
    }

    // Scales
    const maxPct = Math.max(150, Math.max(...dataPoints.map(p => p.y)));
    function x(idx) { return padding.left + (idx / 29) * chartW; }
    function y(val) { return padding.top + chartH - (val / maxPct) * chartH; }

    // 100% line
    ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y(100));
    ctx.lineTo(W - padding.right, y(100));
    ctx.stroke();
    ctx.setLineDash([]);

    // Grid
    ctx.fillStyle = chartInk(0.6);
    ctx.font = chartFont(12);
    ctx.textAlign = 'right';
    [50, 100, 150].forEach(v => {
        if (v <= maxPct) ctx.fillText(v + '%', padding.left - 4, y(v) + 3);
    });

    // Data line
    ctx.beginPath();
    ctx.strokeStyle = chartLineColor();
    ctx.lineWidth = 2;
    dataPoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(x(p.x), y(p.y));
        else ctx.lineTo(x(p.x), y(p.y));
    });
    ctx.stroke();

    // Dots
    dataPoints.forEach(p => {
        ctx.beginPath();
        ctx.arc(x(p.x), y(p.y), 4, 0, Math.PI * 2);
        ctx.fillStyle = isLightTheme()
            ? (p.y < 80 ? '#c02717' : p.y > 120 ? '#8a5a00' : '#157a3a')
            : (p.y < 80 ? '#e74c3c' : p.y > 120 ? '#f39c12' : '#2ecc71');
        ctx.fill();
    });

    // Day labels
    ctx.fillStyle = chartInk(0.6);
    ctx.font = chartFont(11);
    ctx.textAlign = 'center';
    [0, 7, 14, 21, 29].forEach(i => {
        const date = days[i];
        if (date) {
            const parts = date.split('-');
            ctx.fillText(`${parts[2]}/${parts[1]}`, x(i), H - 5);
        }
    });

    // 30-day detail table
    const container = $('#dashboard-30days');
    if (container) {
        const mealsToShow = filter === 'all' ? MEALS : MEALS.filter(m => m.id === filter);
        let tableHtml = '<div style="margin-top:12px">';
        // Average per meal type over 30 days
        mealsToShow.forEach(m => {
            let total = 0, count = 0;
            days.forEach(date => {
                const md = state[date]?.[m.id];
                if (md && md.foods && md.foods.length > 0) {
                    const t = calcMealTotals(md, m.id);
                    if (t.totalDueWithCorrection > 0) {
                        total += t.pctGiven;
                        count++;
                    }
                }
            });
            const avg = count > 0 ? Math.round(total / count) : 0;
            const color = avg === 0 ? 'var(--text-dim)' : avg < 80 ? 'var(--danger)' : avg > 120 ? 'var(--warning)' : 'var(--success)';
            tableHtml += `<div class="dashboard-meal-row">
                <span class="dashboard-meal-name">${m.label}</span>
                <div class="dashboard-pct-bar"><div class="dashboard-pct-fill ${avg < 80 ? 'pct-low' : avg > 120 ? 'pct-high' : 'pct-ok'}" style="width:${Math.min(avg, 150)}%"></div></div>
                <span class="dashboard-pct-value" style="color:${color}">${count > 0 ? avg + '%' : '-'}</span>
            </div>`;
        });
        tableHtml += '</div>';
        container.innerHTML = tableHtml;
    }
}

// ============================================================
// FOOD LIST (Foods Tab)
// ============================================================
let foodDeleteMode = false;
const foodDeleteSelection = new Set();

function renderFoodList(query) {
    const list = $('#food-list');
    if (!list) return;
    const filtered = query ? foods.filter(f => f.n.toLowerCase().includes(query.toLowerCase())) : foods;
    const display = filtered.slice(0, 100);
    list.innerHTML = display.map(f => {
        const esc = f.n.replace(/"/g, '&quot;');
        const checkbox = foodDeleteMode
            ? `<input type="checkbox" class="food-del-check" data-name="${esc}" ${foodDeleteSelection.has(f.n) ? 'checked' : ''}>`
            : '';
        return `<div class="food-list-item">
            ${checkbox}
            <span class="food-name">${f.n}</span>
            <span class="food-carbs">${f.g}g</span>
            <span class="food-sugar">${f.s}g sucre</span>
        </div>`;
    }).join('');
    if (filtered.length > 100) {
        list.innerHTML += `<div style="padding:10px;text-align:center;color:var(--text-dim);font-size:calc(13px * var(--fs, 1))">${filtered.length - 100} autres résultats...</div>`;
    }
}

function exitFoodDeleteMode() {
    foodDeleteMode = false;
    foodDeleteSelection.clear();
    $('#btn-food-delete-mode')?.classList.remove('delete-armed');
    renderFoodList($('#food-search')?.value || '');
}

function toggleFoodDeleteMode() {
    if (!foodDeleteMode) {
        foodDeleteMode = true;
        foodDeleteSelection.clear();
        $('#btn-food-delete-mode')?.classList.add('delete-armed');
        renderFoodList($('#food-search')?.value || '');
        toast('Cochez les aliments à supprimer puis appuyez à nouveau sur la poubelle');
        return;
    }
    if (foodDeleteSelection.size === 0) {
        exitFoodDeleteMode();
        toast('Aucun aliment sélectionné');
        return;
    }
    const n = foodDeleteSelection.size;
    if (confirm(`Supprimer définitivement ${n} aliment${n > 1 ? 's' : ''} ?`)) {
        deleteFoods([...foodDeleteSelection]);
        exitFoodDeleteMode();
        toast(`${n} aliment${n > 1 ? 's' : ''} supprimé${n > 1 ? 's' : ''}`);
    }
}

// ============================================================
// SETTINGS
// ============================================================
function renderSettings() {
    const container = $('#settings-meals');
    if (!container) return;
    container.innerHTML = MEALS.map(m => {
        const p = settings[m.id] || {};
        return `<div class="settings-meal-block">
            <h5>${m.icon} ${m.label}</h5>
            <div class="settings-meal-params">
                <div class="input-group">
                    <label>Ratio</label>
                    <input type="number" class="setting-ratio" data-meal="${m.id}" value="${p.ratio || m.defaultRatio}" inputmode="numeric" autocomplete="off">
                </div>
                <div class="input-group">
                    <label>Sensibilité</label>
                    <input type="number" class="setting-sensitivity" data-meal="${m.id}" value="${p.sensitivity || m.defaultSensitivity}" inputmode="numeric" autocomplete="off">
                </div>
                <div class="input-group">
                    <label>Cible</label>
                    <input type="number" class="setting-target" data-meal="${m.id}" value="${p.target || m.defaultTarget}" inputmode="numeric" autocomplete="off">
                </div>
            </div>
        </div>`;
    }).join('');

    $('#settings-ns-url').value = settings.nightscoutUrl || '';
    $('#settings-ns-token').value = settings.nightscoutToken || '';
    $('#settings-gh-token').value = settings.ghToken || '';
    $('#settings-gist-id').value = settings.gistId || '';
    updateThemeButtons();
    updateFontSizeButtons();
}

function saveSettingsFromUI() {
    MEALS.forEach(m => {
        const ratio = $(`.setting-ratio[data-meal="${m.id}"]`)?.value;
        const sensitivity = $(`.setting-sensitivity[data-meal="${m.id}"]`)?.value;
        const target = $(`.setting-target[data-meal="${m.id}"]`)?.value;
        if (!settings[m.id]) settings[m.id] = {};
        settings[m.id].ratio = parseInt(ratio) || m.defaultRatio;
        settings[m.id].sensitivity = parseInt(sensitivity) || m.defaultSensitivity;
        settings[m.id].target = parseInt(target) || m.defaultTarget;
    });
    settings.nightscoutUrl = $('#settings-ns-url').value.trim();
    settings.nightscoutToken = $('#settings-ns-token').value.trim();
    settings.ghToken = $('#settings-gh-token').value.trim();
    settings.gistId = $('#settings-gist-id').value.trim();
    saveSettings();
    toast('Paramètres sauvegardés');
    renderMeal();
}

// ============================================================
// GITHUB GIST SYNC
// ============================================================
// ============================================================
// QR CODE CONFIG SHARING
// ============================================================
const _QR_KEY = 'F0ll0wD1A_2024_QR';

async function _qrDeriveKey() {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(_QR_KEY), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode('followdia_qr_salt'), iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function qrEncryptConfig() {
    const config = {
        nightscoutUrl: settings.nightscoutUrl || '',
        nightscoutToken: settings.nightscoutToken || '',
        ghToken: settings.ghToken || '',
        gistId: settings.gistId || ''
    };
    const key = await _qrDeriveKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(config));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    // Combine iv + ciphertext, encode as base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
}

async function qrDecryptConfig(b64) {
    const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await _qrDeriveKey();
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(decrypted));
}

async function qrApplyConfig(config) {
    if (config.nightscoutUrl) { settings.nightscoutUrl = config.nightscoutUrl; $('#settings-ns-url').value = config.nightscoutUrl; }
    if (config.nightscoutToken) { settings.nightscoutToken = config.nightscoutToken; $('#settings-ns-token').value = config.nightscoutToken; }
    if (config.ghToken) { settings.ghToken = config.ghToken; $('#settings-gh-token').value = config.ghToken; }
    if (config.gistId) { settings.gistId = config.gistId; $('#settings-gist-id').value = config.gistId; }
    saveSettings();
    toast('Configuration importée avec succès');
}

function qrShowModal(title) {
    const modal = $('#qr-modal');
    $('#qr-modal-title').textContent = title;
    $('#qr-display').innerHTML = '';
    $('#qr-scanner-container').classList.add('hidden');
    $('#qr-message').textContent = '';
    modal.classList.remove('hidden');
}

function qrHideModal() {
    $('#qr-modal').classList.add('hidden');
    qrStopScanner();
}

async function qrGenerate() {
    if (!settings.nightscoutUrl && !settings.ghToken) {
        toast('Aucune configuration à partager');
        return;
    }
    qrShowModal('QR Code de configuration');
    $('#qr-message').textContent = 'Génération...';
    try {
        const encrypted = await qrEncryptConfig();
        const payload = 'FDIA:' + encrypted;
        const qr = qrcode(0, 'M');
        qr.addData(payload);
        qr.make();
        const container = $('#qr-display');
        const modules = qr.getModuleCount();
        const size = Math.min(300, window.innerWidth - 60);
        const cellSize = Math.max(3, Math.floor(size / modules));
        // Render as canvas for better scanning
        const cvs = document.createElement('canvas');
        const totalSize = cellSize * modules + 8; // 4px quiet zone each side
        cvs.width = totalSize;
        cvs.height = totalSize;
        cvs.style.width = totalSize + 'px';
        cvs.style.height = totalSize + 'px';
        cvs.style.borderRadius = '8px';
        const cx = cvs.getContext('2d');
        cx.fillStyle = '#ffffff';
        cx.fillRect(0, 0, totalSize, totalSize);
        cx.fillStyle = '#000000';
        for (let r = 0; r < modules; r++) {
            for (let c = 0; c < modules; c++) {
                if (qr.isDark(r, c)) {
                    cx.fillRect(4 + c * cellSize, 4 + r * cellSize, cellSize, cellSize);
                }
            }
        }
        container.appendChild(cvs);
        $('#qr-message').textContent = 'Scannez ce QR code depuis l\'autre appareil';
    } catch (e) {
        console.error('QR generate error:', e);
        $('#qr-message').textContent = 'Erreur : ' + e.message;
    }
}

let _qrScanStream = null;
let _qrScanRAF = null;

function qrStopScanner() {
    if (_qrScanStream) {
        _qrScanStream.getTracks().forEach(t => t.stop());
        _qrScanStream = null;
    }
    if (_qrScanRAF) {
        cancelAnimationFrame(_qrScanRAF);
        _qrScanRAF = null;
    }
}

async function qrScan() {
    if (typeof jsQR !== 'function') {
        toast('Librairie jsQR non chargée. Vérifiez votre connexion.');
        return;
    }
    qrShowModal('Scanner un QR Code');
    $('#qr-scanner-container').classList.remove('hidden');
    $('#qr-message').textContent = 'Démarrage de la caméra...';

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        _qrScanStream = stream;
        const video = $('#qr-video');
        video.srcObject = stream;
        await video.play();

        // Wait for video to have actual dimensions
        await new Promise(resolve => {
            const check = () => {
                if (video.videoWidth > 0 && video.videoHeight > 0) resolve();
                else setTimeout(check, 100);
            };
            check();
        });

        const scanCanvas = document.createElement('canvas');
        const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
        let scanCount = 0;

        function scan() {
            if (!_qrScanStream) return;
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                scanCanvas.width = video.videoWidth;
                scanCanvas.height = video.videoHeight;
                scanCtx.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);
                const imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
                scanCount++;
                if (scanCount % 30 === 0) {
                    $('#qr-message').textContent = `Scan en cours... (${video.videoWidth}x${video.videoHeight}) Pointez vers le QR code`;
                }
                if (code) {
                    if (code.data.startsWith('FDIA:')) {
                        qrStopScanner();
                        qrProcessPayload(code.data);
                        return;
                    } else {
                        $('#qr-message').textContent = 'QR code détecté mais ce n\'est pas un code FollowDIA';
                    }
                }
            }
            _qrScanRAF = requestAnimationFrame(scan);
        }

        $('#qr-message').textContent = 'Pointez vers le QR code...';
        _qrScanRAF = requestAnimationFrame(scan);
    } catch (e) {
        console.error('Camera error:', e);
        $('#qr-message').textContent = 'Impossible d\'accéder à la caméra : ' + e.message;
    }
}

async function qrFromImage() {
    $('#qr-file-input').click();
}

async function qrProcessImageFile(file) {
    qrShowModal('Lecture du QR Code...');
    $('#qr-message').textContent = 'Analyse de l\'image...';
    try {
        const img = new Image();
        const url = URL.createObjectURL(file);
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
        if (code) {
            if (code.data.startsWith('FDIA:')) {
                await qrProcessPayload(code.data);
            } else {
                $('#qr-message').textContent = 'QR code trouvé mais ce n\'est pas un code FollowDIA';
            }
        } else {
            $('#qr-message').textContent = `Aucun QR code détecté (image ${canvas.width}x${canvas.height})`;
        }
    } catch (e) {
        console.error('QR image error:', e);
        $('#qr-message').textContent = 'Erreur : ' + e.message;
    }
}

async function qrProcessPayload(data) {
    try {
        const b64 = data.substring(5); // Remove 'FDIA:' prefix
        const config = await qrDecryptConfig(b64);
        await qrApplyConfig(config);
        qrHideModal();
    } catch (e) {
        console.error('QR decrypt error:', e);
        $('#qr-message').textContent = 'QR code invalide ou non reconnu';
    }
}

// ============================================================
// SYNC - Automatic bidirectional GitHub Gist sync
// ============================================================
let _syncInProgress = false;
let _syncPushTimer = null;

async function syncToGist() {
    const token = settings.ghToken;
    if (!token || _syncInProgress) return;

    _syncInProgress = true;
    updateSyncIcon('syncing');

    try {
        // Pull-merge-push: pull remote first, merge, then push merged result
        if (settings.gistId) {
            // 1. Pull remote data
            const pullResp = await fetch(`https://api.github.com/gists/${settings.gistId}`, {
                headers: { 'Authorization': `token ${token}` }
            });
            if (pullResp.ok) {
                const gist = await pullResp.json();
                const content = gist.files['followdia_data.json']?.content;
                if (content) {
                    const remote = JSON.parse(content);
                    // Merge remote into local (remote wins if more recent)
                    if (remote.data) {
                        mergeRemoteData(remote.data);
                    }
                    await mergeCustomFoods(remote.customFoods);
                    await mergeDeletedFoods(remote.deletedFoods);
                }
            }

            // 2. Push merged state
            const payload = buildSyncPayload();
            const resp = await fetch(`https://api.github.com/gists/${settings.gistId}`, {
                method: 'PATCH',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: { 'followdia_data.json': { content: JSON.stringify(payload) } } })
            });
            if (!resp.ok) throw new Error(`Push failed: ${resp.status}`);
        } else {
            // First sync: create new gist
            const payload = buildSyncPayload();
            const resp = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: 'FollowDIA - Données de suivi diabète',
                    public: false,
                    files: { 'followdia_data.json': { content: JSON.stringify(payload) } }
                })
            });
            if (!resp.ok) throw new Error(`Create failed: ${resp.status}`);
            const data = await resp.json();
            settings.gistId = data.id;
            saveSettings();
            if ($('#settings-gist-id')) $('#settings-gist-id').value = data.id;
        }
        updateSyncIcon('ok');
    } catch(e) {
        console.error('Sync push error:', e);
        updateSyncIcon('error');
    } finally {
        _syncInProgress = false;
    }
}

function buildSyncPayload() {
    const payload = {
        data: state,
        settings: { ...settings },
        customFoods: JSON.parse(localStorage.getItem('followdia_custom_foods') || '[]'),
        deletedFoods: {
            names: getDeletedFoods(),
            lastModified: localStorage.getItem('followdia_deleted_foods_ts') || null
        },
        lastSync: new Date().toISOString()
    };
    delete payload.settings.ghToken;
    return payload;
}

function getMealTimestamp(mealData) {
    // Use lastModified for comparison (most accurate), fallback to timestamp
    return mealData.lastModified || mealData.timestamp || null;
}

function mergeRemoteData(remoteData) {
    if (!remoteData || typeof remoteData !== 'object' || Array.isArray(remoteData)) return;
    Object.keys(remoteData).forEach(date => {
        if (!state[date]) {
            state[date] = remoteData[date];
        } else {
            Object.keys(remoteData[date]).forEach(meal => {
                const remote = remoteData[date][meal];
                const local = state[date][meal];
                if (!local) {
                    state[date][meal] = remote;
                } else if (remote) {
                    const remoteTs = getMealTimestamp(remote);
                    const localTs = getMealTimestamp(local);
                    if (remoteTs && localTs) {
                        if (new Date(remoteTs) > new Date(localTs)) {
                            state[date][meal] = remote;
                        }
                    } else if (remoteTs && !localTs) {
                        state[date][meal] = remote;
                    }
                }
            });
        }
    });
    sanitizeState();
    saveState();
}

// Deleted-foods blacklist: most recent version wins entirely, so both
// deletions and re-additions propagate across devices
async function mergeDeletedFoods(remote) {
    if (!remote || !Array.isArray(remote.names)) return;
    const localTs = localStorage.getItem('followdia_deleted_foods_ts');
    const remoteTs = remote.lastModified;
    const adopt = remoteTs && (!localTs || new Date(remoteTs) > new Date(localTs));
    if (!adopt) return;
    const localNames = getDeletedFoods();
    const same = localNames.length === remote.names.length && remote.names.every(n => localNames.includes(n));
    localStorage.setItem('followdia_deleted_foods_ts', remoteTs);
    if (same) return;
    localStorage.setItem('followdia_deleted_foods', JSON.stringify(remote.names));
    await loadFoods();
    renderFoodList($('#food-search')?.value || '');
}

async function mergeCustomFoods(remoteFoods) {
    if (!Array.isArray(remoteFoods) || remoteFoods.length === 0) return;
    const validRemote = remoteFoods.filter(isValidFood);
    if (validRemote.length === 0) return;
    const localFoods = getCustomFoods();
    const localNames = new Set(localFoods.map(f => f.n.toLowerCase()));
    const newFoods = validRemote.filter(f => !localNames.has(f.n.toLowerCase()));
    if (newFoods.length > 0) {
        const merged = [...localFoods, ...newFoods];
        localStorage.setItem('followdia_custom_foods', JSON.stringify(merged));
        await loadFoods();
    }
}

// Debounced push: wait 3s after last change before pushing
function scheduleSyncPush() {
    if (!settings.ghToken) return;
    clearTimeout(_syncPushTimer);
    _syncPushTimer = setTimeout(() => syncToGist(), 3000);
}

async function syncFromGist(showToast) {
    const token = settings.ghToken;
    const gistId = settings.gistId;
    if (!token || !gistId) {
        if (showToast) toast('Configurez GitHub dans les paramètres');
        return;
    }
    if (_syncInProgress) return;

    _syncInProgress = true;
    updateSyncIcon('syncing');

    try {
        const resp = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
        const gist = await resp.json();
        const content = gist.files['followdia_data.json']?.content;
        if (!content) throw new Error('No data file in gist');
        const payload = JSON.parse(content);

        let changed = false;

        // Smart merge using lastModified/timestamp
        if (payload.data) {
            const stateBefore = JSON.stringify(state);
            mergeRemoteData(payload.data);
            changed = JSON.stringify(state) !== stateBefore;
        }

        // Merge custom foods (union)
        if (payload.customFoods) {
            await mergeCustomFoods(payload.customFoods);
        }

        // Merge deleted-foods blacklist (newest wins)
        await mergeDeletedFoods(payload.deletedFoods);

        // Merge Nightscout settings if not set locally
        if (payload.settings) {
            if (!settings.nightscoutUrl && payload.settings.nightscoutUrl) {
                settings.nightscoutUrl = payload.settings.nightscoutUrl;
                settings.nightscoutToken = payload.settings.nightscoutToken || '';
                saveSettings();
            }
            // Merge meal params from remote if they differ from defaults
            MEALS.forEach(m => {
                if (payload.settings[m.id]) {
                    if (!settings[m.id]) settings[m.id] = {};
                    ['ratio', 'sensitivity', 'target', 'wantPct'].forEach(k => {
                        if (payload.settings[m.id][k] != null && settings[m.id][k] === m['default' + k.charAt(0).toUpperCase() + k.slice(1)]) {
                            settings[m.id][k] = payload.settings[m.id][k];
                        }
                    });
                }
            });
            saveSettings();
        }

        if (changed) {
            renderMeal();
            updateMealTabs();
            // Push merged state back to Gist so all devices converge
            const pushPayload = buildSyncPayload();
            const pushResp = await fetch(`https://api.github.com/gists/${gistId}`, {
                method: 'PATCH',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: { 'followdia_data.json': { content: JSON.stringify(pushPayload) } } })
            });
            if (!pushResp.ok) console.warn('Push-back after merge failed:', pushResp.status);
        }

        updateSyncIcon('ok');
        if (showToast) toast(changed ? 'Données synchronisées' : 'Déjà à jour');
    } catch(e) {
        console.error('Sync pull error:', e);
        updateSyncIcon('error');
        if (showToast) toast('Erreur de synchronisation');
    } finally {
        _syncInProgress = false;
    }
}

function updateSyncIcon(status) {
    const btn = $('#btn-sync');
    if (!btn) return;
    btn.classList.remove('sync-ok', 'sync-error', 'sync-syncing');
    if (status === 'syncing') btn.classList.add('sync-syncing');
    else if (status === 'ok') { btn.classList.add('sync-ok'); setTimeout(() => btn.classList.remove('sync-ok'), 3000); }
    else if (status === 'error') { btn.classList.add('sync-error'); setTimeout(() => btn.classList.remove('sync-error'), 5000); }
}

// ============================================================
// INIT
// ============================================================
function updateDateDisplay() {
    $('#current-date').textContent = formatDate(currentDate);
}

async function checkForUpdate(silent) {
    try {
        const resp = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.version && data.version !== APP_VERSION) {
            if (silent) {
                toast('Nouvelle version disponible ! Rechargement...');
                setTimeout(() => forceUpdate(), 1500);
            } else {
                forceUpdate();
            }
        } else if (!silent) {
            toast('Application à jour (v' + APP_VERSION + ')');
        }
    } catch (e) {
        if (!silent) toast('Impossible de vérifier les mises à jour');
    }
}

function forceUpdate() {
    // Unregister SW, clear all caches, then hard reload
    const swPromise = ('serviceWorker' in navigator)
        ? navigator.serviceWorker.getRegistrations().then(regs => Promise.all(regs.map(r => r.unregister())))
        : Promise.resolve();
    const cachePromise = ('caches' in window)
        ? caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
        : Promise.resolve();
    Promise.all([swPromise, cachePromise]).then(() => {
        window.location.href = 'index.html?v=' + Date.now();
    });
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(reg => {
            // Check for SW update when we detect a new app version
            reg.addEventListener('updatefound', () => {
                const newSW = reg.installing;
                newSW.addEventListener('statechange', () => {
                    if (newSW.state === 'activated') {
                        console.log('Service Worker updated');
                    }
                });
            });
        }).catch(err => console.warn('SW registration failed:', err));
    }
}

async function initApp() {
    registerServiceWorker();
    loadState();
    loadSettings();
    applyTheme(settings.theme || 'dark');
    applyFontSize(settings.fontSize || 'petit');
    await loadFoods();
    updateDateDisplay();
    renderMeal();
    updateMealTabs();
    renderFoodList('');
    fetchGlucose();

    // Auto-sync from Gist on startup (silent)
    if (settings.ghToken && settings.gistId) {
        syncFromGist(false);
    }

    // Periodic sync every 2 minutes
    setInterval(() => {
        if (settings.ghToken && settings.gistId) {
            syncFromGist(false);
        }
    }, 120000);

    // Tab navigation
    $$('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.nav-tab').forEach(t => t.classList.remove('active'));
            $$('.tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            $(`#tab-${tab.dataset.tab}`).classList.add('active');
            sessionStorage.setItem('followdia_active_tab', tab.dataset.tab);
            if (tab.dataset.tab === 'dashboard') renderDashboard();
            if (tab.dataset.tab === 'glucose') { fetchGlucose(); setTimeout(() => { renderGlucoseChart(); _initGlucoseChartGestures(); }, 100); }
            if (tab.dataset.tab === 'foods') renderFoodList('');
            // Show/hide save bar
            const saveBar = document.getElementById('save-bar');
            if (saveBar) saveBar.style.display = tab.dataset.tab === 'meals' ? 'flex' : 'none';
        });
    });

    // Restore previously active tab after page reload (e.g. pull-to-refresh)
    const savedTab = sessionStorage.getItem('followdia_active_tab');
    if (savedTab && savedTab !== 'meals') {
        const tabBtn = document.querySelector(`.nav-tab[data-tab="${savedTab}"]`);
        if (tabBtn) tabBtn.click();
    }

    // Meal tabs
    $$('.meal-tab[data-meal]').forEach(tab => {
        tab.addEventListener('click', () => {
            currentMeal = tab.dataset.meal;
            updateMealTabs();
            renderMeal();
        });
    });

    // Settings
    $('#btn-settings').addEventListener('click', () => {
        renderSettings();
        $('#settings-modal').classList.remove('hidden');
    });

    $$('#settings-modal .modal-close, #settings-modal .modal-overlay').forEach(el => {
        el.addEventListener('click', () => $('#settings-modal').classList.add('hidden'));
    });

    $('#btn-save-settings').addEventListener('click', () => {
        saveSettingsFromUI();
        $('#settings-modal').classList.add('hidden');
    });

    // Theme buttons (applied immediately, no need to press save)
    $('#btn-theme-dark').addEventListener('click', () => setTheme('dark'));
    $('#btn-theme-light').addEventListener('click', () => setTheme('light'));

    // Font size buttons (applied immediately)
    $$('.fs-btn').forEach(b => b.addEventListener('click', () => setFontSize(b.dataset.fs)));

    // Force update button
    $('#btn-force-update').addEventListener('click', () => checkForUpdate(false));
    const verEl = $('#app-version-display');
    if (verEl) verEl.textContent = 'Version : ' + APP_VERSION;

    // Check for updates silently on startup (after 5s)
    setTimeout(() => checkForUpdate(true), 5000);

    // QR code buttons
    $('#btn-qr-generate').addEventListener('click', qrGenerate);
    $('#btn-qr-scan').addEventListener('click', qrScan);
    $('#btn-qr-image').addEventListener('click', qrFromImage);
    $('#qr-file-input').addEventListener('change', e => {
        if (e.target.files[0]) qrProcessImageFile(e.target.files[0]);
        e.target.value = '';
    });
    $$('#qr-modal .modal-close, #qr-modal .modal-overlay').forEach(el => {
        el.addEventListener('click', qrHideModal);
    });

    // Sync button
    $('#btn-sync').addEventListener('click', async () => {
        await syncFromGist(true);
        // Also push local state so remote has latest merged data
        if (settings.ghToken && settings.gistId && !_syncInProgress) {
            await syncToGist();
        }
    });

    // Food search
    $('#food-search')?.addEventListener('input', e => renderFoodList(e.target.value));

    // Food delete mode
    $('#btn-food-delete-mode').addEventListener('click', toggleFoodDeleteMode);
    $('#food-list').addEventListener('change', e => {
        if (e.target.classList.contains('food-del-check')) {
            const name = e.target.dataset.name;
            if (e.target.checked) foodDeleteSelection.add(name);
            else foodDeleteSelection.delete(name);
        }
    });

    // Add food modal
    $('#btn-add-food').addEventListener('click', () => $('#food-modal').classList.remove('hidden'));
    $$('#food-modal .modal-close, #food-modal .modal-overlay').forEach(el => {
        el.addEventListener('click', () => $('#food-modal').classList.add('hidden'));
    });

    $('#btn-save-food').addEventListener('click', () => {
        const name = $('#new-food-name').value.trim();
        const carbs = parseFloat($('#new-food-carbs').value) || 0;
        const sugar = parseFloat($('#new-food-sugar').value) || 0;
        if (!name) { toast('Entrez un nom'); return; }
        const customFoods = JSON.parse(localStorage.getItem('followdia_custom_foods') || '[]');
        customFoods.push({ n: name, g: carbs, s: sugar });
        localStorage.setItem('followdia_custom_foods', JSON.stringify(customFoods));
        // Un-blacklist if this food was previously deleted
        const deletedBefore = getDeletedFoods();
        const deletedAfter = deletedBefore.filter(n => n !== name.toLowerCase());
        if (deletedAfter.length !== deletedBefore.length) setDeletedFoods(deletedAfter);
        scheduleSyncPush();
        foods.push({ n: name, g: carbs, s: sugar });
        foods.sort((a,b) => a.n.localeCompare(b.n, 'fr'));
        $('#food-modal').classList.add('hidden');
        renderFoodList('');
        toast(`${name} ajouté`);
    });

    // Dashboard filter chips
    $$('.meal-filter-row .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            $$('.meal-filter-row .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            render30DaysTrend();
        });
    });

}

// ============================================================
// FAILSAFE — never leave a silent blank screen again: uncaught
// errors show a banner with a local-data reset button
// ============================================================
function showFatalError(msg) {
    let el = document.getElementById('fatal-error-bar');
    if (!el) {
        el = document.createElement('div');
        el.id = 'fatal-error-bar';
        el.innerHTML = `
            <div class="fatal-msg"></div>
            <div class="fatal-actions">
                <button id="fatal-reload" class="btn btn-secondary">Recharger</button>
                <button id="fatal-reset" class="btn btn-danger">Réinitialiser les données locales</button>
            </div>`;
        document.body.appendChild(el);
        el.querySelector('#fatal-reload').addEventListener('click', () => location.reload());
        el.querySelector('#fatal-reset').addEventListener('click', () => {
            if (confirm('Effacer toutes les données FollowDIA de cet appareil ? Les données présentes sur le Gist seront retéléchargées à la prochaine synchronisation.')) {
                Object.keys(localStorage)
                    .filter(k => k.startsWith('followdia_'))
                    .forEach(k => localStorage.removeItem(k));
                location.reload();
            }
        });
    }
    el.querySelector('.fatal-msg').textContent = msg;
}

window.addEventListener('error', e => {
    if (e && e.message) showFatalError('Erreur : ' + e.message);
});
window.addEventListener('unhandledrejection', e => {
    const msg = e && e.reason ? (e.reason.message || String(e.reason)) : 'inconnue';
    showFatalError('Erreur : ' + msg);
});

// Boot
document.addEventListener('DOMContentLoaded', () => {
    // Nettoyage des clés de l'ancienne authentification locale
    localStorage.removeItem('followdia_pw_hash');
    sessionStorage.removeItem('followdia_auth');
    initApp();
});
