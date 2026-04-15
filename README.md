# Flight Logbook Starter

Starter project per un logbook voli con gestione costi.

## Stack

- Next.js App Router
- TypeScript
- Prisma
- SQLite
- autenticazione email/password con cookie di sessione httpOnly firmato

## Cosa include già

- registrazione utente
- login/logout
- protezione delle pagine riservate
- settings con:
  - tariffa noleggio oraria
  - tariffa istruttore oraria
- nuova ricarica
- nuovo volo
  - inserimento da orametro
  - oppure da durata manuale
  - istruttore opzionale
- dashboard con saldo e registro movimenti
- storicizzazione delle tariffe applicate al volo

## Formula costi

- costo noleggio = durataOre × tariffaNoleggio
- costo istruttore = durataOre × tariffaIstruttore, solo se è presente un istruttore
- movimento volo salvato come importo negativo

## Avvio locale

1. Copia il file di ambiente:

```bash
cp .env.example .env
```

1. Installa le dipendenze:

```bash
npm install
```

1. Genera il client Prisma:

```bash
npm run db:generate
```

1. Applica le migration:

```bash
npm run db:deploy
```

Per sviluppo puoi usare anche:

```bash
npm run db:migrate
```

1. Avvia il progetto:

```bash
npm run dev
```

## Seed opzionale

Per creare un utente demo:

```bash
npm run db:seed
```

Credenziali demo:

- `demo@example.com`
- `demo12345`

## Variabili ambiente

Nel file `.env`:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="metti-qui-un-segreto-lungo-e-casuale"
APP_URL="http://localhost:3000"
```

## Deploy

Per pubblicarlo subito senza accessi indesiderati:

- imposta un `AUTH_SECRET` robusto
- usa `NODE_ENV=production`
- se fai deploy su Vercel o simili, configura le env vars nel pannello del provider
- valuta presto il passaggio da SQLite a Postgres se vuoi multi-device più robusto o hosting serverless più semplice

## Struttura rapida

- `app/dashboard` dashboard principale
- `app/new-flight` inserimento volo
- `app/new-payment` inserimento pagamento
- `app/edit-flight/[id]` modifica volo
- `app/edit-payment/[id]` modifica pagamento
- `app/settings` tariffe
- `app/api/*` route handlers
- `prisma/schema.prisma` schema database

## Prossimi step naturali

- edit/delete movimenti
- aeroporto partenza/arrivo
- tipo missione
- export CSV/PDF
- statistiche ore volate
- multi-aeromobile
- reset password
