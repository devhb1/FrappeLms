# 🔑 Course ID System - Complete Documentation

## Overview

The **courseId** is the primary identifier for courses in the MaalEdu platform. It is **independent of MongoDB's `_id`** and designed to support integration with external Learning Management Systems (LMS) like Frappe LMS


---

## ✅ System Status: **PRODUCTION READY**

Your courseId implementation is **solid and consistent** across all components:

- ✅ Unique constraint enforced at database level
- ✅ Used consistently in all models (Course, Enrollment, Grant, Affiliate)
- ✅ Properly indexed for fast queries
- ✅ Validated format across all entry points
- ✅ Integrated with Stripe checkout and webhooks
- ✅ Synchronized with Frappe LMS enrollment

---

## 📋 Course ID Formats Supported

### 1. **OpenEdX Format** (Recommended for LMS Integration)
```
course-v1:ORG+COURSE+RUN
```

**Examples:**
```typescript
'course-v1:OpenedX+DemoX+DemoCourse'
'course-v1:MaalDataLabs+maal101+2025_T1'
'course-v1:MAALEDU+blockchain+2025_Q1'
```

**Structure:**
- `course-v1:` - Protocol prefix
- `ORG` - Organization identifier (e.g., MaalDataLabs)
- `COURSE` - Course code (e.g., maal101)
- `RUN` - Course run/term (e.g., 2025_T1)

### 2. **Simple Slug Format** (Easier for Marketing)
```
lowercase-with-hyphens
```

**Examples:**
```typescript
'blockchain-basics'
'advanced-smart-contracts'
'defi-development'
```

**Best For:**
- Marketing URLs
- Short course identifiers
- Internal course codes

### 3. **Custom Format** (Flexible)
```
Any alphanumeric string with: a-zA-Z0-9-_:+.%
```

**Validation Regex:**
```typescript
/^[a-zA-Z0-9-_:+.%]+$/
```

**Examples:**
```typescript
'BC101'
'web3-dev_2025'
'course:advanced:blockchain'
```

---

## 🏗️ Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     COURSE ID LIFECYCLE                         │
└─────────────────────────────────────────────────────────────────┘

1. COURSE CREATION
   ┌──────────────────┐
   │ Admin Dashboard  │ ← Admin manually enters courseId
   │  Create Course   │   (must match LMS system)
   └────────┬─────────┘
            │
            ↓
   ┌──────────────────┐
   │ POST /api/admin/ │ ← Validates uniqueness
   │     courses      │   Checks format
   └────────┬─────────┘
            │
            ↓
   ┌──────────────────┐
   │  Course Model    │ ← Saves with unique courseId
   │  (MongoDB)       │   Creates indexes
   └────────┬─────────┘
            │
            ↓
   ┌──────────────────┐
   │  Redis Cache     │ ← Caches course data
   │   Invalidated    │   (courseId as key)
   └──────────────────┘

2. COURSE SEEDING (Bulk Import)
   ┌──────────────────┐
   │  Static Data     │ ← COURSES array with courseIds
   │  lib/courses.ts  │   (predefined courses)
   └────────┬─────────┘
            │
            ↓
   ┌──────────────────┐
   │  Seeding Utility │ ← Upserts by courseId
   │  course-seeding  │   (updates if exists)
   └────────┬─────────┘
            │
            ↓
   ┌──────────────────┐
   │  Course Model    │ ← Bulk creates/updates
   │  (MongoDB)       │   Preserves courseIds
   └──────────────────┘

3. ENROLLMENT FLOW
   ┌──────────────────┐
   │  User Frontend   │ ← Selects course to enroll
   │  /courses page   │   Gets courseId from card
   └────────┬─────────┘
            │
            ↓
   ┌──────────────────┐
   │ POST /api/       │ ← Receives: { courseId, email }
   │    checkout      │   Validates course exists
   └────────┬─────────┘
            │
            ├─────────────────────────┬─────────────────────┐
            │                         │                     │
            ↓                         ↓                     ↓
   ┌────────────────┐     ┌────────────────┐    ┌────────────────┐
   │ Course Lookup  │     │ Grant Lookup   │    │ Affiliate Check│
   │ (by courseId)  │     │ (by courseId)  │    │ (track sales)  │
   └────────┬───────┘     └────────┬───────┘    └────────┬───────┘
            │                      │                     │
            └──────────────────────┴─────────────────────┘
                                   │
                                   ↓
                       ┌───────────────────┐
                       │ Enrollment Model  │ ← Stores courseId
                       │   (pending)       │   Links to course
                       └─────────┬─────────┘
                                 │
                                 ↓
                       ┌───────────────────┐
                       │  Stripe Checkout  │ ← courseId in metadata
                       │    Session        │   For webhook lookup
                       └─────────┬─────────┘
                                 │
                                 ↓
                       ┌───────────────────┐
                       │  User Pays        │
                       └─────────┬─────────┘
                                 │
                                 ↓
                       ┌───────────────────┐
                       │ Stripe Webhook    │ ← Retrieves courseId
                       │  POST /api/       │   from metadata
                       │    webhook        │
                       └─────────┬─────────┘
                                 │
                                 ↓
                       ┌───────────────────┐
                       │ Update Enrollment │ ← Marks as 'paid'
                       │  status: paid     │   Updates by courseId
                       └─────────┬─────────┘
                                 │
                                 ↓
                       ┌───────────────────┐
                       │ Frappe LMS API    │ ← Sends course_id
                       │  enrollInFrappeLMS│   (courseId parameter)
                       └─────────┬─────────┘
                                 │
                                 ↓
                       ┌───────────────────┐
                       │ User Enrolled in  │ ← Access granted via
                       │   Frappe LMS      │   courseId match
                       └───────────────────┘

4. COURSE MANAGEMENT
   ┌──────────────────┐
   │ Admin Dashboard  │ ← View all courses
   │ /admin-dashboard │   Filter by courseId
   │    /courses      │   Edit course data
   └────────┬─────────┘
            │
            ↓
   ┌──────────────────┐
   │ Course Status    │ ← Toggle active/inactive
   │  Management      │   Change status (draft/published)
   └────────┬─────────┘
            │
            ↓
   ┌──────────────────┐
   │ PATCH /api/admin │ ← Update by courseId
   │  /courses/[id]   │   Preserve courseId
   └────────┬─────────┘
            │
            ↓
   ┌──────────────────┐
   │  Course Model    │ ← courseId never changes
   │  (MongoDB)       │   Only metadata updated
   └────────┬─────────┘
            │
            ↓
   ┌──────────────────┐
   │  Redis Cache     │ ← Cache invalidated
   │   Cleared        │   (courseId key removed)
   └──────────────────
```

---

## 🗄️ Database Schema

### Course Model (`lib/models/course.ts`)

```typescript
{
  courseId: {
    type: String,
    required: true,
    unique: true,      // ← Enforces uniqueness at DB level
    trim: true,
    match: /^[a-zA-Z0-9-_:+.%]+$/
  },
  title: String,       // Display name
  description: String,
  price: Number,
  duration: String,
  level: String,
  image: String,
  features: [String],
  totalEnrollments: Number,
  enrolledUsers: [{
    userId: ObjectId,
    email: String,
    enrolledAt: Date,
    paymentId: String
  }],
  isActive: Boolean,   // Show/hide on /courses
  status: String,      // draft | published | archived
  order: Number,       // Display order
  createdAt: Date
}
```

**Indexes:**
```typescript
courseSchema.index({ isActive: 1, order: 1 });
courseSchema.index({ isActive: 1, price: 1 });
courseSchema.index({ isActive: 1, level: 1 });
// courseId index auto-created by unique: true
```

### Enrollment Model (`lib/models/enrollment.ts`)

```typescript
{
  courseId: String,    // ← Links to Course.courseId (not _id!)
  email: String,
  paymentId: String,
  amount: Number,
  status: String,      // pending | paid | failed
  enrollmentType: String,
  lmsContext: {
    frappeUsername: String,
    frappeEmail: String,
    redirectSource: String
  },
  affiliateData: {
    affiliateEmail: String,
    commissionEligible: Boolean,
    commissionAmount: Number
  },
  grantData: {
    grantId: ObjectId,
    couponCode: String,
    discountPercentage: Number
  },
  verification: {
    paymentVerified: Boolean,
    courseEligible: Boolean
  },
  frappeSync: {
    synced: Boolean,
    syncStatus: String,
    enrollmentId: String  // Frappe's enrollment ID
  }
}
```

**Indexes:**
```typescript
enrollmentSchema.index({ courseId: 1, email: 1 });
enrollmentSchema.index({ status: 1, timestamp: -1 });
enrollmentSchema.index({ enrollmentType: 1, status: 1 });
```

### Grant Model (`lib/models/grant.ts`)

```typescript
{
  courseId: String,    // ← Course for which grant applies
  email: String,
  couponCode: String,
  status: String,      // pending | approved | rejected
  discountPercentage: Number,
  couponUsed: Boolean,
  enrollmentId: ObjectId
}
```

**Indexes:**
```typescript
grantSchema.index({ courseId: 1 });
grantSchema.index({ couponCode: 1 });
```

### Affiliate Model (`lib/models/affiliate.ts`)

```typescript
{
  affiliateId: String,
  email: String,
  stats: {
    totalReferrals: Number,
    conversionRate: Number,
    coursesSold: Map<string, number>  // ← courseId → count
  },
  pendingCommissions: Number
}
```

---

## 🔄 API Endpoints Using Course ID

### 1. **Get Public Courses**
```
GET /api/courses?sortBy=newest
```

**Response:**
```json
{
  "courses": [
    {
      "courseId": "course-v1:MaalDataLabs+maal101+2025_T1",
      "title": "Blockchain Fundamentals",
      "price": 199.99,
      "isActive": true,
      "status": "published"
    }
  ]
}
```

### 2. **Admin - Create Course**
```
POST /api/admin/courses
Content-Type: application/json

{
  "courseId": "course-v1:MAALEDU+web3+2025_Q1",
  "title": "Web3 Development",
  "description": "Learn Web3 from scratch",
  "price": 299.99,
  "duration": "10 weeks",
  "level": "Intermediate",
  "image": "https://...",
  "features": ["Smart Contracts", "DApp Development"]
}
```

**Validation:**
- ✅ Checks if courseId already exists
- ✅ Validates format
- ✅ Returns error if duplicate

### 3. **Admin - Get All Courses**
```
GET /api/admin/courses?status=all
```

**Response:**
```json
{
  "courses": [
    {
      "courseId": "course-v1:MaalDataLabs+maal101+2025_T1",
      "title": "Blockchain Fundamentals",
      "status": "published",
      "isActive": true,
      "totalEnrollments": 45
    }
  ],
  "statistics": {
    "total": 15,
    "published": 10,
    "draft": 3,
    "archived": 2,
    "active": 12,
    "inactive": 3
  }
}
```

### 4. **Admin - Update Course**
```
PATCH /api/admin/courses/[id]
Content-Type: application/json

{
  "title": "Updated Title",
  "price": 249.99,
  "isActive": false
}
```

**Note:** `courseId` is **immutable** - cannot be changed after creation

### 5. **Checkout**
```
POST /api/checkout
Content-Type: application/json

{
  "courseId": "course-v1:MaalDataLabs+maal101+2025_T1",
  "email": "student@example.com",
  "couponCode": "GRANT100",
  "affiliateEmail": "affiliate@example.com"
}
```

**Flow:**
1. Validates course exists using `courseId`
2. Checks for duplicate enrollment (courseId + email)
3. Creates enrollment record with `courseId`
4. Passes `courseId` to Stripe metadata
5. Sends `courseId` to Frappe LMS on completion

### 6. **Webhook Handler**
```
POST /api/webhook
(Stripe webhook event)
```

**Metadata Retrieved:**
```json
{
  "courseId": "course-v1:MaalDataLabs+maal101+2025_T1",
  "email": "student@example.com",
  "enrollmentId": "507f1f77bcf86cd799439011",
  "affiliateEmail": "affiliate@example.com"
}
```

**Actions:**
1. Finds enrollment by enrollmentId
2. Updates status to 'paid'
3. Enrolls in Frappe LMS using `course_id: metadata.courseId`
4. Tracks affiliate sale using courseId

---

## 🔧 Frappe LMS Integration

### Enrollment API Call
```typescript
POST https://learn.maaledu.com/api/method/lms.lms.payment_confirmation.payment_confirmed

{
  "user_email": "student@example.com",
  "course_id": "course-v1:MaalDataLabs+maal101+2025_T1",  // ← courseId
  "paid_status": true,
  "payment_id": "pi_abc123",
  "amount": 199.99,
  "currency": "USD"
}
```

### Course Info API Call
```typescript
GET https://learn.maaledu.com/api/method/lms.lms.payment_confirmation.get_course_info?course_id=course-v1:MaalDataLabs+maal101+2025_T1
```

**Why courseId Matters:**
- Frappe LMS expects the **exact course identifier** from its system
- Using consistent `courseId` ensures enrollment in correct LMS course
- No mapping or translation needed - **direct match**

---

## 🎯 Best Practices

### ✅ DO:
1. **Use OpenEdX format for LMS courses:**
   ```typescript
   'course-v1:MAALEDU+blockchain101+2025_T1'
   ```

2. **Keep courseId immutable:**
   - Never change courseId after creation
   - Update other fields (title, price, etc.) freely

3. **Validate before creating:**
   ```typescript
   const exists = await Course.findOne({ courseId });
   if (exists) throw new Error('Course ID already exists');
   ```

4. **Use courseId for lookups:**
   ```typescript
   // ✅ Good
   const course = await Course.findOne({ courseId: 'blockchain-101' });
   
   // ❌ Avoid (unless you have _id from previous query)
   const course = await Course.findById(objectId);
   ```

5. **Store courseId in all related records:**
   ```typescript
   // Enrollment
   { courseId: 'blockchain-101', email: 'user@example.com' }
   
   // Grant
   { courseId: 'blockchain-101', couponCode: 'SAVE50' }
   
   // Affiliate Stats
   coursesSold: Map { 'blockchain-101' => 10 }
   ```

### ❌ DON'T:
1. **Don't use MongoDB _id as courseId:**
   ```typescript
   // ❌ Bad
   courseId: new ObjectId().toString()
   
   // ✅ Good
   courseId: 'course-v1:MAALEDU+blockchain+2025'
   ```

2. **Don't auto-generate courseId for admin-created courses:**
   - Admin must manually specify courseId to match LMS
   - Auto-generation only acceptable for test/sample courses

3. **Don't allow courseId changes:**
   ```typescript
   // ❌ Bad - allows courseId update
   const updated = await Course.findByIdAndUpdate(id, req.body);
   
   // ✅ Good - prevents courseId modification
   const { courseId, ...updateData } = req.body;
   const updated = await Course.findByIdAndUpdate(id, updateData);
   ```

---

## 🚀 Recommended Enhancements

### 1. **Course ID Validation Helper** (Optional)

Create a utility to validate and suggest courseIds:

```typescript
// lib/utils/course-id-validator.ts

export function validateCourseId(courseId: string): {
  valid: boolean;
  format: 'openedx' | 'slug' | 'custom' | 'invalid';
  suggestions?: string[];
  error?: string;
} {
  if (!courseId || typeof courseId !== 'string') {
    return { valid: false, format: 'invalid', error: 'Course ID is required' };
  }

  const trimmed = courseId.trim();
  
  // Check minimum length
  if (trimmed.length < 3) {
    return { valid: false, format: 'invalid', error: 'Course ID must be at least 3 characters' };
  }

  // Check maximum length
  if (trimmed.length > 100) {
    return { valid: false, format: 'invalid', error: 'Course ID cannot exceed 100 characters' };
  }

  // Check format
  if (!/^[a-zA-Z0-9-_:+.%]+$/.test(trimmed)) {
    return { 
      valid: false, 
      format: 'invalid', 
      error: 'Course ID can only contain: a-z, A-Z, 0-9, -, _, :, +, ., %' 
    };
  }

  // Detect format
  if (/^course-v1:.+\+.+\+.+$/.test(trimmed)) {
    return { valid: true, format: 'openedx' };
  }

  if (/^[a-z0-9-]+$/.test(trimmed)) {
    return { valid: true, format: 'slug' };
  }

  return { valid: true, format: 'custom' };
}

export function suggestCourseId(title: string, org: string = 'MAALEDU'): string[] {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  const year = new Date().getFullYear();
  const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
  
  return [
    // OpenEdX format
    `course-v1:${org}+${slug}+${year}_Q${quarter}`,
    `course-v1:${org}+${slug}+${year}_T1`,
    // Simple slug
    slug,
    // With year
    `${slug}-${year}`
  ];
}
```

**Usage in Admin Form:**
```typescript
const suggestions = suggestCourseId('Blockchain Fundamentals', 'MAALEDU');
// [
//   'course-v1:MAALEDU+blockchain-fundamentals+2025_Q4',
//   'course-v1:MAALEDU+blockchain-fundamentals+2025_T1',
//   'blockchain-fundamentals',
//   'blockchain-fundamentals-2025'
// ]
```

### 2. **Admin UI Enhancement**

Add helper UI to course creation form:

```tsx
// components/admin/course-id-input.tsx

export function CourseIdInput({ value, onChange }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const handleTitleChange = (title: string) => {
    const newSuggestions = suggestCourseId(title);
    setSuggestions(newSuggestions);
  };

  const handleCourseIdChange = (courseId: string) => {
    onChange(courseId);
    const result = validateCourseId(courseId);
    setValidation(result);
  };

  return (
    <div>
      <Label>Course ID</Label>
      <Input 
        value={value} 
        onChange={(e) => handleCourseIdChange(e.target.value)}
        placeholder="course-v1:MAALEDU+course+2025_Q1"
      />
      
      {validation && !validation.valid && (
        <Alert variant="destructive">{validation.error}</Alert>
      )}
      
      {validation && validation.valid && (
        <Alert variant="success">
          ✓ Valid {validation.format} format
        </Alert>
      )}
      
      {suggestions.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-muted-foreground">Suggestions:</p>
          <div className="flex gap-2 flex-wrap">
            {suggestions.map(s => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                onClick={() => handleCourseIdChange(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      <p className="text-sm text-muted-foreground mt-1">
        Must match your LMS course identifier. Common formats:
        <br />
        • OpenEdX: <code>course-v1:ORG+COURSE+RUN</code>
        <br />
        • Simple: <code>blockchain-basics</code>
      </p>
    </div>
  );
}
```

### 3. **Course ID Migration Script** (If Needed)

If you ever need to update courseIds (rare!):

```typescript
// scripts/migrate-course-ids.ts

import connectToDatabase from '@/lib/db';
import { Course, Enrollment, Grant } from '@/lib/models';

async function migrateCourseId(oldId: string, newId: string) {
  await connectToDatabase();

  console.log(`Migrating ${oldId} → ${newId}`);

  // Update Course
  await Course.updateOne({ courseId: oldId }, { courseId: newId });

  // Update Enrollments
  const enrollmentResult = await Enrollment.updateMany(
    { courseId: oldId },
    { courseId: newId }
  );

  // Update Grants
  const grantResult = await Grant.updateMany(
    { courseId: oldId },
    { courseId: newId }
  );

  console.log(`✅ Migration complete:
    - Course: updated
    - Enrollments: ${enrollmentResult.modifiedCount}
    - Grants: ${grantResult.modifiedCount}
  `);
}
```

---

## 📊 Monitoring & Debugging

### Check Course ID Uniqueness
```typescript
// In MongoDB shell or query
db.courses.aggregate([
  { $group: { _id: '$courseId', count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
// Should return empty array (no duplicates)
```

### Find Orphaned Enrollments
```typescript
// Enrollments with courseId not in courses collection
db.enrollments.aggregate([
  {
    $lookup: {
      from: 'courses',
      localField: 'courseId',
      foreignField: 'courseId',
      as: 'course'
    }
  },
  { $match: { course: { $size: 0 } } }
])
```

### Verify Frappe Sync by Course ID
```typescript
const syncStatus = await Enrollment.aggregate([
  { $match: { status: 'paid' } },
  {
    $group: {
      _id: '$courseId',
      total: { $sum: 1 },
      synced: {
        $sum: { $cond: ['$frappeSync.synced', 1, 0] }
      },
      failed: {
        $sum: { $cond: [{ $eq: ['$frappeSync.syncStatus', 'failed'] }, 1, 0] }
      }
    }
  }
]);

console.log(syncStatus);
// [
//   { _id: 'blockchain-101', total: 50, synced: 48, failed: 2 },
//   { _id: 'course-v1:...', total: 30, synced: 30, failed: 0 }
// ]
```

---

## 🎓 Summary

### Your System is **Production Ready** ✅

**Strengths:**
1. ✅ Unique courseId enforced at database level
2. ✅ Consistent usage across all models
3. ✅ Proper indexing for performance
4. ✅ Flexible format support (OpenEdX, slugs, custom)
5. ✅ Integrated with Stripe and Frappe LMS
6. ✅ Admin controls courseId manually (ensures LMS sync)
7. ✅ Immutable courseId prevents data corruption

**Optional Enhancements:**
- 🟡 Add courseId validation helper utility
- 🟡 Enhance admin UI with suggestions
- 🟡 Add real-time format validation in frontend
- 🟡 Create courseId migration script for emergencies

**No Critical Issues Found** 🎉

Your courseId implementation is **solid, scalable, and production-ready**. The system properly maintains data integrity across enrollments, grants, affiliates, and the Frappe LMS integration.

---

## 🔗 Related Documentation

- [Course Management System](./COURSE_MANAGEMENT_SYSTEM.md)
- [Frappe LMS Integration](./FRAPPE_LMS_MIGRATION_PLAN.md)
- [Grant & Discount System](./GRANT_DISCOUNT_SYSTEM_COMPLETE.md)
- [Affiliate System](./AFFILIATE_IMPLEMENTATION_PLAN.md)

---

**Last Updated:** November 24, 2025  
**Status:** ✅ Production Ready  
**Version:** 2.0
