/**
 * ===============================
 * SHARED COURSE TYPE DEFINITIONS
 * ===============================
 * 
 * Centralized course type definitions to ensure consistency
 * across all components, APIs, and database operations.
 */

// Core course interface matching database schema
export interface Course {
    courseId: string;
    title: string;
    description: string;
    price: number;
    duration: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    image: string;
    features: string[];
    totalEnrollments: number;
    enrolledUsers?: {
        userId?: string;
        email: string;
        enrolledAt: Date;
        paymentId: string;
    }[];
    isActive: boolean;
    createdAt: Date | string;
    updatedAt?: Date | string;
    order: number;
    status?: 'draft' | 'published' | 'archived';
}

// Course creation form data
export interface CourseFormData {
    courseId: string;     // Required: Must match LMS course identifier
    title: string;
    description: string;
    price: number;
    duration: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    image: string;
    features: string[];
    status: 'draft' | 'published';
}

// Course update data
export interface CourseUpdateData extends Partial<CourseFormData> {
    isActive?: boolean;
}

// Course statistics for admin dashboard
export interface CourseStats {
    total: number;
    draft: number;
    published: number;
    archived: number;
    active: number;
    inactive: number;
    totalEnrollments: number;
    totalRevenue?: number;
}

// Public course data (for course listing page)
export interface PublicCourse {
    courseId: string;
    title: string;
    description: string;
    price: number;
    duration: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    image: string;
    features: string[];
    totalEnrollments: number;
    order: number;
}

// API response types
export interface CoursesResponse {
    success: boolean;
    courses: Course[] | PublicCourse[];
    total?: number;
    cached?: boolean;
    timestamp?: string;
    error?: string;
}

export interface CourseResponse {
    success: boolean;
    course?: Course;
    message?: string;
    error?: string;
}