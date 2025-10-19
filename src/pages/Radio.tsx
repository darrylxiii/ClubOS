import { LiveDJs } from "@/components/radio/LiveDJs";
import { Radio as RadioIcon } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

export default function Radio() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <RadioIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Quantum Club Radio</h1>
          </div>
          <p className="text-muted-foreground">
            Tune in to live DJ broadcasts from The Quantum Club
          </p>
        </div>

        <LiveDJs />
      </div>
    </AppLayout>
  );
}
