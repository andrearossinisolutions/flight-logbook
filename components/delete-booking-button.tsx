"use client";

import { TrashIcon } from "@/components/icons";

type DeleteBookingButtonProps = {
  label?: string;
  iconOnly?: boolean;
};

export function DeleteBookingButton({
  label = "Elimina prenotazione",
  iconOnly = false,
}: DeleteBookingButtonProps) {
  return (
    <button
      type="submit"
      className={`btn ${iconOnly ? "icon-btn danger" : ""}`.trim()}
      style={iconOnly ? undefined : { background: "#b91c1c" }}
      aria-label={label}
      title={label}
      onClick={(e) => {
        const confirmed = window.confirm(
          "Sei sicuro di voler eliminare questa prenotazione?"
        );

        if (!confirmed) {
          e.preventDefault();
        }
      }}
    >
      {iconOnly ? (
        <TrashIcon size={18} />
      ) : (
        label
      )}
    </button>
  );
}
