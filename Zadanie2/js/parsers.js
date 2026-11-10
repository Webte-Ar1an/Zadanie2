/* Samostatné DOM parsery pre tri rôzne štruktúry reštaurácií. */
'use strict';
const DAYS = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok'];
function cleanText(value) { return (value || '').replace(/\s+/g, ' ').trim(); }
function getAllergens(name) {
    const match = name.match(/\((\s*\d+(?:\s*,\s*\d+)*)\)\s*$/) || name.match(/\s(\d+(?:\s*,\s*\d+)*)\s*$/);
    return match ? match[1].replace(/\s+/g, '') : '';
}
function splitName(raw) {
    const allergens = getAllergens(raw);
    return { name: cleanText(raw.replace(/\(\s*\d+(?:\s*,\s*\d+)*\)\s*$/, '').replace(/\s\d+(?:\s*,\s*\d+)*\s*$/, '')), allergens };
}
function item(day, type, name, price, extra = {}) { return { day, type, ...splitName(name), price, ...extra }; }
function parseWhiteDragon(doc) {
    const root = [...doc.querySelectorAll('.post_content')].find(x => x.querySelector('p')?.textContent.includes('26.-')) || doc.querySelector('.post_content');
    if (!root)
        throw Error('Štruktúra menu White Dragon sa nenašla.');
    const paragraphs = [...root.querySelectorAll('p')];
    const menuPrices = cleanText(root.textContent);
    const regularPrice = menuPrices.match(/Cena menu\s*[–-]\s*(\d+[,.]?\d*)\s*eur/i)?.[1];
    const specialPrice = menuPrices.match(/Cena menu špeciál\s*[–-]\s*(\d+[,.]?\d*)\s*eur/i)?.[1];
    const data = [];
    let lastDay = -1;
    for (const p of paragraphs) {
        const lines = p.innerHTML.split(/<br\s*\/?\s*>/i).map(t => cleanText(new DOMParser().parseFromString(t, 'text/html').body.textContent)).filter(Boolean);
        const day = DAYS.findIndex(d => lines[0]?.toLocaleLowerCase('sk') === d.toLocaleLowerCase('sk'));
        // Špeciál je na zdrojovej stránke v samostatnom <p> hneď za daným dňom.
        // Preto ho treba priradiť k poslednému nájdenému dňu.
        if (day < 0) {
            if (lastDay >= 0 && lines.length === 1 && /^Špeciál\s*:/i.test(lines[0])) {
                const specialName = lines[0].replace(/(\d)\s+(\d+)\s*$/, '$1,$2');
                const price = specialPrice
                    ? `${specialPrice.replace('.', ',')} €`
                    : 'Cena neuvedená';
                data.push(item(lastDay, 'Špeciál', specialName, price));
            }
            continue;
        }

        lastDay = day;
        if (lines.some(line => /zatvoren[ée]/i.test(line)))
            continue;
        // V tomto zdroji nasledujú štandardne 2 polievky a potom hlavné jedlá.
        lines.slice(1).forEach((line, index) => {
            const isSoup = index < 2;
            const isSpecial = /^Špeciál\s*:/i.test(line);

            const type = isSoup
                ? 'Polievka'
                : isSpecial
                    ? 'Špeciál'
                    : 'Hlavné jedlo';

            let price;

            if (isSoup) {
                price = 'V cene menu';
            } else if (isSpecial) {
                price = specialPrice
                    ? `${specialPrice.replace('.', ',')} €`
                    : 'Cena neuvedená';
            } else {
                price = regularPrice
                    ? `${regularPrice.replace('.', ',')} €`
                    : 'Cena neuvedená';
            }

            data.push(item(day, type, line, price));
        });
    }
    if (!data.length)
        throw Error('Nenašli sa položky menu White Dragon.');
    return data;
}
function parseEatAndMeet(doc) {
    const data = [];
    for (let day = 0; day < 5; day++) {
        const panel = doc.querySelector(`#day-${day + 1}`);
        if (!panel)
            continue;
        for (const box of panel.querySelectorAll('.menu-body')) {
            const typeLabel = cleanText(box.querySelector('.menu-title h4')?.textContent);
            const title = cleanText(box.querySelector('.menu-description .desc')?.textContent);
            const price = cleanText(box.querySelector('.menu-title .price')?.textContent);
            if (!title || !typeLabel)
                continue;
            let type = /poliev/i.test(typeLabel) ? 'Polievka' : /sladk|múčne|veget/i.test(typeLabel) ? typeLabel : 'Hlavné jedlo';
            const prices = price.match(/\d+[,.]\d+\s*€/g) || [];
            const displayPrice = prices.length > 1 ? `${prices[0]} / ${prices[1]} (študent)` : (prices[0] || price || 'Cena neuvedená');
            data.push(item(day, type, title, displayPrice, { variant: typeLabel }));
        }
    }
    if (!data.length)
        throw Error('Nenašli sa položky menu Eat & Meet.');
    return data;
}
function parseDruzba(doc) {
    const data = [];
    const headers = [...doc.querySelectorAll('.heading-title h2')];
    for (const header of headers) {
        const dateText = cleanText(header.textContent);
        const day = DAYS.findIndex(d => dateText.toLocaleLowerCase('sk').startsWith(d.toLocaleLowerCase('sk')));
        if (day < 0)
            continue;
        const table = header.closest('.heading-title')?.nextElementSibling;
        if (!table || table.tagName !== 'TABLE')
            continue;
        const date = dateText.match(/\d{1,2}\.\d{1,2}\.\d{4}/)?.[0] || null;
        const rows = [...table.querySelectorAll('tr')];
        for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length < 2)
                continue;
            const rawName = cleanText(cells[0].textContent);
            const price = cleanText(cells[1].textContent);
            if (!rawName || /^názov$/i.test(rawName) || !price)
                continue;
            const soup = /polievka/i.test(rawName);
            const name = rawName.replace(/^Polievka\s*0[,.]33\s*l\s*:?/i, '').replace(/^\s*(?:I{1,3}|IV|V)\s*[.]\s*/i, '').trim();
            if (!name)
                continue;
            const studentPrices = price.match(/\d+[,.]\d+\s*€/g);
            const displayPrice = studentPrices?.length === 2 ? `${studentPrices[0]} (ISIC) / ${studentPrices[1]}` : price;
            data.push(item(day, soup ? 'Polievka' : 'Hlavné jedlo', name, displayPrice, { date }));
        }
    }
    if (!data.length)
        throw Error('Nenašli sa položky menu Družba Cantina.');
    return data;
}
const RESTAURANTS = [
    { id: 'white', name: 'White Dragon', short: 'White Dragon', location: 'Staré Grunty 18', url: 'https://whitedragon.sk/menucka/', file: 'data/whitedragon.html', parse: parseWhiteDragon, tag: 'Kantína · Binarium' },
    { id: 'eat', name: 'Eat & Meet', short: 'Eat & Meet', location: 'Staré Grunty 36', url: 'https://eatandmeet.sk/tyzdenne-menu', file: 'data/eatandmeet.html', parse: parseEatAndMeet, tag: 'Študentská reštaurácia' },
    { id: 'druzba', name: 'Družba Cantina', short: 'Družba', location: 'Botanická 25', url: 'https://www.druzbacatering.sk/jedalny-listok/', file: 'data/druzba.html', parse: parseDruzba, tag: 'Jedáleň · Družba' }
];
