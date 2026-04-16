"use client";

type DeleteMovementButtonProps = {
  label?: string;
  iconOnly?: boolean;
};

export function DeleteMovementButton({
  label = "Elimina",
  iconOnly = false,
}: DeleteMovementButtonProps) {
  return (
    <button
      type="submit"
      className={`btn ${iconOnly ? "icon-btn danger" : ""}`.trim()}
      style={iconOnly ? undefined : { background: "#b91c1c" }}
      aria-label={label}
      title={label}
      onClick={(e) => {
        const confirmed = window.confirm(
          "Sei sicuro di voler eliminare questo movimento?"
        );

        if (!confirmed) {
          e.preventDefault();
        }
      }}
    >
      {iconOnly ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="18"
          height="18"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      ) : (
        label
      )}
    </button>
  );
}
