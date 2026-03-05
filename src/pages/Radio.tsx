import { LiveDJs } from "@/components/radio/LiveDJs";
import { RadioPlaylists } from "@/components/radio/RadioPlaylists";
import { Radio as RadioIcon } from "lucide-react";

import { Separator } from "@/components/ui/separator";

export default function Radio() {
  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <RadioIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Quantum Club Radio</h1>
          </div>
          <p className="text-muted-foreground">
            Tune in to live DJ broadcasts or stream mood-based playlists
          </p>
        </div>

        {/* Live DJ Broadcasts */}
        <div className="mb-12">
          <LiveDJs />
        </div>

        <Separator className="my-12" />

        {/* Mood-Based Playlists */}
        <RadioPlaylists />
      </div>
    </AppLayout>
  );
}
