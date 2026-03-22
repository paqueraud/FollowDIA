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
    syncToGist();
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
            foods: [],
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
                <input type="number" id="meal-glucose" value="${mealData.glucose || ''}" placeholder="--" inputmode="numeric">
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
    const foodsArr = mealData.foods && mealData.foods.length > 0 ? mealData.foods : [{ name: '', massServed: null, massRemaining: null }];
    let foodsHtml = '';
    foodsArr.forEach((f, i) => {
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
                    <label>ou UI</label>
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
                    <label>ou UI</label>
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

function bindMealEvents() {
    // Date nav
    $('#btn-prev-day')?.addEventListener('click', () => { currentDate = prevDate(currentDate); renderMeal(); updateDateDisplay(); });
    $('#btn-next-day')?.addEventListener('click', () => { currentDate = nextDate(currentDate); renderMeal(); updateDateDisplay(); });

    // Trend buttons
    $$('.trend-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.trend-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateMealField('trend', btn.dataset.trend);
        });
    });

    // Glucose, active insulin, correction given
    $('#meal-glucose')?.addEventListener('change', e => updateMealField('glucose', e.target.value ? parseFloat(e.target.value) : null));
    $('#meal-active-insulin')?.addEventListener('change', e => updateMealField('activeInsulin', parseFloat(e.target.value) || 0));
    $('#meal-correction-given')?.addEventListener('change', e => updateMealField('correctionGiven', parseFloat(e.target.value) || 0));

    // Bolus inputs
    $('#bolus1-carbs')?.addEventListener('change', e => { updateMealField('bolus1_carbs', e.target.value !== '' ? parseFloat(e.target.value) : null); updateMealField('bolus1_ui', null); renderMeal(); });
    $('#bolus1-ui')?.addEventListener('change', e => { updateMealField('bolus1_ui', e.target.value !== '' ? parseFloat(e.target.value) : null); updateMealField('bolus1_carbs', null); renderMeal(); });
    $('#bolus2-carbs')?.addEventListener('change', e => { updateMealField('bolus2_carbs', e.target.value !== '' ? parseFloat(e.target.value) : null); updateMealField('bolus2_ui', null); renderMeal(); });
    $('#bolus2-ui')?.addEventListener('change', e => { updateMealField('bolus2_ui', e.target.value !== '' ? parseFloat(e.target.value) : null); updateMealField('bolus2_carbs', null); renderMeal(); });

    // Want %
    $('#want-pct')?.addEventListener('change', e => { updateMealField('wantPct', parseInt(e.target.value) || 100); renderMeal(); });

    // Food name autocomplete
    $$('.food-name').forEach(input => {
        const idx = parseInt(input.dataset.index);
        const acList = $(`#ac-${idx}`);

        input.addEventListener('input', () => {
            const results = searchFoods(input.value);
            if (results.length > 0 && input.value.length >= 1) {
                acList.innerHTML = results.map((f, ri) => `<div class="autocomplete-item" data-name="${f.n}" data-idx="${ri}">${f.n} <span class="carb-info">${f.g}g/100g</span></div>`).join('');
                acList.classList.add('show');
            } else {
                acList.classList.remove('show');
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(() => {
                acList.classList.remove('show');
                updateFoodField(idx, 'name', input.value);
            }, 200);
        });

        acList.addEventListener('click', e => {
            const item = e.target.closest('.autocomplete-item');
            if (item) {
                input.value = item.dataset.name;
                acList.classList.remove('show');
                updateFoodField(idx, 'name', item.dataset.name);
            }
        });
    });

    // Food mass inputs
    $$('.food-served').forEach(input => {
        input.addEventListener('change', () => {
            updateFoodField(parseInt(input.dataset.index), 'massServed', input.value !== '' ? parseFloat(input.value) : null);
        });
    });

    $$('.food-remaining').forEach(input => {
        input.addEventListener('change', () => {
            updateFoodField(parseInt(input.dataset.index), 'massRemaining', input.value !== '' ? parseFloat(input.value) : null);
        });
    });

    // Remove food
    $$('.btn-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const md = getMealData(currentDate, currentMeal);
            md.foods.splice(parseInt(btn.dataset.index), 1);
            renderMeal();
        });
    });

    // Add food entry
    $('#btn-add-food-entry')?.addEventListener('click', () => {
        const md = getMealData(currentDate, currentMeal);
        md.foods.push({ name: '', massServed: null, massRemaining: null });
        renderMeal();
    });

    // Save button
    document.getElementById('btn-save')?.addEventListener('click', () => {
        const md = getMealData(currentDate, currentMeal);
        if (!md.timestamp) md.timestamp = new Date().toISOString();
        saveState();
        toast('Sauvegardé');
        updateMealTabs();
    });
}

function updateMealField(field, value) {
    const md = getMealData(currentDate, currentMeal);
    md[field] = value;
    // Re-render correction value if needed
    if (['glucose', 'trend', 'activeInsulin'].includes(field)) {
        const params = settings[currentMeal] || {};
        const correction = calcCorrectionBolus(md.glucose, md.trend, params.sensitivity || 150, params.target || 150, md.activeInsulin || 0);
        const el = $('#correction-value');
        if (el) el.textContent = correction.safe > 0 ? round1(correction.safe) + ' UI' : '-';
    }
}

function updateFoodField(index, field, value) {
    const md = getMealData(currentDate, currentMeal);
    if (!md.foods[index]) md.foods[index] = { name: '', massServed: null, massRemaining: null };
    md.foods[index][field] = value;
    renderMeal();
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

    try {
        const token = settings.nightscoutToken || localStorage.getItem('followdia_ns_token') || '';
        const now = Date.now();
        const from = now - 24 * 60 * 60 * 1000;
        let apiUrl = `${url.replace(/\/$/, '')}/api/v1/entries/sgv.json?find[dateString][$gte]=${new Date(from).toISOString()}&count=288`;
        if (token) apiUrl += `&token=${token}`;

        const resp = await fetch(apiUrl);
        if (!resp.ok) throw new Error('Nightscout error');
        glucoseData = await resp.json();
        glucoseData.sort((a, b) => a.date - b.date);
        renderGlucoseChart();
        renderGlucoseCurrent();
        $('#glucose-current').classList.remove('hidden');
    } catch(e) {
        console.error('Glucose fetch error:', e);
    }
}

function renderGlucoseCurrent() {
    if (glucoseData.length === 0) return;
    const latest = glucoseData[glucoseData.length - 1];
    $('#glucose-val').textContent = latest.sgv || latest.value || '--';
    const trendMap = { 'DoubleUp': '↑↑', 'SingleUp': '↑', 'FortyFiveUp': '↗', 'Flat': '→', 'FortyFiveDown': '↘', 'SingleDown': '↓', 'DoubleDown': '↓↓' };
    $('#glucose-trend').textContent = trendMap[latest.direction] || latest.direction || '→';
    const mins = Math.round((Date.now() - latest.date) / 60000);
    $('#glucose-time').textContent = mins < 60 ? `il y a ${mins} min` : `il y a ${Math.round(mins/60)}h`;

    const val = latest.sgv || latest.value;
    const valEl = $('#glucose-val');
    valEl.style.color = val < 70 ? 'var(--glucose-low)' : val < 180 ? 'var(--glucose-ok)' : val < 250 ? 'var(--glucose-high)' : 'var(--glucose-very-high)';
}

function renderGlucoseChart() {
    const canvas = $('#glucose-chart');
    if (!canvas || glucoseData.length === 0) return;
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

        html += `<div class="dashboard-day">
            <div class="dashboard-day-header">${formatDate(date)}</div>`;

        MEALS.forEach(m => {
            const md = dayData[m.id];
            let pct = 0;
            let pctText = '-';
            if (md && md.foods && md.foods.length > 0) {
                const t = calcMealTotals(md, m.id);
                if (t.totalDueWithCorrection > 0) {
                    pct = t.pctGiven;
                    pctText = Math.round(pct) + '%';
                }
            }
            const pctClass = pct === 0 ? '' : pct < 80 ? 'pct-low' : pct > 120 ? 'pct-high' : 'pct-ok';
            const pctColor = pct === 0 ? 'var(--text-dim)' : pct < 80 ? 'var(--danger)' : pct > 120 ? 'var(--warning)' : 'var(--success)';

            html += `<div class="dashboard-meal-row">
                <span class="dashboard-meal-name">${m.label}</span>
                <div class="dashboard-pct-bar"><div class="dashboard-pct-fill ${pctClass}" style="width:${Math.min(pct, 150)}%"></div></div>
                <span class="dashboard-pct-value" style="color:${pctColor}">${pctText}</span>
            </div>`;
        });

        // Post-bolus glucose curve placeholder
        html += renderPostBolusGlucose(date);
        html += '</div>';
    }
    container.innerHTML = html;
}

function renderPostBolusGlucose(date) {
    if (glucoseData.length === 0) return '';
    // For each meal, show glucose 4h after bolus timestamp
    let html = '<div style="margin-top:8px;font-size:11px;color:var(--text-dim)">';
    const dayData = state[date] || {};

    MEALS.forEach(m => {
        const md = dayData[m.id];
        if (!md || !md.timestamp) return;
        const bolusTime = new Date(md.timestamp).getTime();
        const endTime = bolusTime + 4 * 60 * 60 * 1000;
        const relevantGlucose = glucoseData.filter(g => g.date >= bolusTime && g.date <= endTime);
        if (relevantGlucose.length > 0) {
            const vals = relevantGlucose.map(g => g.sgv || g.value);
            const avg = Math.round(vals.reduce((a,b) => a+b, 0) / vals.length);
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            html += `<div>${m.label}: glycémie post-bolus moy=${avg} (${min}-${max}) mg/dl</div>`;
        }
    });
    html += '</div>';
    return html;
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
async function syncToGist() {
    const token = settings.ghToken;
    if (!token) return;

    const payload = {
        data: state,
        settings: settings,
        customFoods: JSON.parse(localStorage.getItem('followdia_custom_foods') || '[]'),
        lastSync: new Date().toISOString()
    };

    try {
        if (settings.gistId) {
            // Update existing gist
            const resp = await fetch(`https://api.github.com/gists/${settings.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        'followdia_data.json': { content: JSON.stringify(payload) }
                    }
                })
            });
            if (!resp.ok) throw new Error('Gist update failed');
        } else {
            // Create new gist
            const resp = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: 'FollowDIA - Données de suivi diabète',
                    public: false,
                    files: {
                        'followdia_data.json': { content: JSON.stringify(payload) }
                    }
                })
            });
            if (!resp.ok) throw new Error('Gist creation failed');
            const data = await resp.json();
            settings.gistId = data.id;
            saveSettings();
            if ($('#settings-gist-id')) $('#settings-gist-id').value = data.id;
        }
    } catch(e) {
        console.error('Sync error:', e);
    }
}

async function syncFromGist() {
    const token = settings.ghToken;
    const gistId = settings.gistId;
    if (!token || !gistId) { toast('Configurez GitHub dans les paramètres'); return; }

    try {
        const resp = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        if (!resp.ok) throw new Error('Fetch failed');
        const gist = await resp.json();
        const content = gist.files['followdia_data.json']?.content;
        if (!content) throw new Error('No data file');
        const payload = JSON.parse(content);

        // Merge data
        if (payload.data) {
            Object.keys(payload.data).forEach(date => {
                if (!state[date]) state[date] = payload.data[date];
                else {
                    Object.keys(payload.data[date]).forEach(meal => {
                        if (!state[date][meal]) state[date][meal] = payload.data[date][meal];
                    });
                }
            });
            localStorage.setItem('followdia_data', JSON.stringify(state));
        }
        if (payload.customFoods) {
            localStorage.setItem('followdia_custom_foods', JSON.stringify(payload.customFoods));
            await loadFoods();
        }
        toast('Données synchronisées');
        renderMeal();
    } catch(e) {
        console.error('Sync from gist error:', e);
        toast('Erreur de synchronisation');
    }
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
    $('#btn-sync').addEventListener('click', syncFromGist);

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

    // Nightscout connect button
    $('#btn-connect-ns').addEventListener('click', () => {
        settings.nightscoutUrl = $('#nightscout-url').value.trim();
        settings.nightscoutToken = $('#nightscout-token').value.trim();
        saveSettings();
        fetchGlucose();
    });

    // Dashboard filter chips
    $$('.meal-filter-row .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            $$('.meal-filter-row .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            render30DaysTrend();
        });
    });

    // Pre-fill nightscout inputs from settings
    if (settings.nightscoutUrl) {
        $('#nightscout-url').value = settings.nightscoutUrl;
        $('#nightscout-token').value = settings.nightscoutToken || '';
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    if (sessionStorage.getItem('followdia_auth') === '1') {
        showApp();
    }
});
