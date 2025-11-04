import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

interface LegalSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-semibold text-foreground mb-4">{title}</h2>
      <div className="space-y-4 text-muted-foreground leading-relaxed">
        {children}
      </div>
      <Separator className="my-8" />
    </section>
  );
}
