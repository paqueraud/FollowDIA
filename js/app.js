/* FollowDIA - Main Application */
'use strict';

// ============================================================
// CONSTANTS
// ============================================================
const MEALS = [
    { id: 'petitdej', label: 'Petit-déj', time: '07:30', icon: '🌅', defaultRatio: 12, defaultSensitivity: 150, defaultTarget: 150, defaultWantPct: 60 },
    { id: 'dejeuner', label: 'Déjeuner', time: '12:00', icon: '☀️', defaultRatio: 22, defaultSensitivity: 150, defaultTarget: 150, defaultWantPct: 50 },
    { id: 'gouter', label: 'Goûter', time: '16:45', icon: '🍪', defaultRatio: 20, defaultSensitivity: 150, defaultTarget: 150, defaultWantPct: 85 },
    { id: 'diner', label: 'Dîner', time: '19:00', icon: '🌙', defaultRatio: 26, defaultSensitivity: 150, defaultTarget: 150, defaultWantPct: 85 }
];

const TRENDS = ['↑↑', '↑', '↗', '→', '↘', '↓', '↓↓'];
const TREND_OFFSETS = { '↑↑': 90, '↑': 60, '↗': 30, '→': 0, '↘': -30, '↓': -60, '↓↓': -90 };

// ============================================================
// STATE
// ============================================================
let foods = [];
let currentDate = todayStr();
let currentMeal = 'petitdej';
let state = {}; // { '2026-03-22': { petitdej: { ... }, dejeuner: { ... }, ... } }
let settings = {};
let glucoseData = [];

// ============================================================
// UTILS
// ============================================================
function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
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
// AUTH
// ============================================================
function initAuth() {
    const hasPassword = localStorage.getItem('followdia_pw_hash');
    if (!hasPassword) {
        $('#auth-form').classList.add('hidden');
        $('#auth-setup').classList.remove('hidden');
    }

    $('#auth-form').addEventListener('submit', async e => {
        e.preventDefault();
        const pw = $('#auth-password').value;
        const hash = await hashPassword(pw);
        if (hash === localStorage.getItem('followdia_pw_hash')) {
            sessionStorage.setItem('followdia_auth', '1');
            showApp();
        } else {
            $('#auth-error').textContent = 'Mot de passe incorrect';
            $('#auth-error').classList.remove('hidden');
        }
    });

    $('#setup-form').addEventListener('submit', async e => {
        e.preventDefault();
        const pw = $('#setup-password').value;
        const confirm = $('#setup-confirm').value;
        if (pw !== confirm) {
            $('#setup-error').textContent = 'Les mots de passe ne correspondent pas';
            $('#setup-error').classList.remove('hidden');
            return;
        }
        if (pw.length < 4) {
            $('#setup-error').textContent = 'Minimum 4 caractères';
            $('#setup-error').classList.remove('hidden');
            return;
        }
        const hash = await hashPassword(pw);
        localStorage.setItem('followdia_pw_hash', hash);
        sessionStorage.setItem('followdia_auth', '1');
        showApp();
    });
}

async function hashPassword(pw) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pw + 'followdia_salt_2024');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function showApp() {
    $('#auth-screen').classList.remove('active');
    $('#app-screen').classList.add('active');
    initApp();
}

// ============================================================
// STORAGE
// ============================================================
function loadState() {
    try {
        state = JSON.parse(localStorage.getItem('followdia_data') || '{}');
    } catch { state = {}; }
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
            wantPct: settings[mealId]?.wantPct || 100,
            timestamp: null,
            shape: 5,
            sensorCathChange: ''
        };
    }
    // Ensure at least one food entry exists
    if (!state[date][mealId].foods || state[date][mealId].foods.length === 0) {
        state[date][mealId].foods = [{ name: '', massServed: null, massRemaining: null }];
    }
    return state[date][mealId];
}

// ============================================================
// FOOD DATABASE
// ============================================================
async function loadFoods() {
    try {
        const userFoods = JSON.parse(localStorage.getItem('followdia_custom_foods') || '[]');
        const resp = await fetch('foods.json');
        const baseFoods = await resp.json();
        foods = [...baseFoods, ...userFoods].sort((a,b) => a.n.localeCompare(b.n, 'fr'));
    } catch(e) {
        console.error('Failed to load foods:', e);
        foods = JSON.parse(localStorage.getItem('followdia_custom_foods') || '[]');
    }
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

    // Bolus given
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

    // Total bolus with correction given
    const totalGivenWithCorrection = totalBolusGivenUI + (parseFloat(mealData.correctionGiven) || 0);
    const totalDueWithCorrection = totalBolusDue;

    const pctGiven = totalDueWithCorrection > 0 ? (totalGivenWithCorrection / totalDueWithCorrection) * 100 : 0;

    // Remaining based on wantPct
    const wantPct = mealData.wantPct || 100;
    const wantedUI = (mealBolusUI * wantPct / 100);
    const remainingUI = wantedUI - totalBolusGivenUI;
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
        remainingUI: round2(remainingUI),
        remainingCarbs: round2(remainingCarbs),
        wantPct,
        ratio
    };
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

    // Correction section
    const correctionHtml = `
    <div class="correction-section">
        <h4>Bolus de correction</h4>
        <div class="correction-row">
            <div class="input-group">
                <label>Glycémie (mg/dl)</label>
                <div style="display:flex;gap:4px;align-items:center">
                    <input type="number" id="meal-glucose" value="${mealData.glucose || ''}" placeholder="--" inputmode="numeric" style="flex:1">
                    <button type="button" id="btn-fetch-cgm" class="btn btn-secondary" style="padding:6px 10px;font-size:12px;white-space:nowrap" title="Récupérer depuis le capteur">CGM</button>
                </div>
            </div>
            <div class="input-group">
                <label>Insuline active (UI)</label>
                <input type="number" id="meal-active-insulin" value="${mealData.activeInsulin || ''}" step="0.1" placeholder="0" inputmode="decimal">
            </div>
        </div>
        <div class="input-group">
            <label>Tendance</label>
            <div class="trend-selector">
                ${TRENDS.map(t => `<button class="trend-btn ${mealData.trend === t ? 'active' : ''}" data-trend="${t}">${t}</button>`).join('')}
            </div>
        </div>
        <div class="correction-result">
            <span class="label">Correction recommandée</span>
            <span class="value" id="correction-value">${totals.correction.safe > 0 ? round1(totals.correction.safe) + ' UI' : '-'}</span>
        </div>
        <div class="correction-row" style="margin-top:8px">
            <div class="input-group">
                <label>Correction réellement faite (UI)</label>
                <input type="number" id="meal-correction-given" value="${mealData.correctionGiven || ''}" step="0.1" placeholder="0" inputmode="decimal">
            </div>
            <div></div>
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
                    <input type="number" class="food-served" value="${f.massServed != null ? f.massServed : ''}" placeholder="0" data-index="${i}" inputmode="decimal" step="0.1">
                </div>
                <div class="input-group">
                    <label>Masse restante (g)</label>
                    <input type="number" class="food-remaining" value="${f.massRemaining != null ? f.massRemaining : ''}" placeholder="0" data-index="${i}" inputmode="decimal" step="0.1">
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
            <div class="bolus-step-label">1er bolus (début de repas)</div>
            <div class="bolus-step-row">
                <div class="input-group">
                    <label>Glucides (g)</label>
                    <input type="number" id="bolus1-carbs" value="${mealData.bolus1_carbs != null ? mealData.bolus1_carbs : ''}" placeholder="glucides" inputmode="decimal" step="0.1">
                </div>
                <div class="input-group">
                    <label>UI (si différent)</label>
                    <input type="number" id="bolus1-ui" value="${mealData.bolus1_ui != null ? mealData.bolus1_ui : ''}" placeholder="UI" inputmode="decimal" step="0.1">
                </div>
            </div>
        </div>
        <div class="bolus-step">
            <div class="bolus-step-label">2ème bolus (fin de repas)</div>
            <div class="bolus-step-row">
                <div class="input-group">
                    <label>Glucides (g)</label>
                    <input type="number" id="bolus2-carbs" value="${mealData.bolus2_carbs != null ? mealData.bolus2_carbs : ''}" placeholder="glucides" inputmode="decimal" step="0.1">
                </div>
                <div class="input-group">
                    <label>UI (si différent)</label>
                    <input type="number" id="bolus2-ui" value="${mealData.bolus2_ui != null ? mealData.bolus2_ui : ''}" placeholder="UI" inputmode="decimal" step="0.1">
                </div>
            </div>
        </div>
        <div class="want-pct-section">
            <label>Je veux :</label>
            <input type="number" id="want-pct" value="${mealData.wantPct || 100}" min="0" max="200" inputmode="numeric">
            <label>%</label>
            <span class="remaining">Reste : ${totals.remainingUI > 0 ? round1(totals.remainingUI) + ' UI (' + round1(totals.remainingCarbs) + 'g)' : '0'}</span>
        </div>
    </div>`;

    // Bilan section
    const bilanHtml = `
    <div class="bilan-section">
        <h4>Bilan du repas</h4>
        <div class="bilan-row">
            <span class="bilan-label">Bolus repas théorique</span>
            <span class="bilan-value" style="color:var(--warning)">${round1(totals.mealBolusUI)} UI</span>
        </div>
        <div class="bilan-row">
            <span class="bilan-label">Bolus repas donné</span>
            <span class="bilan-value" style="color:var(--success)">${round1(totals.totalBolusGivenUI)} UI</span>
        </div>
        <div class="bilan-row">
            <span class="bilan-label">% repas donné/théorique</span>
            <span class="bilan-value" style="color:${totals.pctGiven < 80 ? 'var(--danger)' : totals.pctGiven > 120 ? 'var(--warning)' : 'var(--success)'}">${totals.totalBolusDue > 0 ? round1(totals.pctGiven) + '%' : '-'}</span>
        </div>
        <div class="bilan-row" style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
            <span class="bilan-label">Total dû (correction + repas)</span>
            <span class="bilan-value">${round1(totals.totalDueWithCorrection)} UI</span>
        </div>
        <div class="bilan-row">
            <span class="bilan-label">Total donné</span>
            <span class="bilan-value" style="color:var(--success)">${round1(totals.totalGivenWithCorrection)} UI</span>
        </div>
        <div class="bilan-row">
            <span class="bilan-label">% total donné/dû</span>
            <span class="bilan-value" style="color:${totals.pctGiven < 80 ? 'var(--danger)' : totals.pctGiven > 120 ? 'var(--warning)' : 'var(--success)'}">${totals.totalDueWithCorrection > 0 ? round1((totals.totalGivenWithCorrection/totals.totalDueWithCorrection)*100) + '%' : '-'}</span>
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

        // Touchend delegation for autocomplete on mobile
        container.addEventListener('touchend', e => {
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

    // Bilan section
    const bilanValues = $$('.bilan-section .bilan-row .bilan-value');
    if (bilanValues.length >= 6) {
        bilanValues[0].textContent = round1(totals.mealBolusUI) + ' UI';
        bilanValues[1].textContent = round1(totals.totalBolusGivenUI) + ' UI';
        const mealPct = totals.totalBolusDue > 0 ? round1(totals.pctGiven) : 0;
        bilanValues[2].textContent = totals.totalBolusDue > 0 ? round1(totals.pctGiven) + '%' : '-';
        bilanValues[2].style.color = mealPct < 80 ? 'var(--danger)' : mealPct > 120 ? 'var(--warning)' : 'var(--success)';
        bilanValues[3].textContent = round1(totals.totalDueWithCorrection) + ' UI';
        bilanValues[4].textContent = round1(totals.totalGivenWithCorrection) + ' UI';
        const totalPct = totals.totalDueWithCorrection > 0 ? round1((totals.totalGivenWithCorrection/totals.totalDueWithCorrection)*100) : 0;
        bilanValues[5].textContent = totals.totalDueWithCorrection > 0 ? totalPct + '%' : '-';
        bilanValues[5].style.color = totalPct < 80 ? 'var(--danger)' : totalPct > 120 ? 'var(--warning)' : 'var(--success)';
    }

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

        // Now fetch glucose entries
        const now = Date.now();
        const from = now - 24 * 60 * 60 * 1000;
        let apiUrl = `${baseUrl}/api/v1/entries/sgv.json?find[dateString][$gte]=${new Date(from).toISOString()}&count=288`;
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
        renderGlucoseChart();
        renderGlucoseCurrent();
        $('#glucose-current').classList.remove('hidden');
        if (statusEl) statusEl.textContent = `Connecté - ${glucoseData.length} mesures reçues`;
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

    const val = latest.sgv || latest.value;
    const valEl = $('#glucose-val');
    valEl.style.color = val < 70 ? 'var(--glucose-low)' : val < 180 ? 'var(--glucose-ok)' : val < 250 ? 'var(--glucose-high)' : 'var(--glucose-very-high)';
}

const DIRECTION_TO_TREND = { 'DoubleUp': '↑↑', 'SingleUp': '↑', 'FortyFiveUp': '↗', 'Flat': '→', 'FortyFiveDown': '↘', 'SingleDown': '↓', 'DoubleDown': '↓↓' };

async function fillGlucoseFromCGM() {
    // If no glucose data yet, fetch it first
    if (glucoseData.length === 0) {
        await fetchGlucose();
    }
    if (glucoseData.length === 0) {
        toast('Aucune glycémie disponible');
        return;
    }
    const latest = glucoseData[glucoseData.length - 1];
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

    const mins = Math.round((Date.now() - latest.date) / 60000);
    toast(`${val} mg/dl ${trend} (il y a ${mins} min)`);
}

function renderGlucoseChart() {
    const canvas = $('#glucose-chart');
    if (!canvas || glucoseData.length === 0) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    // Calculate available height: viewport minus top bar, nav tabs, current glucose, status, and bottom padding
    const availableHeight = window.innerHeight - 160;
    const containerWidth = canvas.parentElement.offsetWidth || window.innerWidth;
    const H = Math.max(300, Math.min(availableHeight, 600));
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

    // Data range
    const values = glucoseData.map(d => d.sgv || d.value).filter(v => v > 0);
    const minVal = Math.min(40, Math.min(...values));
    const maxVal = Math.max(300, Math.max(...values));
    const minTime = glucoseData[0].date;
    const maxTime = glucoseData[glucoseData.length - 1].date;
    const timeRange = maxTime - minTime || 1;

    function x(time) { return padding.left + ((time - minTime) / timeRange) * chartW; }
    function y(val) { return padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH; }

    // Target zones
    ctx.fillStyle = 'rgba(46, 204, 113, 0.08)';
    ctx.fillRect(padding.left, y(180), chartW, y(70) - y(180));

    // Low zone
    ctx.fillStyle = 'rgba(231, 76, 60, 0.08)';
    ctx.fillRect(padding.left, y(70), chartW, y(minVal) - y(70));

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    [70, 100, 150, 180, 250].forEach(v => {
        ctx.beginPath();
        ctx.moveTo(padding.left, y(v));
        ctx.lineTo(W - padding.right, y(v));
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(v, padding.left - 4, y(v) + 3);
    });

    // Time labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < glucoseData.length; i += Math.floor(glucoseData.length / 6)) {
        const d = new Date(glucoseData[i].date);
        ctx.fillText(`${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`, x(glucoseData[i].date), H - 5);
    }

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#4361ee';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    glucoseData.forEach((d, i) => {
        const val = d.sgv || d.value;
        if (val <= 0) return;
        if (i === 0) ctx.moveTo(x(d.date), y(val));
        else ctx.lineTo(x(d.date), y(val));
    });
    ctx.stroke();

    // Dots for recent values
    const last10 = glucoseData.slice(-10);
    last10.forEach(d => {
        const val = d.sgv || d.value;
        if (val <= 0) return;
        ctx.beginPath();
        ctx.arc(x(d.date), y(val), 3, 0, Math.PI * 2);
        ctx.fillStyle = val < 70 ? '#e74c3c' : val < 180 ? '#2ecc71' : val < 250 ? '#f39c12' : '#e74c3c';
        ctx.fill();
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
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Pas de bolus enregistré', W / 2, H / 2 + 4);
        return;
    }

    const endTime = bolusTime + 4 * 60 * 60 * 1000;

    // Filter glucose data for this 4h window
    const points = glucoseData.filter(g => g.date >= bolusTime && g.date <= endTime);

    if (points.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '11px sans-serif';
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
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
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
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px sans-serif';
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
    ctx.strokeStyle = '#4361ee';
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
        ctx.fillStyle = val < 70 ? '#e74c3c' : val <= 180 ? '#2ecc71' : val <= 250 ? '#f39c12' : '#e74c3c';
        ctx.fill();
    });

    // Start marker (bolus moment)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
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
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '14px sans-serif';
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
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    [50, 100, 150].forEach(v => {
        if (v <= maxPct) ctx.fillText(v + '%', padding.left - 4, y(v) + 3);
    });

    // Data line
    ctx.beginPath();
    ctx.strokeStyle = '#4361ee';
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
        ctx.fillStyle = p.y < 80 ? '#e74c3c' : p.y > 120 ? '#f39c12' : '#2ecc71';
        ctx.fill();
    });

    // Day labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px sans-serif';
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
function renderFoodList(query) {
    const list = $('#food-list');
    if (!list) return;
    const filtered = query ? foods.filter(f => f.n.toLowerCase().includes(query.toLowerCase())) : foods;
    const display = filtered.slice(0, 100);
    list.innerHTML = display.map(f => {
        const type = f.s > 0 ? (f.s/f.g >= 0.66 ? 'rapide' : f.s/f.g >= 0.33 ? 'moyen' : 'lent') : 'lent';
        return `<div class="food-list-item">
            <span class="food-name">${f.n}</span>
            <span class="food-carbs">${f.g}g</span>
            <span class="food-sugar">${f.s}g sucre</span>
        </div>`;
    }).join('');
    if (filtered.length > 100) {
        list.innerHTML += `<div style="padding:10px;text-align:center;color:var(--text-dim);font-size:13px">${filtered.length - 100} autres résultats...</div>`;
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
                    <input type="number" class="setting-ratio" data-meal="${m.id}" value="${p.ratio || m.defaultRatio}" inputmode="numeric">
                </div>
                <div class="input-group">
                    <label>Sensibilité</label>
                    <input type="number" class="setting-sensitivity" data-meal="${m.id}" value="${p.sensitivity || m.defaultSensitivity}" inputmode="numeric">
                </div>
                <div class="input-group">
                    <label>Cible</label>
                    <input type="number" class="setting-target" data-meal="${m.id}" value="${p.target || m.defaultTarget}" inputmode="numeric">
                </div>
            </div>
        </div>`;
    }).join('');

    $('#settings-ns-url').value = settings.nightscoutUrl || '';
    $('#settings-ns-token').value = settings.nightscoutToken || '';
    $('#settings-gh-token').value = settings.ghToken || '';
    $('#settings-gist-id').value = settings.gistId || '';
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
                    mergeCustomFoods(remote.customFoods);
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
    saveState();
}

async function mergeCustomFoods(remoteFoods) {
    if (!remoteFoods || remoteFoods.length === 0) return;
    const localFoods = JSON.parse(localStorage.getItem('followdia_custom_foods') || '[]');
    const localNames = new Set(localFoods.map(f => f.n.toLowerCase()));
    const newFoods = remoteFoods.filter(f => !localNames.has(f.n.toLowerCase()));
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

async function initApp() {
    loadState();
    loadSettings();
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
            if (tab.dataset.tab === 'dashboard') renderDashboard();
            if (tab.dataset.tab === 'glucose') { fetchGlucose(); setTimeout(renderGlucoseChart, 100); }
            if (tab.dataset.tab === 'foods') renderFoodList('');
            // Show/hide save bar
            const saveBar = document.getElementById('save-bar');
            if (saveBar) saveBar.style.display = tab.dataset.tab === 'meals' ? 'flex' : 'none';
        });
    });

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

    $('#btn-logout').addEventListener('click', () => {
        sessionStorage.removeItem('followdia_auth');
        location.reload();
    });

    $('#btn-change-password').addEventListener('click', () => {
        const newPw = prompt('Nouveau mot de passe :');
        if (newPw && newPw.length >= 4) {
            hashPassword(newPw).then(hash => {
                localStorage.setItem('followdia_pw_hash', hash);
                toast('Mot de passe changé');
            });
        }
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

// Boot
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    if (sessionStorage.getItem('followdia_auth') === '1') {
        showApp();
    }
});
