export function TrustBadges() {
  return (
    <div className="text-center py-3">
      <p className="text-xs text-muted-foreground/70 tracking-wide">
        GDPR compliant · End-to-end encrypted
      </p>
    </div>
  );
}

export function TrustBadgesMinimal() {
  return (
    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground py-2">
      <span>Secure</span>
      <span>Encrypted</span>
      <span>GDPR</span>
    </div>
  );
}
