import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Guest {
  name?: string;
  email: string;
}

interface GuestEmailInputProps {
  guests: Guest[];
  onChange: (guests: Guest[]) => void;
  maxGuests?: number;
}

export function GuestEmailInput({ guests, onChange, maxGuests = 10 }: GuestEmailInputProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddGuest = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setError("");

    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (guests.some(g => g.email.toLowerCase() === email.toLowerCase())) {
      setError("This email has already been added");
      return;
    }

    if (guests.length >= maxGuests) {
      setError(`Maximum ${maxGuests} guests allowed`);
      return;
    }

    onChange([...guests, { email: email.trim() }]);
    setEmail("");
  };

  const handleRemoveGuest = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(guests.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleAddGuest();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="colleague@example.com"
            className={error ? "border-destructive" : ""}
          />
          {error && (
            <p className="text-xs text-destructive mt-1">{error}</p>
          )}
        </div>
        <Button
          type="button"
          onClick={(e) => handleAddGuest(e)}
          variant="outline"
          size="icon"
          disabled={guests.length >= maxGuests}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {guests.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserPlus className="h-3 w-3" />
            <span>{guests.length} additional {guests.length === 1 ? 'guest' : 'guests'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {guests.map((guest, index) => (
              <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1">
                <span className="text-xs">{guest.email}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleRemoveGuest(e, index)}
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
