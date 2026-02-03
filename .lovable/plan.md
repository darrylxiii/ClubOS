
# Enhanced GTM DataLayer with Phone & Value Calculation

## Summary

Update the partner funnel to pass all user data and calculated conversion value to Google Tag Manager's dataLayer for Enhanced Conversions and accurate attribution.

## Data to Push

| Field | Source | Example |
|-------|--------|---------|
| `user_data.email` | `contact_email` | `john@qualogy.com` |
| `user_data.phone_number` | `phoneNumber` (E.164) | `+31612345678` |
| `user_data.address.first_name` | Parsed from `contact_name` | `John` |
| `user_data.address.last_name` | Parsed from `contact_name` | `Doe` |
| `value` | `estimated_roles_per_year × €15,000` | `150000` (for 10 roles) |
| `currency` | Platform setting | `EUR` |

## Value Calculation

```text
Potential Value = Number of Roles × Average Placement Fee

Example:
- Roles per year: 10
- Average fee: €15,000
- Conversion value: €150,000
```

This allows Google Ads to:
- Track high-value conversions properly
- Optimize bidding for quality leads
- Use Enhanced Conversions for better matching

---

## Files to Modify

### 1. FunnelSteps.tsx (Line ~361)

Pass all required data via React Router state:

```typescript
// Current (line 361)
navigate(`/partnership-submitted/${encodedCompanyName}`);

// Updated
navigate(`/partnership-submitted/${encodedCompanyName}`, {
  state: {
    contactName: formData.contact_name,
    contactEmail: formData.contact_email,
    contactPhone: phoneNumber,
    estimatedRolesPerYear: formData.estimated_roles_per_year 
      ? parseInt(formData.estimated_roles_per_year) 
      : null,
  }
});
```

### 2. PartnershipSubmitted.tsx

Update the success page to:
1. Read navigation state
2. Calculate potential value (roles × €15,000)
3. Push enhanced data to dataLayer

```typescript
import { useParams, useNavigate, useLocation } from "react-router-dom";

interface LocationState {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  estimatedRolesPerYear?: number;
}

// Platform average fee (matches platform_settings.estimated_placement_fee)
const AVERAGE_PLACEMENT_FEE = 15000;

export default function PartnershipSubmitted() {
  const { companyName } = useParams<{ companyName?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const state = location.state as LocationState | null;

  useEffect(() => {
    if (window.dataLayer) {
      const decodedName = companyName ? decodeURIComponent(companyName) : undefined;
      
      // Parse name into first/last
      const nameParts = (state?.contactName || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Calculate potential conversion value
      const estimatedRoles = state?.estimatedRolesPerYear || 0;
      const conversionValue = estimatedRoles * AVERAGE_PLACEMENT_FEE;

      window.dataLayer.push({
        event: 'partnership_submitted',
        companyName: decodedName,
        
        // Enhanced Conversions user data
        user_data: {
          email: state?.contactEmail?.toLowerCase().trim(),
          phone_number: state?.contactPhone, // E.164 format
          address: {
            first_name: firstName,
            last_name: lastName,
          }
        },
        
        // Conversion value for Google Ads
        value: conversionValue,
        currency: 'EUR',
        estimated_roles: estimatedRoles,
        
        // Flat fields for flexibility
        userEmail: state?.contactEmail?.toLowerCase().trim(),
        userName: state?.contactName,
        userPhone: state?.contactPhone,
      });
    }
  }, [companyName, state]);
```

---

## Expected DataLayer Output

After a partner submits with 10 roles/year:

```javascript
{
  event: "partnership_submitted",
  companyName: "Qualogy",
  
  // Enhanced Conversions (for Google Ads)
  user_data: {
    email: "john@qualogy.com",
    phone_number: "+31612345678",
    address: {
      first_name: "John",
      last_name: "Doe"
    }
  },
  
  // Conversion Value (for Smart Bidding)
  value: 150000,
  currency: "EUR",
  estimated_roles: 10,
  
  // Flat fields (for other tools)
  userEmail: "john@qualogy.com",
  userName: "John Doe",
  userPhone: "+31612345678"
}
```

---

## GTM Configuration Benefits

| Feature | What It Enables |
|---------|-----------------|
| `user_data.email` | Enhanced Conversions matching |
| `user_data.phone_number` | Phone number matching for ads |
| `user_data.address` | Name-based matching for Facebook CAPI |
| `value` + `currency` | Value-based Smart Bidding optimization |
| `estimated_roles` | Custom dimension for analytics |

---

## Security Considerations

- PII passed via React Router state (in-memory, not in URL)
- Email normalized (lowercase, trimmed)
- Phone already in E.164 format from validation
- No sensitive data persisted in browser history
- GDPR-compliant: data only pushed after user consent (agreed_privacy checkbox)

---

## Implementation Steps

1. Update `FunnelSteps.tsx` line 361 to pass state with all user data
2. Update `PartnershipSubmitted.tsx` to read state and push enhanced dataLayer
3. Verify dataLayer output in browser console
4. Configure GTM to read `user_data` for Enhanced Conversions
5. Test conversion tracking in Google Ads
