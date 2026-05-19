export type ReminderFormValues = {
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  hasTime: boolean;
  notes: string;      // Descrizione promemoria
};

export function parseReminderFormData(formData: FormData) {
  const dateRaw = String(formData.get("date") ?? "").trim();
  const hasTime = formData.get("hasTime") === "true" || formData.get("hasTime") === "on";
  const timeRaw = String(formData.get("time") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();

  if (!dateRaw) {
    throw new Error("La data è obbligatoria.");
  }

  if (!notesRaw) {
    throw new Error("La descrizione del promemoria è obbligatoria.");
  }

  const [year, month, day] = dateRaw.split("-").map(Number);
  if (!year || !month || !day || Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new Error("Formato data non valido.");
  }

  let hours = 0;
  let minutes = 0;

  if (hasTime && timeRaw) {
    const [h, m] = timeRaw.split(":").map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m) && h >= 0 && h < 24 && m >= 0 && m < 60) {
      hours = h;
      minutes = m;
    } else {
      throw new Error("Orario non valido.");
    }
  }

  // Costruisce la data nel fuso orario locale del server
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  return {
    date,
    notes: notesRaw,
  };
}

export function buildReminderInitialValues(args: {
  date: Date;
  notes: string | null;
}): Partial<ReminderFormValues> {
  const d = new Date(args.date);
  
  // Estrae anno, mese, giorno locali
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  const hours = d.getHours();
  const minutes = d.getMinutes();
  const hasTime = hours !== 0 || minutes !== 0;
  
  const timeStr = hasTime 
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    : "12:00"; // default placeholder

  return {
    date: dateStr,
    time: timeStr,
    hasTime,
    notes: args.notes ?? "",
  };
}
