import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--paper-2)] group-[.toaster]:text-ink group-[.toaster]:border-[1.5px] group-[.toaster]:border-[var(--ink)] group-[.toaster]:!shadow-[4px_4px_0_var(--ink)] group-[.toaster]:font-sans group-[.toaster]:-rotate-[0.5deg]",
          description: "group-[.toast]:text-[var(--ink-soft)]",
          actionButton: "group-[.toast]:bg-[var(--marker-teal)] group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-[var(--paper-sunk)] group-[.toast]:text-ink",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
