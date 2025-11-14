import { cn } from "@/lib/utils";

interface BurgerMenuProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export function BurgerMenu({ isOpen, onClick, className }: BurgerMenuProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-6 h-6 bg-transparent cursor-pointer flex flex-col justify-center items-center gap-0",
        className
      )}
      aria-label="Toggle menu"
      aria-expanded={isOpen}
    >
      <span
        className={cn(
          "absolute block h-[2.5px] w-5 bg-muted-foreground rounded-full transition-all duration-250 ease-in-out",
          isOpen ? "rotate-45 top-1/2 -translate-y-1/2" : "top-[6px]"
        )}
      />
      <span
        className={cn(
          "absolute block h-[2.5px] w-5 bg-muted-foreground rounded-full transition-all duration-250 ease-in-out top-1/2 -translate-y-1/2",
          isOpen && "opacity-0 scale-0"
        )}
      />
      <span
        className={cn(
          "absolute block h-[2.5px] w-5 bg-muted-foreground rounded-full transition-all duration-250 ease-in-out",
          isOpen ? "-rotate-45 top-1/2 -translate-y-1/2" : "bottom-[6px]"
        )}
      />
    </button>
  );
}
