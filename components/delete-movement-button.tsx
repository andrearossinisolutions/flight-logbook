"use client";

type DeleteMovementButtonProps = {
  label?: string;
};

export function DeleteMovementButton({
  label = "Elimina",
}: DeleteMovementButtonProps) {
  return (
    <button
      type="submit"
      className="btn"
      style={{ background: "#b91c1c" }}
      onClick={(e) => {
        const confirmed = window.confirm(
          "Sei sicuro di voler eliminare questo movimento?"
        );

        if (!confirmed) {
          e.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}