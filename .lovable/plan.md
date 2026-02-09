

# Fix Auth Page: Hardcode "INVITE-ONLY" Text + Bold Uppercase Title

## Problem
1. The badge text shows the raw translation key `signup.inviteOnly` instead of the expected text
2. The user wants the text to read **"INVITE-ONLY"** (with hyphen) -- not "INVITE ONLY"
3. The "Welcome Back" title needs to be **Inter Bold, ALL CAPS** to match brand identity

## Changes (2 files)

### File 1: `src/pages/Auth.tsx` (line 524, 529)

**Title (line 524):** Change font class from `font-semibold` to `font-black uppercase`

```
Before: text-4xl tracking-tight text-foreground font-semibold
After:  text-4xl tracking-tight text-foreground font-black uppercase
```

**Badge text (line 529):** Hardcode "INVITE-ONLY" instead of using the translation function, to guarantee it always renders correctly regardless of i18n loading state

```
Before: {t('signup.inviteOnly')}
After:  INVITE-ONLY
```

### File 2: `src/i18n/locales/en/auth.json` (line 27)

Update the translation value to include the hyphen for consistency:

```
Before: "inviteOnly": "INVITE ONLY"
After:  "inviteOnly": "INVITE-ONLY"
```

### File 3: `src/i18n/locales/nl/auth.json` (line 26)

Same update for Dutch:

```
Before: "inviteOnly": "ALLEEN OP UITNODIGING"
After:  "inviteOnly": "INVITE-ONLY"
```

(Keep it as "INVITE-ONLY" in Dutch too since it is a brand term)

## Result

- Title renders as **"WELCOME BACK"** (or **"JOIN THE QUANTUM CLUB"** for signup) in heavy bold uppercase
- Badge always shows **"INVITE-ONLY"** with lock icon, no translation flicker
