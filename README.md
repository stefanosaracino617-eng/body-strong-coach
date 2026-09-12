# Body Strong Coach

Crea una web app in italiano, mobile-first, per la gestione delle schede di

allenamento della palestra Body Strong Fitness Club. Usa Supabase per

database e autenticazione.

CONTESTO DEL PROGETTO (vale per tutto il seguito)

Ruoli: un unico 'gestore' (il titolare) e i 'clienti'.

Il cliente si registra da solo, il gestore approva. Il cliente dichiara i

propri obiettivi. Il gestore costruisce la scheda scegliendo esercizi da un

catalogo, con possibilita di aggiungere esercizi liberi fuori catalogo. Ogni

scheda ha una data di scadenza obbligatoria: alla scadenza esce dalla vista

del cliente ma non viene cancellata, resta nello storico visibile al solo

gestore. Un cliente ha al massimo una scheda attiva. Il cliente consulta la

scheda durante l'allenamento, spunta gli esercizi svolti e annota il peso

usato.

Gruppi muscolari (elenco chiuso): cardio, pettorali, spalle e trapezio,

bicipiti e brachiale, tricipiti, dorsali, gambe e glutei, polpacci,

addominali.

Gli esercizi cardio si misurano in minuti, tutti gli altri in serie e

ripetizioni.

LINEE GUIDA GRAFICHE (da rispettare in ogni schermata)

Tema scuro. Colori esatti, senza varianti:

- Sfondo pagina #003459

- Superficie card #0B4573

- Bordo card #1A5480

- Testo principale #FFFFFF

- Testo secondario #A9C6DD

- Azione principale (pulsanti) #1080CC, testo bianco in grassetto

- Pulsante premuto #0C6FB4

- Link e etichette accentate #58ADEC

- Completato #2FBF71

- Scadenza in avvicinamento #F2A93B

- Errore #E5555B

Caratteri da Google Fonts: Montserrat 600/700 per titoli e nomi degli

esercizi, Manrope 400/600 per testo e descrizioni.

Angoli arrotondati 14px per le card, 12px per i pulsanti, 10px per i campi.

Spaziature multiple di 8px. Pulsanti e campi alti almeno 48px. Superfici

piatte con bordo sottile: nessuna ombra pesante, nessun gradiente.

Testo corrente mai sotto i 16px. Interfaccia interamente in italiano.

PASSO 1 - DA COSTRUIRE ADESSO

Crea la tabella profili collegata a auth.users con i campi: ruolo, nome,

cognome, email, telefono, data_nascita, sesso, stato ('in_attesa',

'approvato', 'sospeso'), consenso_privacy (booleano), data_consenso,

note_gestore, created_at.

Registrazione pubblica: il cliente crea l'account con email e password,

compila i dati anagrafici e spunta obbligatoriamente il consenso privacy.

Alla creazione ruolo = 'cliente' e stato = 'in_attesa'.

Un cliente con stato 'in_attesa' vede soltanto una schermata di attesa

approvazione, senza accesso a nient'altro. Il gestore ha una pagina dove

approva o rifiuta le registrazioni in attesa.

Attiva le policy RLS: ogni cliente legge e modifica solo la propria riga,

il gestore legge e modifica tutte le righe.

Fermati qui: non costruire ancora schede, esercizi o obiettivi.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/26e44ff3-c4d8-4fe7-a8ee-c82f3579708f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
