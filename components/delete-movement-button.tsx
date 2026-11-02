"use client";

import { TrashIcon } from "@/components/icons";

type DeleteMovementButtonProps = {
  label?: string;
  iconOnly?: boolean;
  confirmMessage?: string;
};

export function DeleteMovementButton({
  label = "Elimina",
  iconOnly = false,
  confirmMessage = "Sei sicuro di voler eliminare questo movimento?",
}: DeleteMovementButtonProps) {
  return (
    <button
      type="submit"
      className={`btn ${iconOnly ? "icon-btn danger" : ""}`.trim()}
      style={iconOnly ? undefined : { background: "#b91c1c" }}
      aria-label={label}
      title={label}
      onClick={(e) => {
        const confirmed = window.confirm(confirmMessage);

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
