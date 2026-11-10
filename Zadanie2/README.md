# Obedovka – WEBTE1, zadanie č. 2

Klientská webová aplikácia na zobrazenie obedových menu troch prevádzok v okolí FEI STU.
      link:     https://webte1.fei.stuba.sk/~xhudaka/Zadanie2/

## Zdrojové stránky

- White Dragon – https://whitedragon.sk/menucka/ (obsahové odseky, týždeň 26.–30.10.2026)
- Eat & Meet – https://eatandmeet.sk/tyzdenne-menu (HTML karty podľa dňa)
- Družba Cantina – https://www.druzbacatering.sk/jedalny-listok/ (HTML tabuľky, týždeň 26.–30.10.2026)

Dáta sa získavajú pomocou `fetch`, HTML sa interpretuje cez `DOMParser`, vybrané údaje sa vkladajú bezpečne pomocou `textContent`. Zdroje majú odlišné štruktúry a každý má vlastnú funkciu. Pri chýbajúcich dátach sa zobrazuje informačná hláška. Jedlá White Dragon nemajú samostatné ceny pri každej položke; cena je uvedená na úrovni menu. Pri cenách obsahujúcich dve sumy sa zachovajú obidve. Čas aktualizácie znamená načítanie lokálneho súboru, nie aktualizáciu pôvodnej stránky.

## Knižnice a licencie

- **Normalize.css 8.0.1** – CSS knižnica (MIT), CDN.
- **Day.js 1.11.13** – JavaScriptová pomocná knižnica na dátumy (MIT), CDN.
- **Poppins Regular/Bold** – dodané lokálne WOFF2 súbory, licencia **SIL Open Font License 1.1**, priložená v `fonts/OFL-LICENSE.txt`.

## Použitie AI

Pri vytvorení projektu bol použitý nástroj ChatGPT (OpenAI) na pomoc s návrhom rozhrania, HTML, CSS, JavaScript parsermi a dokumentáciou.

## Pred odovzdaním

1. Overte funkčnosť a responzivitu v Chrome a Firefoxe.
2. Overte HTML na https://validator.w3.org/ a CSS na https://jigsaw.w3.org/css-validator/; výstupy z validátorov uložte do `docs/`.
3. Nahrajte projekt na školský server a priložte URL.
4. Overte, že cvičiaci odsúhlasil výber reštaurácií a lokálny režim bez online proxy.

**Poznámka:** Súbory menu predstavujú snímku HTML v čase stiahnutia, nie živé denné menu. Pri ďalšom týždni treba ich obsah nahradiť novšími HTML súbormi, pričom pri zmene štruktúry môže byť potrebná úprava parsera.
