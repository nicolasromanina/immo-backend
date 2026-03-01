# Lead Tags Management System

## Overview

The lead tags system provides a way to classify and manage leads effectively, with automatic tracking of contact status and reminder notifications.

## Standard Tags

| Tag | Description | Auto-set | Auto-removed |
|-----|-------------|----------|------------|
| `not-contacted` | Lead has not been contacted yet | ✅ When created | When status changes from 'nouveau' |
| `contacted` | Lead has been contacted | Manual | N/A |
| `urgent` | High priority lead | Manual | Manual |
| `follow-up` | Needs follow-up | Manual | Manual |
| `archived` | Lead archived | Manual | Manual |

## Lead Source Types

Leads are now categorized by source:

- **`contact-form`**: From FirstImmo contact form (publicly accessible, no login required)
- **`document-access-request`**: From document access request system (requires client login)
- **`whatsapp`**: Received via WhatsApp
- **`referral`**: Referral source
- **`direct`**: Direct contact
- **`other`**: Other sources

## Automatic Contact Tracking

### When Lead is Created
- `tags`: `['not-contacted']`
- `firstContactDate`: null
- `notContactedReminderSent`: null

### When Status Changes from 'nouveau' to Anything Else
1. Automatic call to `LeadTagService.markAsContacted(leadId)`
2. Actions:
   - Add tag `contacted`
   - Remove tag `not-contacted`
   - Set `firstContactDate` to current time

### 2-Day Reminder Job
- **Trigger**: Daily scheduled job (see `notifyUncontactedLeadsJob.ts`)
- **Criteria**: Leads with:
  - Tag `not-contacted`
  - Created more than 2 days ago
  - No reminder sent yet (`notContactedReminderSent` is null)
- **Action**:
  - Send notification to promoteur
  - Set `notContactedReminderSent` to current time

## API Endpoints

### Lead Tag Management

#### Add tag to lead
```
POST /api/leads/:id/tags/add
Body: { tag: "string" }
```

#### Remove tag from lead
```
POST /api/leads/:id/tags/remove
Body: { tag: "string" }
```

#### Get leads by tag
```
GET /api/leads/tags/:tag?page=1&limit=20
Response: { leads: Lead[], pagination: {...} }
```

#### Get tag statistics
```
GET /api/leads/stats/tags
Response: { stats: [{ _id: "tag", count: number }] }
```

### Admin Endpoints

#### Trigger uncontacted leads notification job
```
POST /api/admin/jobs/notify-uncontacted-leads
Auth: Admin role required
Response: { success: boolean, message: string }
```

## Frontend Integration

### LeadManagement Page

Location: `promoteur/src/pages/LeadManagement.tsx`

Features:
- Filter leads by tags (not-contacted, contacted, follow-up, urgent)
- View tag statistics
- Add/remove tags
- Mark leads as contacted
- Paginated results

Route: `/lead-management`

Available to users with `viewLeads` permission

## Database Schema

### Lead Model Extensions

```typescript
// In ILead interface
tags: string[]; // Array of tag strings
firstContactDate?: Date; // When promoteur first contacted the lead
notContactedReminderSent?: Date; // When 2-day reminder was sent
source: 'contact-form' | 'document-access-request' | 'whatsapp' | 'referral' | 'direct' | 'other';
```

### Indexes Added

```
- { tags: 1 }
- { source: 1 }
- { promoteur: 1, tags: 1 }
- { createdAt: 1, tags: 1, notContactedReminderSent: 1 } // For 2-day reminder job
```

## Service: LeadTagService

Location: `backend/src/services/LeadTagService.ts`

Methods:
- `addTag(leadId, tag)` - Add tag to lead
- `removeTag(leadId, tag)` - Remove tag from lead
- `markAsContacted(leadId)` - Mark as contacted (sets firstContactDate)
- `getLeadsByTag(promoteurId, tag, page, limit)` - Get paginated leads by tag
- `getLeadsByTags(promoteurId, tags[], page, limit)` - Get leads with multiple tags
- `processNotContactedReminders(dayThreshold)` - Process 2-day reminder job
- `getTagStats(promoteurId)` - Get tag statistics

## Job: notifyUncontactedLeadsJob

Location: `backend/src/jobs/notifyUncontactedLeadsJob.ts`

### Setup Instructions

To integrate with your cron service:

```typescript
// In your cron/scheduler setup file
import { notifyUncontactedLeadsJob } from './jobs/notifyUncontactedLeadsJob';

// Run daily at 9 AM
schedule.scheduleJob('0 9 * * *', () => {
  notifyUncontactedLeadsJob().catch(error => {
    console.error('Uncontacted leads job failed:', error);
  });
});
```

Or trigger manually via admin panel:
```
POST /api/admin/jobs/notify-uncontacted-leads
```

## Notification

When a lead hasn't been contacted after 2 days:

- **Recipient**: Promoteur user
- **Type**: reminder
- **Title**: "Lead non contacté après 2 jours"
- **Message**: "{leadName} depuis le projet \"{projectTitle}\" n'a pas encore été contacté."
- **Priority**: high
- **Channels**: Email + In-app
- **Action**: Link to lead detail page

## Contact Form Flow (FirstImmo)

1. User fills contact form on project page (no login required)
2. Form submitted to `POST /api/leads`
3. Lead created with:
   - `source: 'contact-form'`
   - `tags: ['not-contacted']`
   - `client`: null (if not authenticated) or user ID (if authenticated)
4. Promoteur receives notification of new lead
5. After 2 days, if not contacted, FirstImmo team receives reminder notification
6. FirstImmo team can:
   - Manually mark as contacted in LeadManagement page
   - Transfer to other promoteurs
   - Take action based on uncontacted status

## Best Practices

1. **Use standard tags** - Stick to the standard tags for consistency
2. **Keep tags updated** - Update tags as you work with leads
3. **Monitor reminders** - Check the reminder notifications daily
4. **Follow up quickly** - Respond to leads within 2 days to provide better service
5. **Track conversions** - Update lead status to track the full lifecycle

## Example: Complete Lead Lifecycle

```
Day 0:
- Contact form submitted
- Lead created with source='contact-form', tags=['not-contacted']
- Promoteur notified

Day 1:
- Promoteur reviews lead in LeadManagement
- Adds tag 'urgent' for high-priority client

Day 2:
- FirstImmo reminder sent: "Lead still not contacted"
- Promoteur calls the client

Day 2 (after contact):
- Promoteur updates status from 'nouveau' → 'contacte'
- System automatically:
  - Adds tag 'contacted'
  - Removes tag 'not-contacted'
  - Sets firstContactDate

Day 5:
- Promoteur updates status → 'rdv-planifie'
- Lead continues through pipeline
```
