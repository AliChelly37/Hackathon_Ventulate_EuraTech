import * as React from "react";
import { cn } from "@/lib/utils";
import { Underline } from "./SketchStroke";

interface BaseProps {
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
}

export const SketchInput = React.forwardRef<
  HTMLInputElement,
  BaseProps & React.InputHTMLAttributes<HTMLInputElement>
>(({ label, error, hint, id, className, ...props }, ref) => {
  const inputId = id ?? React.useId();
  const [focused, setFocused] = React.useState(false);
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block font-hand font-semibold text-[0.95rem] text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          className={cn(
            "w-full bg-[var(--paper-sunk)] px-3 py-2.5 font-sans text-base text-ink outline-none border-0 border-b-2 transition-colors",
            error ? "border-b-[var(--marker-red)]" : "border-b-[var(--ink-faint)] focus:border-b-[var(--marker-teal)]",
            "placeholder:text-[var(--ink-faint)]",
            className,
          )}
          {...props}
        />
        {focused && !error && <Underline className="-bottom-1.5" delay={0} />}
      </div>
      {error ? (
        <p className="text-sm font-hand text-[var(--marker-red)]">↯ {error}</p>
      ) : hint ? (
        <p className="text-sm text-[var(--ink-soft)]">{hint}</p>
      ) : null}
    </div>
  );
});
SketchInput.displayName = "SketchInput";

export const SketchTextarea = React.forwardRef<
  HTMLTextAreaElement,
  BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ label, error, hint, id, className, ...props }, ref) => {
  const inputId = id ?? React.useId();
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block font-hand font-semibold text-[0.95rem] text-ink">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          "w-full min-h-[96px] bg-[var(--paper-sunk)] px-3 py-2.5 font-sans text-base text-ink outline-none border-0 border-b-2 transition-colors r-2",
          error ? "border-b-[var(--marker-red)]" : "border-b-[var(--ink-faint)] focus:border-b-[var(--marker-teal)]",
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="text-sm font-hand text-[var(--marker-red)]">↯ {error}</p>
      ) : hint ? (
        <p className="text-sm text-[var(--ink-soft)]">{hint}</p>
      ) : null}
    </div>
  );
});
SketchTextarea.displayName = "SketchTextarea";