# Vista cliente della scheda

## Obiettivo
Rendere la home del cliente utile durante l’allenamento e mantenere ordinato anche l’editor del gestore, senza aggiungere registrazioni o consuntivi.

## Interventi
- Sulla home del cliente approvato, caricare solo la sua scheda attiva e non scaduta.
- Se presente, mostrare titolo, scadenza in formato italiano, giorni rimanenti e note del gestore; altrimenti mostrare esattamente “La tua scheda è in preparazione”.
- Raggruppare gli esercizi per etichetta di sessione e mostrare tutte le sessioni chiuse all’apertura, con il relativo numero di esercizi.
- Al tocco, aprire o richiudere una sessione senza alterare le altre.
- Per ogni esercizio mostrare, nell’ordine richiesto: immagine, descrizione, errori comuni e soli parametri valorizzati.
- Per gli esercizi cardio mostrare i minuti; per gli altri mostrare serie × ripetizioni.
- Usare immagini firmate del catalogo privato, centrate su fondo bianco, senza ritaglio o deformazione e con larghezza massima di 300 px.
- Applicare lo stesso comportamento richiudibile alle sessioni nell’editor del gestore, inizialmente tutte chiuse.
- Mantenere testo ampio, contrasto elevato e comandi comodi su telefono.

## Dettagli tecnici
- Estendere il caricamento degli esercizi della scheda con descrizione, errori comuni e dati necessari alla visualizzazione.
- Separare il caricamento della scheda cliente da quello del gestore, aggiungendo il controllo sulla data di scadenza solo alla vista cliente.
- Riutilizzare un componente di presentazione per sessioni ed esercizi, lasciando i controlli di modifica esclusivamente nell’editor gestore.
- Non modificare permessi o struttura dati: il cliente resta in sola lettura.

## Verifica
- Controllare home cliente con e senza scheda valida.
- Controllare apertura/chiusura delle sessioni e assenza dei campi vuoti.
- Verificare immagini e leggibilità su viewport mobile e desktop.
- Verificare che l’editor gestore conservi tutte le operazioni esistenti dentro i pannelli richiudibili.
