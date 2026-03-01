# Cron Jobs Configuration

## Overview

The backend uses `node-cron` for scheduling jobs. All jobs are automatically started when the server starts.

## Uncontacted Leads Notification Job

**Purpose**: Notify promoteurs about leads that haven't been contacted after 2 days.

### Configuration

Add these environment variables to your `.env` file:

```env
# Uncontacted Leads Job Configuration
# Enable/disable the job (default: enabled)
UNCONTACTED_LEADS_CRON_ENABLED=true

# Cron schedule (default: daily at 9 AM UTC)
# Format: minute hour day-of-month month day-of-week
# Examples:
#   '0 9 * * *'     = Daily at 9 AM
#   '0 */4 * * *'   = Every 4 hours
#   '0 9 * * MON'   = Every Monday at 9 AM
#   '*/15 * * * *'  = Every 15 minutes
UNCONTACTED_LEADS_CRON='0 9 * * *'
```

### Schedule Format

The cron schedule follows the standard cron expression format:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 7, Sunday = 0 or 7)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

### Common Schedules

| Schedule | Frequency |
|----------|-----------|
| `0 9 * * *` | Daily at 9 AM |
| `0 */6 * * *` | Every 6 hours |
| `0 */12 * * *` | Every 12 hours |
| `0 9 * * MON-FRI` | Weekdays at 9 AM |
| `0 9 * * 0` | Sundays at 9 AM |
| `*/30 * * * *` | Every 30 minutes |

### Default Configuration

- **Schedule**: `0 9 * * *` (Daily at 9 AM UTC)
- **Enabled**: True by default
- **Day Threshold**: 2 days (hardcoded)

### What the Job Does

1. Finds all leads with:
   - Tag: `'not-contacted'`
   - Created more than 2 days ago
   - No reminder sent yet (`notContactedReminderSent` is null)

2. For each lead:
   - Sends email notification to promoteur
   - Sends in-app notification to promoteur
   - Sets `notContactedReminderSent` to current time

3. Logs job execution to audit logs

### Monitoring

Check logs for job execution:

```bash
# Look for these log messages:
# [UncontactedLeadsJob] Running at <timestamp>
# [UncontactedLeadsJob] Job completed successfully
# [UncontactedLeadsJob] Job failed: <error>
```

### Manual Trigger

You can manually trigger the job via the admin API:

```bash
curl -X POST http://localhost:5000/api/admin/jobs/notify-uncontacted-leads \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": true,
  "message": "Job executed successfully"
}
```

---

## Other Cron Jobs

See individual job files for configuration:

- `documentExpiryJob` - Document expiry notifications
- `leadFollowUpJob` - Lead follow-up reminders
- `subscriptionBillingJob` - Subscription billing
- `appointmentReminderJob` - Appointment reminders
- `invoiceReminderJob` - Invoice reminders
- `trustScoreRecalculationJob` - Trust score updates
- And more...

Each job follows the same pattern:
1. Check environment variable `{JOB_NAME}_CRON_ENABLED`
2. Use environment variable `{JOB_NAME}_CRON` for schedule (if set)
3. Otherwise use default schedule in the job file

---

## Best Practices

1. **Stagger Job Times**: Don't run all jobs at the same time to avoid database load spikes
2. **Monitor Execution**: Check logs regularly for job failures
3. **Timezone**: Cron schedules are in UTC by default
4. **Testing**: Test schedule changes in development first
5. **Fallback**: If a job fails, it logs to audit logs and retries next scheduled time

---

## Example Configuration

`.env` file with recommended schedule spacing:

```env
# 9 AM UTC - Uncontacted leads notification
UNCONTACTED_LEADS_CRON='0 9 * * *'

# 10 AM UTC - Lead follow-up reminders
LEAD_FOLLOWUP_CRON='0 10 * * *'

# 11 AM UTC - Appointment reminders
APPOINTMENT_REMINDER_CRON='0 11 * * *'

# 12 PM UTC - Subscription billing
SUBSCRIPTION_BILLING_CRON='0 12 * * *'

# 2 AM UTC - Trust score recalculation (off-hours)
TRUST_SCORE_CRON='0 2 * * *'
```

This spreads jobs throughout the day to avoid thundering herd problem.
