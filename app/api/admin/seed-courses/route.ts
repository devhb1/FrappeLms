/**
 * ===============================
 * COURSE SEEDING API ENDPOINT
 * ===============================
 * 
 * Professional seeding endpoint for course management
 * Allows team to seed courses via API calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    seedCoursesToDatabase,
    createSampleCourse,
    verifySeeding,
    quickSetup
} from '@/lib/utils/course-seeding';

export async function POST(request: NextRequest) {
    try {
        // Authentication check - require admin access
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json(
                { error: "Admin access required for course seeding" },
                { status: 403 }
            );
        }

        const { action } = await request.json();

        let result: any;

        switch (action) {
            case 'seed':
                console.log('🌱 Seeding courses from static data...');
                result = await seedCoursesToDatabase();
                break;

            case 'sample':
                console.log('🧪 Creating sample course...');
                result = await createSampleCourse();
                break;

            case 'verify':
                console.log('🔍 Verifying seeding status...');
                result = await verifySeeding();
                break;

            case 'quick-setup':
                console.log('🚀 Running quick setup...');
                result = await quickSetup();
                break;

            default:
                return NextResponse.json(
                    {
                        error: 'Invalid action',
                        validActions: ['seed', 'sample', 'verify', 'quick-setup']
                    },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            success: true,
            action,
            result,
            timestamp: new Date().toISOString(),
            performedBy: session.user.email
        });

    } catch (error) {
        console.error('Course seeding API error:', error);

        return NextResponse.json({
            success: false,
            error: 'Seeding operation failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        title: 'Course Seeding API',
        description: 'Professional course seeding utilities for MaalEdu',
        endpoints: {
            'POST /api/admin/seed-courses': {
                description: 'Perform course seeding operations',
                authentication: 'Admin required',
                actions: {
                    seed: 'Seed all static courses to database',
                    sample: 'Create a sample course for testing',
                    verify: 'Check sync status between static and database',
                    'quick-setup': 'Complete setup (seed + sample + verify)'
                }
            }
        },
        usage: {
            curl: [
                'curl -X POST /api/admin/seed-courses -H "Content-Type: application/json" -d \'{"action":"seed"}\'',
                'curl -X POST /api/admin/seed-courses -H "Content-Type: application/json" -d \'{"action":"quick-setup"}\''
            ],
            javascript: `
fetch('/api/admin/seed-courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'quick-setup' })
})
.then(response => response.json())
.then(data => console.log(data));
            `.trim()
        },
        version: '1.0.0'
    });
}