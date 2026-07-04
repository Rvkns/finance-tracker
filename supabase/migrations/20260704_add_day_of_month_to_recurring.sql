-- Migration: Add day_of_month to recurring_expenses
-- Aggiunge il giorno del mese in cui avviene l'addebito automatico
-- Questo permette di mostrare "Addebito il 5°" sulla Dashboard invece di "Spesa Fissa"
-- e di registrare la transazione con la data corretta del mese corrente

ALTER TABLE public.recurring_expenses
    ADD COLUMN IF NOT EXISTS day_of_month SMALLINT
    CHECK (day_of_month BETWEEN 1 AND 31);

COMMENT ON COLUMN public.recurring_expenses.day_of_month IS
    'Giorno del mese (1-31) in cui avviene l''addebito automatico. NULL se variabile.';
