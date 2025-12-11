# Course Management System - Complete Guide

## Overview

The MaalEdu platform now has a comprehensive course management system with full status control, public visibility management, and complete database synchronization across all modules (enrollments, grants, affiliates, users).

---

## 🎯 Course Status System

### Three-Tier Status Management

1. **Publication Status** (`status` field)
   - `draft` - Course in development, not visible to public
   - `published` - Course ready and visible on /courses page
   - `archived` - Course retired, hidden but data preserved

2. **Active/Inactive Flag** (`isActive` field)
   - `true` - Course appears on /courses page (if published)
   - `false` - Course hidden from /courses page
   - Independent of status for granular control

3. **Visibility Logic**
   - **Public /courses page**: Only shows courses where `isActive: true` AND `status: 'published'`
   - **Admin panel**: Shows ALL courses regardless of status
   - **Enrollments**: Preserved for all courses, even archived ones

---

## 🔐 Admin Course Catalog Features

### Visual Course Cards
Located at: `/admin-dashboard/courses`

Each course card displays:
- ✅ Course image/thumbnail
- ✅ Title, description, and level
- ✅ Course ID (unique identifier)
- ✅ Price and enrollment count
- ✅ Feature list (first 4 items)
- ✅ Duration with clock icon
- ✅ Status badges (Published/Draft/Archived + Active/Inactive)
- ✅ Action buttons

### Admin Actions Available

#### 1. **Edit Course** ✏️
- Modify title, description, price, features
- Change level (Beginner/Intermediate/Advanced)
- Update images and duration
- All changes sync to database immediately

#### 2. **Activate/Deactivate** ▶️⏸️
- **Activate**: Makes course visible on /courses page
- **Deactivate**: Hides from /courses but preserves all data
- Toggle with one click
- Confirmation dialog for safety

#### 3. **Change Status** 
- **📝 Draft**: Mark as work-in-progress (hidden from public)
- **🚀 Publish**: Make available on /courses page (auto-activates)
- **🗄️ Archive**: Retire course (hidden, data preserved)
- Smart warnings if course has enrollments

#### 4. **Archive Course** 🗄️
- Soft delete with full data preservation
- Special warning if course has active enrollments
- All enrollment records remain intact
- Students can still access via LMS

---

## 📊 Statistics Dashboard

Admin sees comprehensive metrics:
- **Total Courses**: All courses in system
- **Published**: Courses marked as published
- **Active**: Courses visible on /courses page
- **Drafts**: Work-in-progress courses
- **Archived**: Retired courses
- **Total Enrollments**: Across all courses

---

## 🔄 Database Synchronization

### Enrollment Records
```typescript
// Always preserved, regardless of course status
{
  courseId: string,
  email: string,
  status: 'paid' | 'grant',
  lmsContext: {
    enrollmentStatus: 'enrolled',
    frappeUsername: string
  },
  affiliateData?: {
    affiliateEmail: string,
    commissionAmount: number
  }
}
```

### Grant Records
```typescript
// Linked to courseId, preserved even if course archived
{
  courseId: string,
  email: string,
  status: 'approved' | 'pending' | 'rejected',
  couponCode?: string
}
```

### Affiliate Commissions
```typescript
// Tracked per enrollment, independent of course status
{
  affiliateEmail: string,
  courseId: string,
  commissionAmount: number,
  status: 'pending' | 'paid'
}
```

### User Purchase History
```typescript
// Complete audit trail maintained
{
  email: string,
  courseId: string,
  amount: number,
  stripeSessionId: string,
  enrolledAt: Date
}
```

---

## 🌐 Public Course Display

### /courses Page Behavior

**Shows courses where:**
```typescript
{
  isActive: true,
  status: 'published'
}
```

**Hides courses where:**
- `isActive: false` - Admin deactivated
- `status: 'draft'` - Still in development
- `status: 'archived'` - Retired from catalog

**Sorting Options:**
- Custom order (admin-defined priority)
- Newest first
- Most popular (enrollment count)
- Price: Low to High
- Price: High to Low
- Alphabetical

**Filtering:**
- By level: Beginner/Intermediate/Advanced
- All filters work with Redis caching

---

## 🚀 Course Creation Workflow

### 1. Create New Course
```typescript
POST /api/admin/courses
{
  courseId: "blockchain-fundamentals-2025",  // Must match LMS
  title: "Blockchain Fundamentals",
  description: "...",
  price: 199.99,
  duration: "8 weeks",
  level: "Beginner",
  image: "https://...",
  features: ["Feature 1", "Feature 2"],
  status: "draft"  // or "published"
}
```

### 2. Seed Courses (Bulk Import)
- Click "Seed Courses" in admin panel
- Imports predefined course catalog
- Auto-assigns order numbers
- Sets proper status and activation

### 3. Course Appears on /courses
- Set `status: "published"`
- Ensure `isActive: true`
- Course immediately visible to public
- Redis cache auto-clears

---

## ⚙️ API Endpoints

### Public API
```bash
GET /api/courses
# Query params:
# - level: Beginner|Intermediate|Advanced
# - sortBy: custom|newest|popular|price_low|price_high|alphabetical
# - limit: 1-50

# Returns only: isActive=true AND status=published
```

### Admin API
```bash
# List all courses (admin only)
GET /api/admin/courses
# Query params:
# - status: draft|published|archived|all
# - sortBy: order|newest|title|enrollments|price
# - limit: default 100

# Get single course details
GET /api/admin/courses/[courseId]

# Create new course
POST /api/admin/courses
# Body: { courseId, title, description, price, ... }

# Update course (status, activation, content)
PUT /api/admin/courses/[courseId]
# Body: { status?, isActive?, title?, price?, ... }

# Archive course (soft delete)
DELETE /api/admin/courses/[courseId]
# Or use: PUT with { status: 'archived' }
```

---

## 🔒 Data Integrity Guarantees

### 1. **Enrollment Preservation**
- ✅ Enrollments NEVER deleted with course
- ✅ Students retain LMS access
- ✅ All payment records preserved
- ✅ Affiliate commissions maintained

### 2. **Grant Application History**
- ✅ Approved grants remain valid
- ✅ Coupon codes still work
- ✅ Application records preserved
- ✅ Admin can review history anytime

### 3. **Affiliate Commission Tracking**
- ✅ Pending payouts calculated correctly
- ✅ Commission history maintained
- ✅ Links to archived courses preserved
- ✅ Revenue reports remain accurate

### 4. **User Purchase History**
- ✅ Complete transaction log
- ✅ Stripe session IDs preserved
- ✅ Refund tracking intact
- ✅ Invoice generation still works

---

## 🎨 UI/UX Features

### Admin Dashboard Cards
- **Responsive Grid**: 1 col (mobile) → 2 col (tablet) → 3 col (desktop)
- **Image Fallback**: Shows colored initial if no image
- **Status Indicators**: Color-coded badges
- **Enrollment Warning**: Alert if deactivating course with students
- **Action Grouping**: Primary actions on top, status changes below
- **Toast Notifications**: Real-time feedback for all actions

### Course Status Colors
- 🟢 **Green**: Published & Active
- 🟡 **Yellow**: Draft
- 🔴 **Red**: Archived
- ⚪ **Gray**: Inactive

### Confirmation Dialogs
- Activate/Deactivate: Simple yes/no
- Status Change: Shows impact explanation
- Archive: Special warning if enrollments exist

---

## 📝 Best Practices

### Course Lifecycle Management

1. **Creating New Course**
   ```
   Create as Draft → Add content → Preview → Publish
   ```

2. **Temporarily Hiding Course**
   ```
   Deactivate (keeps published status, just hides from public)
   ```

3. **Retiring Old Course**
   ```
   Archive (preserves all data, hides from everywhere except admin)
   ```

4. **Updating Active Course**
   ```
   Edit directly (no need to deactivate)
   Cache auto-clears on save
   ```

### Database Maintenance

- **Never hard delete** courses with enrollments
- **Always use soft delete** (archive status)
- **Cache clears automatically** on course updates
- **Indexes optimized** for common queries

---

## 🧪 Testing Checklist

### Admin Functions
- [ ] Create new course (draft)
- [ ] Publish course (appears on /courses)
- [ ] Deactivate course (disappears from /courses)
- [ ] Activate course (reappears on /courses)
- [ ] Edit course details
- [ ] Change status (draft ↔ published ↔ archived)
- [ ] Archive course with enrollments (warning shown)
- [ ] Seed courses (all appear on /courses if published)

### Public Visibility
- [ ] /courses shows only active published courses
- [ ] Draft courses hidden from public
- [ ] Archived courses hidden from public
- [ ] Inactive courses hidden from public
- [ ] Sorting works correctly
- [ ] Filtering by level works
- [ ] Cache invalidation works

### Data Integrity
- [ ] Enrollments preserved after archive
- [ ] Grant applications still accessible
- [ ] Affiliate commissions calculated correctly
- [ ] Purchase history intact
- [ ] LMS sync continues working

---

## 🚨 Important Notes

### Course ID Requirements
- Must be unique across system
- Should match LMS course ID exactly
- Cannot be changed after creation
- Used for all integrations (Stripe, LMS, etc.)

### Enrollment Impact
- Deactivating: Students can still access via LMS
- Archiving: Students can still access via LMS
- Never breaks student access
- Only affects new enrollments

### Cache Management
- Redis cache auto-clears on course updates
- /courses page refreshes immediately
- Admin panel always shows live data
- No manual cache clearing needed

---

## 🎓 Example Scenarios

### Scenario 1: New Course Launch
```
1. Admin creates course with status="draft"
2. Admin adds content, features, pricing
3. Admin tests checkout flow
4. Admin changes status to "published"
5. Course auto-activates and appears on /courses
6. Students can enroll immediately
```

### Scenario 2: Seasonal Course
```
1. Course published and active during season
2. Admin deactivates when season ends
3. Course hidden from /courses but data preserved
4. Next season: Admin activates again
5. Course reappears, all history intact
```

### Scenario 3: Course Retirement
```
1. Admin archives old course
2. Course status changed to "archived"
3. isActive set to false
4. All 50 enrollments preserved
5. Students can still access via LMS
6. No new enrollments possible
7. Admin can still view in dashboard
```

---

## 📚 Summary

The MaalEdu course management system provides:

✅ **Complete Admin Control**: Create, edit, activate, deactivate, archive
✅ **Public Visibility Management**: Granular control over /courses display
✅ **Data Integrity**: All records preserved across status changes
✅ **Professional UI**: Card-based catalog with comprehensive actions
✅ **Smart Warnings**: Protects against accidental data loss
✅ **Redis Caching**: Fast public page loads with auto-invalidation
✅ **Full Synchronization**: Enrollments, grants, affiliates, users all synced
✅ **Audit Trail**: Complete history of all changes
✅ **Safe Operations**: Soft deletes, confirmations, rollback capability

**The system is production-ready and maintains data integrity across all operations!**
