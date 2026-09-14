# Kalambury 1 na 1

Gra w kalambury dla dwóch osób, po polsku, na telefon. Dwa kolorowe koła losują
**kategorię** i **zadanie** (pokazuje / pisze / mówi / …), a hasło trafia
**wyłącznie na telefon wykonawcy** — przeciwnik go nie widzi.

Aplikacja działa w przeglądarce i instaluje się na telefonie jak zwykła aplikacja
(PWA). Nie ma kont ani haseł — przy pierwszym uruchomieniu wybierasz gracza,
a telefon go zapamiętuje.

## Co jest w środku

**Dwa tryby gry**

- **Dwa telefony** — jedna osoba tworzy pokój i dostaje 4-znakowy kod, druga go
  wpisuje. Telefony łączą się bezpośrednio (WebRTC), a hasło wysyłane jest tylko
  na urządzenie wykonawcy — na telefonie zgadującego po prostu go nie ma.
- **Jeden telefon** — po zakręceniu kołami aplikacja prosi o podanie telefonu
  i dopiero wtedy pokazuje hasło.

**Reszta**

- Dwa koła losujące z animacją: kategoria i zadanie.
- Zadania: Pokazuje, Pisze, Mówi, Rysuje, Dźwięki — każde z własnymi zasadami,
  do włączenia/wyłączenia; można też **dodać własne zadanie**.
- 19 gotowych zestawów haseł (750 haseł) + **własne kategorie i hasła**.
- Odliczanie czasu (30–120 s lub bez limitu), sygnał dźwiękowy i wibracja na
  ostatnich sekundach.
- Gra do wybranej liczby punktów (3/5/7/10 lub dowolnej). Punkt dostaje ten, kto
  zgadł; mecz kończy się po równej liczbie tur dla obu graczy, a przy remisie
  wchodzi dogrywka.
- Profile graczy ze statystykami, zmiana nazwy i awatara, historia meczów.
- Wszystko zapisuje się na telefonie (localStorage); tryb na jednym telefonie
  działa też bez internetu.

## Uruchomienie

```bash
npm install
npm run dev      # http://localhost:5173 (--host, więc widać też z telefonu w tej samej sieci)
npm run build    # produkcyjna wersja w dist/
npm run preview  # podgląd zbudowanej wersji
```

Do gry potrzeba tylko statycznego hostingu — zawartość `dist/` można wrzucić na
dowolny serwer albo usługę typu Vercel / Netlify / GitHub Pages. Ścieżki są
względne (`base: './'`), więc działa też w podkatalogu.

> Tryb na dwa telefony wymaga HTTPS (albo `localhost`) — przeglądarki nie
> pozwalają na WebRTC na zwykłym `http://`.

## Instalacja na telefonie

- **Android / Chrome**: menu ⋮ → „Dodaj do ekranu głównego”.
- **iPhone / Safari**: przycisk udostępniania → „Dodaj do ekranu początkowego”.

Po instalacji gra otwiera się na pełnym ekranie i działa offline (tryb na jednym
telefonie).

## Jak działa tryb na dwa telefony

Gospodarz pokoju jest „sędzią”: to jego telefon losuje hasła i pilnuje wyniku.
Stan gry rozsyłany jest do drugiego telefonu **po usunięciu hasła**, jeśli ten
gracz akurat zgaduje — czyli hasło fizycznie nie dociera na urządzenie
przeciwnika. Obowiązują ustawienia gospodarza (kategorie, zadania, czas, liczba
punktów).

Do „przedstawienia” telefonów używany jest publiczny serwer PeerJS; sama gra leci
już bezpośrednio między urządzeniami. Jeśli połączenie zerwie się na chwilę,
druga osoba może dołączyć ponownie tym samym kodem i gra wróci w to samo miejsce.

### Własny serwer łączenia i TURN (opcjonalnie)

Domyślnie nie trzeba nic konfigurować. Gdyby publiczny serwer PeerJS okazał się
zawodny albo telefony w sieci komórkowej nie potrafiły się połączyć bezpośrednio,
można podać własne adresy przy budowaniu — zmienne opisane są w `.env.example`:

```bash
cp .env.example .env
# uzupełnij VITE_PEER_* i/lub VITE_TURN_*
npm run build
```

Prosty serwer łączenia do testów uruchamia `npm run peer-server`.

## Testy

```bash
npm run test:e2e
```

Buduje aplikację, podnosi lokalny serwer łączenia i przechodzi w prawdziwej
przeglądarce (Playwright, dwa niezależne konteksty = dwa telefony):

1. **Jeden telefon** — pełny mecz, podanie telefonu, odliczanie do zera, własna
   kategoria, zapis statystyk.
2. **Dwa telefony** — połączenie kodem, pełny mecz i sprawdzenie w każdej rundzie,
   że hasło widzi **dokładnie jeden** telefon (ten wykonawcy), a po rundzie oba.
3. **Własne zadania** — zadanie dodane u gospodarza dociera na koło gościa.

Zrzuty ekranu z przebiegu lądują w `e2e/screenshots/`.

## Struktura

```
src/
  App.tsx              nawigacja, zapis danych, statystyki
  game/
    engine.ts          reguły: losowanie, punkty, koniec meczu (czyste funkcje)
    GameBoard.tsx      wspólna plansza dla obu trybów gry
    sfx.ts             dźwięki i wibracje
  net/peer.ts          pokój 1 na 1 na WebRTC + protokół wiadomości
  screens/             ekrany: menu, gracze, ustawienia, kategorie, gry, statystyki
  components/Wheel.tsx koła losujące (SVG)
  data/words.ts        wbudowane kategorie i zadania
scripts/make-icons.mjs generowanie ikon PWA
e2e/                   testy end-to-end
```
