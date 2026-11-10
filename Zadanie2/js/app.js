'use strict';
/* Zobrazovanie, asynchrónne načítanie HTML, localStorage a interakcie. */
const CACHE_KEY = 'obedovka_cache_v1';
const state = { day: (() => { const d = new Date().getDay(); return d >= 1 && d <= 5 ? d - 1 : 0; })(), visible: new Set(RESTAURANTS.map(r => r.id)), entries: {}, errors: {}, updated: {}, loading: false };
const $ = id => document.getElementById(id);
const dateKey = () => dayjs().format('YYYY-MM-DD');
const formatTime = iso => iso ? dayjs(iso).format('DD.MM.YYYY HH:mm') : 'Zatiaľ nenačítané';
function setNotice(message) { $('modeNotice').textContent = message; $('modeNotice').hidden = !message; }
function setLoading(yes) { state.loading = yes; $('loading').hidden = !yes; $('refreshButton').disabled = yes; }
function store() { try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: dateKey(), entries: state.entries, errors: state.errors, updated: state.updated }));
}
catch (e) {
    setNotice('Uloženie do localStorage nie je dostupné.');
} }
function restore() { try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (saved?.date === dateKey()) {
        state.entries = saved.entries || {};
        state.errors = saved.errors || {};
        state.updated = saved.updated || {};
        return true;
    }
}
catch (e) { /* poškodený cache súbor sa ignoruje */ } return false; }
async function loadMenus() {
    setLoading(true);
    setNotice('');
    // Promise.allSettled zabezpečí, že výpadok jednej reštaurácie nezastaví ostatné.
    const jobs = RESTAURANTS.map(async (restaurant) => {
        const response = await fetch(restaurant.file, { cache: 'no-store' });
        if (!response.ok)
            throw Error(`HTTP ${response.status}`);
        const html = await response.text();
        const document = new DOMParser().parseFromString(html, 'text/html');
        const parsed = restaurant.parse(document);
        return { id: restaurant.id, parsed };
    });
    const results = await Promise.allSettled(jobs);
    results.forEach((result, index) => {
        const id = RESTAURANTS[index].id;
        if (result.status === 'fulfilled') {
            state.entries[id] = result.value.parsed;
            delete state.errors[id];
            state.updated[id] = new Date().toISOString();
        }
        else {
            state.errors[id] = 'Súbor sa nepodarilo načítať alebo sa zmenila štruktúra menu.';
            delete state.entries[id];
            delete state.updated[id];
            console.warn('Chyba:', id, result.reason);
        }
    });
    store();
    setLoading(false);
    render();
}
/*
 * UKÁŽKA ONLINE REŽIMU – CELÝ BLOK JE ZAKOMENTOVANÝ.
 * Nie je spustený a nezasahuje do lokálneho režimu.
 * Pre skutočné použitie by cvičiaci musel dodať adresu a formát školskej proxy.
 * Toto je iba ilustračný príklad, nie funkčná proxy konfigurácia.
 *
 * const SCHOOL_PROXY_URL = 'ADRESA_SKOLSKEJ_PROXY';
 *
 * async function loadOnlineMenus() {
 *   setLoading(true);
 *   const jobs = RESTAURANTS.map(async restaurant => {
 *     const url = SCHOOL_PROXY_URL + '?url=' + encodeURIComponent(restaurant.url);
 *     const response = await fetch(url);
 *     if (!response.ok) throw new Error('HTTP ' + response.status);
 *     const html = await response.text();
 *     const document = new DOMParser().parseFromString(html, 'text/html');
 *     return { id: restaurant.id, parsed: restaurant.parse(document) };
 *   });
 *   const results = await Promise.allSettled(jobs);
 *   results.forEach((result, index) => {
 *     const id = RESTAURANTS[index].id;
 *     if (result.status === 'fulfilled') {
 *       state.entries[id] = result.value.parsed;
 *       state.updated[id] = new Date().toISOString();
 *       delete state.errors[id];
 *     } else {
 *       state.errors[id] = 'Online menu sa nepodarilo načítať.';
 *     }
 *   });
 *   store();
 *   setLoading(false);
 *   render();
 * }
 *
 * // Možné zapojenie po sprístupnení školskej proxy:
 * // document.getElementById('onlineMode').addEventListener('click', loadOnlineMenus);
 */
function renderFilters() {
    $('restaurantFilters').replaceChildren();
    RESTAURANTS.forEach(r => {
        const label = document.createElement('label');
        label.className = 'filter-chip';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = state.visible.has(r.id);
        input.addEventListener('change', () => { input.checked ? state.visible.add(r.id) : state.visible.delete(r.id); render(); });
        const dot = document.createElement('span');
        dot.className = 'filter-dot ' + r.id;
        label.append(input, dot, document.createTextNode(r.short));
        $('restaurantFilters').append(label);
    });
}
function element(tag, cls, text) { const e = document.createElement(tag); if (cls)
    e.className = cls; if (text !== undefined)
    e.textContent = text; return e; }
function createDish(dish) {
    const wrap = element('div', 'dish');
    const badge = element('span', 'dish-type' + (dish.type === 'Polievka' ? ' soup' : ''), dish.variant || dish.type);
    const detail = element('div', 'dish-detail');
    detail.append(badge, element('p', 'dish-name', dish.name));
    const extra = [];
    if (dish.allergens)
        extra.push('Alergény: ' + dish.allergens);
    if (dish.date)
        extra.push(dish.date);
    if (extra.length)
        detail.append(element('small', 'dish-extra', extra.join(' · ')));
    wrap.append(detail, element('span', 'dish-price', dish.price || 'Cena neuvedená'));
    return wrap;
}
function createCard(r, day) {
    const card = element('article', 'restaurant-card ' + r.id);
    const top = element('div', 'card-top');
    const brand = element('div', 'restaurant-avatar', r.name[0]);
    const heading = element('div', 'card-heading');
    heading.append(element('div', 'card-kicker', r.tag), element('h3', '', r.name), element('p', 'card-address', r.location));
    top.append(brand, heading);
    const link = element('a', 'source-link', 'Zdroj ↗');
    link.href = r.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    top.append(link);
    card.append(top);
    const dishes = (state.entries[r.id] || []).filter(d => d.day === day);
    if (state.errors[r.id])
        card.append(element('p', 'empty-menu', state.errors[r.id]));
    else if (!dishes.length)
        card.append(element('p', 'empty-menu', 'Menu na tento deň nie je k dispozícii.'));
    else {
        const soups = dishes.filter(x => x.type === 'Polievka');
        const mains = dishes.filter(x => x.type !== 'Polievka');
        if (soups.length) {
            const section = element('div', 'dish-group');
            section.append(element('h4', 'group-title', 'POLIEVKY'));
            soups.forEach(x => section.append(createDish(x)));
            card.append(section);
        }
        if (mains.length) {
            const section = element('div', 'dish-group');
            section.append(element('h4', 'group-title', 'HLAVNÉ JEDLÁ A OSTATNÉ'));
            mains.forEach(x => section.append(createDish(x)));
            card.append(section);
        }
    }
    const footer = element('div', 'card-footer');
    footer.append(element('span', '', 'Posledná aktualizácia'), element('time', '', formatTime(state.updated[r.id])));
    card.append(footer);
    return card;
}
function render() {
    document.querySelectorAll('#dayTabs button').forEach(btn => { let active = String(state.day) === btn.dataset.day; btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', String(active)); });
    const visible = RESTAURANTS.filter(r => state.visible.has(r.id));
    const container = $('menuResults');
    container.replaceChildren();
    $('resultCount').textContent = visible.length + ' z 3 reštaurácií';
    if (!visible.length) {
        container.append(element('p', 'empty-state', 'Vyber aspoň jednu reštauráciu.'));
        return;
    }
    if (state.day === 'all') {
        $('resultsHeading').textContent = 'Celý týždeň na jednom mieste';
        DAYS.forEach((name, index) => { const group = element('section', 'week-section'); group.append(element('h3', 'week-title', name)); const grid = element('div', 'menu-grid'); visible.forEach(r => grid.append(createCard(r, index))); group.append(grid); container.append(group); });
    }
    else {
        $('resultsHeading').textContent = DAYS[state.day] + ' · čo je na obed?';
        visible.forEach(r => container.append(createCard(r, state.day)));
    }
}
function init() {
    $('dateLabel').textContent = 'Týždeň ' + dayjs().startOf('week').add(1, 'day').format('DD.MM.') + ' – ' + dayjs().startOf('week').add(5, 'day').format('DD.MM.YYYY');
    document.querySelectorAll('#dayTabs button').forEach(btn => btn.addEventListener('click', () => { state.day = btn.dataset.day === 'all' ? 'all' : Number(btn.dataset.day); render(); }));
    $('localMode').addEventListener('click', () => { setNotice('Lokálny režim je aktívny. Menu sa číta z uložených HTML súborov.'); $('localMode').classList.add('is-active'); $('localMode').setAttribute('aria-pressed', 'true'); $('onlineMode').classList.remove('is-active'); $('onlineMode').setAttribute('aria-pressed', 'false'); });
    $('onlineMode').addEventListener('click', () => setNotice('Online režim nie je v tejto verzii implementovaný. Dostupné je iba lokálne HTML.'));
    $('refreshButton').addEventListener('click', loadMenus);
    $('clearButton').addEventListener('click', () => { localStorage.removeItem(CACHE_KEY); state.entries = {}; state.errors = {}; state.updated = {}; render(); setNotice('Uložené dáta boli vymazané. Klikni na „Aktualizovať menu“ pre opätovné načítanie.'); });
    renderFilters();
    render();
    if (!restore())
        loadMenus();
    else
        render();
}
document.addEventListener('DOMContentLoaded', init);
