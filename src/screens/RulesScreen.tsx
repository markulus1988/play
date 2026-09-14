import { Card, TopBar } from '../components/ui'
import type { ModeDef } from '../types'

export function RulesScreen({ modes, onBack }: { modes: ModeDef[]; onBack: () => void }) {
  return (
    <div className="content">
      <TopBar title="Zasady" onBack={onBack} />

      <Card>
        <div className="stack" style={{ gap: 8 }}>
          <h3>Jak się gra</h3>
          <p className="muted">
            Gracie na zmianę: raz Ty wykonujesz zadanie, raz przeciwnik. Zgadujący kręci dwoma
            kołami – pierwsze wybiera kategorię, drugie sposób przekazania hasła. Hasło pokazuje się
            wyłącznie wykonawcy.
          </p>
          <p className="muted">
            Punkt zdobywa ten, kto zgadł hasło w czasie. Mecz wygrywa pierwszy gracz, który dobije
            do ustawionej liczby punktów – zawsze po równej liczbie tur dla obu graczy, więc nie da
            się wygrać „przewagą kolejki”.
          </p>
        </div>
      </Card>

      <Card>
        <div className="stack">
          <h3>Zadania z drugiego koła</h3>
          {modes.map((m) => (
            <div className="row" key={m.id} style={{ alignItems: 'flex-start' }}>
              <div style={{ fontSize: 22, width: 30 }}>{m.emoji}</div>
              <div style={{ minWidth: 0 }}>
                <b style={{ color: m.color }}>{m.label}</b>
                <div className="hint">{m.rules || 'Zasady ustalacie sami.'}</div>
              </div>
            </div>
          ))}
          <div className="hint">Wybierzcie w ustawieniach, które zadania mają być na kole.</div>
        </div>
      </Card>

      <Card>
        <div className="stack" style={{ gap: 8 }}>
          <h3>Dwa telefony</h3>
          <p className="muted">
            Jedna osoba tworzy pokój i dostaje czteroznakowy kod. Druga wpisuje ten kod – telefony
            łączą się bezpośrednio ze sobą. Hasło wysyłamy tylko na telefon wykonawcy; na telefonie
            zgadującego nie ma go wcale, więc nie da się podejrzeć.
          </p>
          <p className="muted">
            Ustawienia gry (kategorie, czas, liczba punktów) bierzemy od gospodarza pokoju. Jeśli
            połączenie padnie, druga osoba może dołączyć ponownie tym samym kodem – gra wróci w tym
            samym miejscu.
          </p>
        </div>
      </Card>

      <Card>
        <div className="stack" style={{ gap: 8 }}>
          <h3>Jeden telefon</h3>
          <p className="muted">
            Po zakręceniu kołami aplikacja poprosi o podanie telefonu wykonawcy i dopiero wtedy
            pokaże hasło. Zgadujący w tym momencie nie patrzy na ekran.
          </p>
        </div>
      </Card>

      <Card>
        <div className="stack" style={{ gap: 8 }}>
          <h3>Instalacja na telefonie</h3>
          <p className="muted">
            Android/Chrome: menu ⋮ → „Dodaj do ekranu głównego”. iPhone/Safari: przycisk udostępnij
            → „Dodaj do ekranu początkowego”. Po instalacji gra działa jak zwykła aplikacja, także
            bez internetu (tryb na jednym telefonie).
          </p>
        </div>
      </Card>
    </div>
  )
}
