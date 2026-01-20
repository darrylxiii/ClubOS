# Testing Guide: Phases 6-8 Features

## Overview
This guide will help you test the real-time updates, waitlist, and analytics features implemented in Phases 6-8.

## ✅ Feature Checklist

### Phase 6: Real-time Updates
- ✅ Database realtime enabled for bookings table
- ✅ `useBookingRealtime` hook created
- ✅ Live booking count displayed
- ✅ Slot refresh on new bookings
- ✅ Notification when slots are booked/cancelled

### Phase 7: Analytics & Monitoring
- ✅ `booking_funnel_analytics` table created
- ✅ `booking_slot_analytics` table created
- ✅ `useBookingAnalytics` hook created
- ✅ Funnel step tracking (landing → calendar → time → form → submit → confirm)
- ✅ Slot view tracking
- ✅ Popular time analytics (by hour, day of week)
- ✅ Conversion rate tracking

### Phase 8: Advanced Features
- ✅ `booking_waitlist` table created
- ✅ `WaitlistForm` component created
- ✅ Waitlist shown when no slots available
- ✅ `custom_answers` column added to bookings
- ✅ Buffer time support (buffer_before_minutes, buffer_after_minutes)
- ✅ Auto-notification on cancellation

---

## 🧪 Testing Instructions

### Test 1: Real-time Booking Updates

**Setup:**
1. Open your booking page in **two separate browser windows** (use different browsers or incognito mode)
2. Navigate to `/scheduling` (or your booking link URL)

**Steps:**
1. In **Window 1**: Select a date and view available time slots
2. In **Window 2**: Select the same date and view the same time slots
3. In **Window 2**: Book one of the available slots (complete the full booking)
4. **Expected Result in Window 1**: 
   - Toast notification: "A slot was just booked. Refreshing availability..."
   - The booked slot should disappear from the list
   - Live bookings counter should increase

**What to verify:**
- Real-time updates work without manual refresh
- Slot availability updates immediately
- Toast notifications appear

---

### Test 2: Waitlist Feature

**Setup:**
1. Find a booking link with limited availability or create test bookings to fill all slots

**Steps:**
1. Navigate to the booking page
2. Select a date with **no available slots**
3. **Expected Result**: 
   - "No times available" message appears
   - "Join Waitlist" button is visible
4. Click "Join Waitlist"
5. Fill out the waitlist form:
   - Name: "Test User"
   - Email: "test@example.com"
   - Preferred Time: "Morning (8 AM - 12 PM)"
6. Submit the form
7. **Expected Result**:
   - Success toast: "Added to waitlist! We'll notify you when a slot opens up."
   - Dialog closes

**Verify in Database:**
```sql
SELECT * FROM booking_waitlist 
WHERE guest_email = 'test@example.com' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Data:**
- `status`: 'waiting'
- `preferred_time_range`: 'morning'
- `expires_at`: 7 days from now

---

### Test 3: Waitlist Notification on Cancellation

**Setup:**
1. Have at least one waitlist entry (from Test 2)
2. Have a confirmed booking for the same date

**Steps:**
1. Go to backend → bookings table
2. Find a confirmed booking
3. Update its status to 'cancelled'
4. Check the waitlist table

**Expected Result:**
```sql
SELECT status, notified_at, metadata 
FROM booking_waitlist 
WHERE status = 'notified' 
ORDER BY notified_at DESC 
LIMIT 1;
```
- `status` should change from 'waiting' to 'notified'
- `notified_at` should be set to current timestamp
- `metadata` should contain the cancelled booking_id

---

### Test 4: Analytics Funnel Tracking

**Steps:**
1. Navigate through the complete booking flow:
   - Land on booking page (landing)
   - View calendar (calendar_view)
   - Select a date and view time slots (time_select)
   - Select a time and view form (form_view)
   - Submit the form (form_submit)
   - See confirmation (confirmation)
2. Wait 10 seconds for analytics to be recorded

**Verify in Database:**
```sql
SELECT 
  session_id,
  step,
  step_duration_seconds,
  timezone,
  created_at
FROM booking_funnel_analytics
ORDER BY created_at DESC
LIMIT 20;
```

**Expected Data:**
- Each step should be recorded with the same `session_id`
- Steps should be in order: landing → calendar_view → time_select → form_view → form_submit → confirmation
- `step_duration_seconds` should show time spent on each step
- `timezone` should match your browser timezone

---

### Test 5: Slot Analytics & Popularity Tracking

**Steps:**
1. View several time slots on the booking page (this tracks views)
2. Book a slot (this tracks bookings)
3. Check the analytics

**Verify in Database:**
```sql
SELECT 
  date,
  hour,
  day_of_week,
  bookings_count,
  views_count,
  conversion_rate,
  avg_booking_lead_time_hours
FROM booking_slot_analytics
ORDER BY date DESC, hour ASC
LIMIT 20;
```

**Expected Data:**
- `views_count` increases when you view time slots
- `bookings_count` increases when you complete a booking
- `conversion_rate` = (bookings_count / views_count) * 100
- `day_of_week`: 0 = Sunday, 1 = Monday, etc.
- `avg_booking_lead_time_hours`: Hours between booking creation and scheduled time

---

### Test 6: Popular Time Slots Analysis

**Query to find most popular booking times:**
```sql
SELECT 
  hour,
  day_of_week,
  SUM(bookings_count) as total_bookings,
  SUM(views_count) as total_views,
  AVG(conversion_rate) as avg_conversion
FROM booking_slot_analytics
GROUP BY hour, day_of_week
ORDER BY total_bookings DESC
LIMIT 10;
```

**Insights you can derive:**
- Which hours get the most bookings
- Which days of the week are most popular
- Which time slots have the best conversion rates
- Booking patterns (morning vs afternoon vs evening)

---

### Test 7: Funnel Drop-off Analysis

**Query to analyze where users drop off:**
```sql
WITH funnel_counts AS (
  SELECT 
    step,
    COUNT(DISTINCT session_id) as unique_sessions,
    AVG(step_duration_seconds) as avg_duration
  FROM booking_funnel_analytics
  GROUP BY step
)
SELECT 
  step,
  unique_sessions,
  ROUND(avg_duration::numeric, 1) as avg_duration_sec,
  ROUND(
    100.0 * unique_sessions / LAG(unique_sessions) OVER (ORDER BY 
      CASE step 
        WHEN 'landing' THEN 1 
        WHEN 'calendar_view' THEN 2 
        WHEN 'time_select' THEN 3 
        WHEN 'form_view' THEN 4 
        WHEN 'form_submit' THEN 5 
        WHEN 'confirmation' THEN 6 
      END
    ),
    1
  ) as conversion_from_previous
FROM funnel_counts
ORDER BY CASE step 
  WHEN 'landing' THEN 1 
  WHEN 'calendar_view' THEN 2 
  WHEN 'time_select' THEN 3 
  WHEN 'form_view' THEN 4 
  WHEN 'form_submit' THEN 5 
  WHEN 'confirmation' THEN 6 
END;
```

**What to look for:**
- Drop-off between time_select → form_view (users not selecting a time)
- Drop-off between form_view → form_submit (form abandonment)
- Overall conversion rate from landing to confirmation

---

## 🐛 Common Issues & Solutions

### Issue 1: Real-time updates not working

**Symptoms:**
- Bookings don't appear in other windows
- No toast notifications

**Solutions:**
1. Check if realtime is enabled:
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'bookings';
```
Expected: Should return 1 row

2. Check browser console for errors
3. Verify the channel is subscribed (check console logs)

---

### Issue 2: Analytics not recording

**Symptoms:**
- No data in `booking_funnel_analytics` table
- No data in `booking_slot_analytics` table

**Solutions:**
1. Check RLS policies allow inserts:
```sql
SELECT * FROM pg_policies 
WHERE tablename IN ('booking_funnel_analytics', 'booking_slot_analytics');
```

2. Check browser console for errors
3. Verify the analytics hook is being called (add console.logs)

---

### Issue 3: Waitlist not appearing

**Symptoms:**
- No "Join Waitlist" button when slots are full

**Solutions:**
1. Verify all slots are actually booked for that date
2. Check that `slots.length === 0` in the component
3. Look for errors in browser console

---

## 📊 Key Metrics to Monitor

### Booking Funnel Metrics:
- **Landing → Confirmation**: Overall conversion rate
- **Time Select → Form View**: Time slot selection rate
- **Form View → Form Submit**: Form completion rate
- **Average time per step**: User engagement

### Slot Analytics Metrics:
- **Peak booking hours**: When users prefer to book
- **Peak booking days**: Most popular days
- **Conversion rate by time slot**: Which times convert best
- **Booking lead time**: How far in advance users book

### Waitlist Metrics:
- **Waitlist size**: How many users waiting
- **Notification success rate**: How many get notified
- **Waitlist → Booking conversion**: How many waitlist users book

---

## 🎯 Success Criteria

All tests pass if:

✅ **Real-time**: Bookings appear in other windows within 2 seconds
✅ **Waitlist**: Users can join waitlist when no slots available
✅ **Auto-notification**: Waitlist users notified on cancellations
✅ **Funnel tracking**: All 6 steps recorded with correct session_id
✅ **Slot analytics**: Views and bookings tracked correctly
✅ **Popular times**: Can identify most popular booking times
✅ **Drop-off analysis**: Can see where users abandon the flow

---

## 📝 Next Steps

After testing, you can:

1. **Build Analytics Dashboard**: Create visualizations for the analytics data
2. **Email Notifications**: Implement waitlist email notifications
3. **Custom Questions**: Add support for custom booking questions
4. **Recurring Availability**: Implement recurring time patterns
5. **Smart Recommendations**: Use analytics to suggest best booking times

---

## 🔗 Quick Links

- View bookings: `/backend/tables/bookings`
- View waitlist: `/backend/tables/booking_waitlist`
- View funnel analytics: `/backend/tables/booking_funnel_analytics`
- View slot analytics: `/backend/tables/booking_slot_analytics`

---

**Note**: The analytics hooks use `as any` type assertions to bypass TypeScript errors since the new tables haven't been synced to the types file yet. This will be resolved after the next deployment.
