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
        "relative w-10 h-[30px] bg-transparent cursor-pointer flex flex-col justify-center items-center gap-[5px] group",
        className
      )}
      aria-label="Toggle menu"
      aria-expanded={isOpen}
    >
      <span
        className={cn(
          "block h-[3px] w-full bg-foreground rounded-full transition-all duration-300 ease-in-out origin-left",
          isOpen && "rotate-45 translate-x-[5px] translate-y-[-2px]"
        )}
      />
      <span
        className={cn(
          "block h-[3px] w-full bg-foreground rounded-full transition-all duration-300 ease-in-out",
          isOpen && "opacity-0 w-0"
        )}
      />
      <span
        className={cn(
          "block h-[3px] w-full bg-foreground rounded-full transition-all duration-300 ease-in-out origin-left",
          isOpen && "-rotate-45 translate-x-[5px] translate-y-[2px]"
        )}
      />
    </button>
  );
}
