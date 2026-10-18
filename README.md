# Lépj tovább! – lepj-tovabb.hu

A **Lépj tovább!** 12 alkalmas válásfeldolgozó és újratervező csoport honlapja.
Statikus HTML-oldalak, külső keretrendszer nélkül. Vercelen futnak.

## Mappák

| Mappa | Tartalom |
|---|---|
| `site/` | **A kész honlap.** A Vercel ezt teszi közzé. |
| `site/img/fotok/` | Fotók WebP formátumban, 480–1600 px szélességben (`srcset`) |
| `site/img/logo/` | Logó, favicon, megosztási kép |
| `design/` | A honlapterv forrásfájljai (`.dc.html`) |
| `tools/` | Generátor, amely a tervből elkészíti a `site/` oldalait |

## Oldalak

| Oldal | Cím |
|---|---|
| Főoldal | `/` |
| A program | `/program` |
| Kinek szól? | `/kinek-szol` |
| Válás és gyermekek | `/valas-es-gyermekek` |
| Továbblépés az exkapcsolatból | `/exkapcsolat` |
| Rólunk (koncepció, oktatók) | `/rolunk` |
| Cikkek | `/cikkek` |
| GYIK és jelentkezés | `/jelentkezes` |
| Cikk: Mennyi ideig tart a gyász? | `/cikkek/mennyi-ideig-tart-a-gyasz` |
| Cikk: Mit él át egy gyermek váláskor? | `/cikkek/mit-el-at-egy-gyermek-valaskor` |
| Cikk: Mikor állok készen új kapcsolatra? | `/cikkek/mikor-allok-keszen-uj-kapcsolatra` |
| Adatkezelési tájékoztató | `/adatkezeles` |
| ÁSZF | `/aszf` |
| Impresszum | `/impresszum` |

## Közzététel Vercelen

1. vercel.com → **Add New… → Project** → ezt a repót kell importálni.
2. **Framework Preset:** Other. Build parancs nem kell, a `vercel.json` beállítja a `site/` mappát.
3. **Deploy.** A domain a projekt **Settings → Domains** menüpontjában köthető be (`lepj-tovabb.hu`).

Minden `main` ágra küldött módosítás után a Vercel automatikusan frissíti az oldalt.

## Élesítés előtt

- [ ] Fizetési mód, ÁFA-kezelés, lemondás nélküli távolmaradás szabálya (ÁSZF 6–7. pont).
- [ ] A hello@lepj-tovabb.hu levelezés szolgáltatója (adatfeldolgozóként az adatkezelési tájékoztatóba).
- [ ] 4 GYIK-válasz.
- [ ] Bevétel.hu: az űrlap beágyazási címe (`BEVETEL_URL` a `tools/build.mjs`-ben), valamint a Bevétel.hu üzemeltetőjének cégneve és székhelye az adatkezelési tájékoztatóhoz.
- [ ] Könyvelő / számlázóprogram az adatfeldolgozók között.
- [ ] A jogi dokumentumok (adatkezelés, ÁSZF, impresszum) jogi felülvizsgálata – különösen a fogyasztói elállási jog (ÁSZF 8. pont).
- [ ] Valódi fotó: csoportmunka, helyszín. A többi kép AI-illusztráció, nem valódi résztvevőket ábrázol.
- [ ] A segélyvonal-számok ellenőrzése: 116-123, 116-111, OKIT 06 80 205 520.
- [ ] A `tools/build.mjs` fájlban: `NOINDEX = false` (addig a keresők nem indexelik az oldalt).

A jogi szövegek forrása: `design/jogi/*.html`. A szerkezetük az Együttjól jóváhagyott dokumentumait követi.

## Módosítás a terv alapján

```bash
cd tools
npm install
npm run generate   # design/*.dc.html → site/*.html
```

Kisebb szöveges javításokat közvetlenül a `site/` HTML-fájljaiban is el lehet végezni. A következő generálás viszont felülírja ezeket, ezért tartós változtatásnál a `design/` fájlokat érdemes módosítani.
