"use client";

import { useFormStatus } from "react-dom";
import { ReactNode } from "react";

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loadingText?: string;
  className?: string;
}

export function SubmitButton({ 
  children, 
  loadingText = "Salvataggio...", 
  className = "btn",
  ...props 
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button 
      {...props}
      type="submit" 
      disabled={pending || props.disabled}
      className={`${className} ${pending ? 'opacity-75 cursor-not-allowed' : ''}`}
      style={{ ...props.style, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
    >
      {pending && (
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {pending ? loadingText : children}
    </button>
  );
}
