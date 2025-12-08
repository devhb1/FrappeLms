// ===== CENTRALIZED SERVICE EXPORTS =====

// User service
export { UserService, default as UserServiceDefault } from './user';

// Affiliate service
export * from './affiliate';

// Course service
export * from './course';

// Enrollment service
export * from './enrollment';

// FrappeLMS service
export * from './frappeLMS';

// Payout service (NEW: handles affiliate payouts)
export * from './payout';

// Commission utilities (NEW: centralized commission calculations)
export * from '../utils/commission';

// Future services will be added here
// export { GrantService } from './grant';
// export { EmailService } from '../emails/service';
