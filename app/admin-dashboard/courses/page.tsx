'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast, Toaster } from 'sonner';
import type { Course, CourseStats, CourseFormData } from '@/lib/types/course';

export default function CourseManagementPage() {
    const { data: session } = useSession();
    const [courses, setCourses] = useState<Course[]>([]);
    const [stats, setStats] = useState<CourseStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);

    // Form state for new course
    const [newCourse, setNewCourse] = useState<CourseFormData>({
        courseId: '',
        title: '',
        description: '',
        price: 0,
        duration: '',
        level: 'Beginner',
        image: '',
        features: [''],
        status: 'draft'
    });

    // Form state for editing course
    const [editCourse, setEditCourse] = useState<CourseFormData>({
        courseId: '',
        title: '',
        description: '',
        price: 0,
        duration: '',
        level: 'Beginner',
        image: '',
        features: [''],
        status: 'draft'
    });

    useEffect(() => {
        if (session?.user?.role === 'admin') {
            fetchCourses();
        }
    }, [session]);

    const fetchCourses = async () => {
        try {
            const response = await fetch('/api/admin/courses');
            const data = await response.json();

            if (data.success) {
                setCourses(data.courses);
                setStats(data.statistics);
            }
        } catch (error) {
            console.error('Failed to fetch courses:', error);
            toast.error('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const handleSeedCourses = async (action: string) => {
        setSeeding(true);
        try {
            const response = await fetch('/api/admin/seed-courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });

            const result = await response.json();

            if (result.success) {
                toast.success(`${action} completed successfully!`);
                await fetchCourses(); // Refresh course list
            } else {
                toast.error(`${action} failed: ${result.error}`);
            }
        } catch (error) {
            toast.error(`${action} failed`);
        } finally {
            setSeeding(false);
        }
    };

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch('/api/admin/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newCourse,
                    features: newCourse.features.filter(f => f.trim())
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Course created successfully!');
                setShowCreateForm(false);
                setNewCourse({
                    title: '',
                    description: '',
                    price: 0,
                    duration: '',
                    level: 'Beginner',
                    image: '',
                    features: [''],
                    status: 'draft'
                });
                await fetchCourses();
            } else {
                toast.error(`Failed to create course: ${result.details}`);
            }
        } catch (error) {
            toast.error('Failed to create course');
        }
    };

    const addFeature = () => {
        setNewCourse(prev => ({
            ...prev,
            features: [...prev.features, '']
        }));
    };

    const updateFeature = (index: number, value: string) => {
        setNewCourse(prev => ({
            ...prev,
            features: prev.features.map((f, i) => i === index ? value : f)
        }));
    };

    const removeFeature = (index: number) => {
        setNewCourse(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }));
    };

    // Edit course functions
    const handleEditCourse = async (course: Course) => {
        try {
            // Fetch the complete course data for editing
            const response = await fetch(`/api/admin/courses/${encodeURIComponent(course.courseId)}`);
            const result = await response.json();

            if (result.success) {
                const courseData = result.course;
                setEditingCourse(course);
                setEditCourse({
                    title: courseData.title || '',
                    description: courseData.description || '',
                    price: courseData.price || 0,
                    duration: courseData.duration || '',
                    level: courseData.level || 'Beginner',
                    image: courseData.image || '',
                    features: courseData.features && courseData.features.length > 0 ? courseData.features : [''],
                    status: courseData.status || (courseData.isActive ? 'published' : 'draft')
                });
                setShowEditForm(true);
            } else {
                toast.error('Failed to load course data');
            }
        } catch (error) {
            toast.error('Failed to load course for editing');
        }
    };

    const handleUpdateCourse = async () => {
        if (!editingCourse) return;

        try {
            const response = await fetch(`/api/admin/courses/${encodeURIComponent(editingCourse.courseId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...editCourse,
                    features: editCourse.features.filter(f => f.trim())
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Course updated successfully!');
                setShowEditForm(false);
                setEditingCourse(null);
                setEditCourse({
                    title: '',
                    description: '',
                    price: 0,
                    duration: '',
                    level: 'Beginner',
                    image: '',
                    features: [''],
                    status: 'draft'
                });
                await fetchCourses();
            } else {
                toast.error(`Failed to update course: ${result.details}`);
            }
        } catch (error) {
            toast.error('Failed to update course');
        }
    };

    const addEditFeature = () => {
        setEditCourse(prev => ({
            ...prev,
            features: [...prev.features, '']
        }));
    };

    const updateEditFeature = (index: number, value: string) => {
        setEditCourse(prev => ({
            ...prev,
            features: prev.features.map((f, i) => i === index ? value : f)
        }));
    };

    const removeEditFeature = (index: number) => {
        setEditCourse(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }));
    };

    // ===== COURSE STATUS MANAGEMENT FUNCTIONS =====

    /**
     * Toggle course active/inactive status
     * Active courses appear on /courses page, inactive ones don't
     */
    const handleToggleActive = async (course: Course) => {
        const newStatus = !course.isActive;
        const action = newStatus ? 'activate' : 'deactivate';

        if (!confirm(`Are you sure you want to ${action} "${course.title}"?\n\n${newStatus ? 'This will make the course visible on /courses page.' : 'This will hide the course from /courses page (but preserve all data).'}`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/courses/${encodeURIComponent(course.courseId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isActive: newStatus,
                    status: newStatus ? 'published' : course.status
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success(`Course ${action}d successfully!`);
                await fetchCourses();
            } else {
                toast.error(`Failed to ${action} course`);
            }
        } catch (error) {
            toast.error(`Error ${action}ing course`);
        }
    };

    /**
     * Change course status (draft/published/archived)
     */
    const handleChangeStatus = async (course: Course, newStatus: 'draft' | 'published' | 'archived') => {
        if (course.status === newStatus) return;

        const statusMessages = {
            draft: 'This will mark the course as draft (hidden from public).',
            published: 'This will publish the course and make it visible on /courses page.',
            archived: 'This will archive the course. Archived courses are hidden but all enrollment data is preserved.'
        };

        if (!confirm(`Change "${course.title}" to ${newStatus}?\n\n${statusMessages[newStatus]}`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/courses/${encodeURIComponent(course.courseId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    isActive: newStatus === 'published'  // Auto-activate if publishing
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success(`Course status changed to ${newStatus}!`);
                await fetchCourses();
            } else {
                toast.error(`Failed to change status: ${result.details}`);
            }
        } catch (error) {
            toast.error('Error changing course status');
        }
    };

    /**
     * Permanently archive a course (soft delete)
     */
    const handleArchiveCourse = async (course: Course) => {
        const hasEnrollments = (course.totalEnrollments || 0) > 0;
        const warningMessage = hasEnrollments
            ? `⚠️ WARNING: This course has ${course.totalEnrollments} enrollments!\n\nArchiving will:\n✓ Hide from public /courses page\n✓ Preserve all enrollment records\n✓ Keep all user data intact\n\nStudents can still access via LMS.\n\nContinue?`
            : `Archive "${course.title}"?\n\nThis will hide it from /courses but preserve all data.`;

        if (!confirm(warningMessage)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/courses/${encodeURIComponent(course.courseId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'archived',
                    isActive: false
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success(hasEnrollments
                    ? `Course archived (${course.totalEnrollments} enrollments preserved)`
                    : 'Course archived successfully'
                );
                await fetchCourses();
            } else {
                toast.error('Failed to archive course');
            }
        } catch (error) {
            toast.error('Error archiving course');
        }
    };

    if (session?.user?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
                    <p className="text-gray-600 mt-2">Admin access required</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Loading courses...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <Toaster position="top-right" richColors />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Course Management</h1>
                    <p className="text-gray-600 mt-2">Professional course administration panel</p>
                </div>

                {/* Statistics Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Total Courses</h3>
                            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Published</h3>
                            <p className="text-3xl font-bold text-green-600">{stats.published}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Active</h3>
                            <p className="text-3xl font-bold text-blue-600">{stats.active || 0}</p>
                            <p className="text-xs text-gray-500 mt-1">Visible on /courses</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Drafts</h3>
                            <p className="text-3xl font-bold text-yellow-600">{stats.draft}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Archived</h3>
                            <p className="text-3xl font-bold text-red-600">{stats.archived}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Total Enrollments</h3>
                            <p className="text-3xl font-bold text-purple-600">{stats.totalEnrollments}</p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Create Course
                        </button>
                        <button
                            onClick={() => handleSeedCourses('seed')}
                            disabled={seeding}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            {seeding ? 'Seeding...' : 'Seed Courses'}
                        </button>
                        <button
                            onClick={() => handleSeedCourses('sample')}
                            disabled={seeding}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                            Create Sample
                        </button>
                        <button
                            onClick={() => handleSeedCourses('verify')}
                            disabled={seeding}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            Verify Sync
                        </button>
                    </div>
                </div>

                {/* Create Course Form */}
                {showCreateForm && (
                    <div className="bg-white p-6 rounded-lg shadow mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-900">Create New Course</h2>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateCourse} className="space-y-4">
                            {/* Course ID Field - CRITICAL for LMS Integration */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Course ID <span className="text-red-500">*</span>
                                    <span className="text-xs text-gray-500 ml-2">(Must match your LMS system)</span>
                                </label>
                                <input
                                    type="text"
                                    value={newCourse.courseId}
                                    onChange={(e) => setNewCourse(prev => ({ ...prev, courseId: e.target.value }))}
                                    placeholder="course-v1:MAALEDU+blockchain101+2025_Q1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Examples: <code className="bg-gray-100 px-1 py-0.5 rounded">course-v1:ORG+COURSE+RUN</code> or <code className="bg-gray-100 px-1 py-0.5 rounded">blockchain-basics</code>
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Course Title
                                    </label>
                                    <input
                                        type="text"
                                        value={newCourse.title}
                                        onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Price ($)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={newCourse.price}
                                        onChange={(e) => setNewCourse(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newCourse.description}
                                    onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Duration
                                    </label>
                                    <input
                                        type="text"
                                        value={newCourse.duration}
                                        onChange={(e) => setNewCourse(prev => ({ ...prev, duration: e.target.value }))}
                                        placeholder="e.g., 8 weeks"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Level
                                    </label>
                                    <select
                                        value={newCourse.level}
                                        onChange={(e) => setNewCourse(prev => ({ ...prev, level: e.target.value as 'Beginner' | 'Intermediate' | 'Advanced' }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Status
                                    </label>
                                    <select
                                        value={newCourse.status}
                                        onChange={(e) => setNewCourse(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Course Image URL
                                </label>
                                <input
                                    type="url"
                                    value={newCourse.image}
                                    onChange={(e) => setNewCourse(prev => ({ ...prev, image: e.target.value }))}
                                    placeholder="https://images.unsplash.com/..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Course Features
                                </label>
                                {newCourse.features.map((feature, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={feature}
                                            onChange={(e) => updateFeature(index, e.target.value)}
                                            placeholder={`Feature ${index + 1}`}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        {newCourse.features.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeFeature(index)}
                                                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addFeature}
                                    className="text-blue-600 hover:text-blue-700 text-sm"
                                >
                                    + Add Feature
                                </button>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Create Course
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Edit Course Form */}
                {showEditForm && editingCourse && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                            Edit Course: {editingCourse.title}
                        </h2>
                        <form onSubmit={(e) => { e.preventDefault(); handleUpdateCourse(); }}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Course Title
                                    </label>
                                    <input
                                        type="text"
                                        value={editCourse.title}
                                        onChange={(e) => setEditCourse(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Price ($)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editCourse.price}
                                        onChange={(e) => setEditCourse(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    rows={3}
                                    value={editCourse.description}
                                    onChange={(e) => setEditCourse(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Duration
                                    </label>
                                    <input
                                        type="text"
                                        value={editCourse.duration}
                                        onChange={(e) => setEditCourse(prev => ({ ...prev, duration: e.target.value }))}
                                        placeholder="e.g., 8 weeks"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Level
                                    </label>
                                    <select
                                        value={editCourse.level}
                                        onChange={(e) => setEditCourse(prev => ({ ...prev, level: e.target.value as 'Beginner' | 'Intermediate' | 'Advanced' }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Status
                                    </label>
                                    <select
                                        value={editCourse.status}
                                        onChange={(e) => setEditCourse(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Course Image URL
                                </label>
                                <input
                                    type="url"
                                    value={editCourse.image}
                                    onChange={(e) => setEditCourse(prev => ({ ...prev, image: e.target.value }))}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Course Features
                                </label>
                                {editCourse.features.map((feature, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={feature}
                                            onChange={(e) => updateEditFeature(index, e.target.value)}
                                            placeholder={`Feature ${index + 1}`}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        {editCourse.features.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeEditFeature(index)}
                                                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addEditFeature}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                                >
                                    Add Feature
                                </button>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Update Course
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditForm(false);
                                        setEditingCourse(null);
                                    }}
                                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Course List */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">
                            All Courses ({courses.length})
                        </h2>
                    </div>

                    {/* Card Grid View */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <div key={course.courseId} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                                {/* Course Image */}
                                <div className="relative h-48 bg-gray-200">
                                    {course.image ? (
                                        <img
                                            src={course.image}
                                            alt={course.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600">
                                            <span className="text-white text-lg font-semibold">
                                                {course.title.substring(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    {/* Status Badge */}
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        {/* Publication Status */}
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full shadow ${course.status === 'published' || course.isActive ? 'bg-green-500 text-white' :
                                            course.status === 'draft' ? 'bg-yellow-500 text-white' :
                                                'bg-red-500 text-white'
                                            }`}>
                                            {course.status || (course.isActive ? 'Published' : 'Draft')}
                                        </span>
                                        {/* Active/Inactive Indicator */}
                                        {!course.isActive && (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full shadow bg-gray-500 text-white">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Course Content */}
                                <div className="p-5">
                                    {/* Title and Level */}
                                    <div className="mb-3">
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                                            {course.title}
                                        </h3>
                                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${course.level === 'Beginner' ? 'bg-green-100 text-green-800' :
                                            course.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {course.level}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                        {course.description}
                                    </p>

                                    {/* Course ID */}
                                    <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
                                        <p className="text-xs font-mono text-gray-600 break-all">
                                            ID: {course.courseId}
                                        </p>
                                    </div>

                                    {/* Features List */}
                                    {course.features && course.features.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase">
                                                What you'll Learn:
                                            </h4>
                                            <ul className="space-y-1">
                                                {course.features.slice(0, 4).map((feature, idx) => (
                                                    <li key={idx} className="text-xs text-gray-600 flex items-start">
                                                        <span className="text-orange-500 mr-2">✓</span>
                                                        <span className="line-clamp-1">{feature}</span>
                                                    </li>
                                                ))}
                                                {course.features.length > 4 && (
                                                    <li className="text-xs text-gray-500 italic">
                                                        +{course.features.length - 4} more features...
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Course Stats */}
                                    <div className="flex items-center justify-between mb-4 pt-3 border-t border-gray-100">
                                        <div>
                                            <p className="text-xs text-gray-500">Price</p>
                                            <p className="text-xl font-bold text-orange-600">
                                                {course.price === 0 ? 'Free' : `$${course.price}`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Enrollments</p>
                                            <p className="text-lg font-semibold text-gray-900">
                                                {course.totalEnrollments || 0}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Duration */}
                                    {course.duration && (
                                        <div className="mb-4 flex items-center text-sm text-gray-600">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {course.duration}
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="space-y-2">
                                        {/* Primary Actions */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditCourse(course)}
                                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(course)}
                                                className={`flex-1 px-4 py-2 rounded-md transition-colors text-sm font-medium ${course.isActive
                                                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                                    }`}
                                                title={course.isActive ? 'Deactivate (hide from /courses)' : 'Activate (show on /courses)'}
                                            >
                                                {course.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                                            </button>
                                        </div>

                                        {/* Status Change Dropdown */}
                                        <div className="flex gap-2">
                                            {course.status !== 'draft' && (
                                                <button
                                                    onClick={() => handleChangeStatus(course, 'draft')}
                                                    className="flex-1 bg-gray-500 text-white px-3 py-1.5 rounded-md hover:bg-gray-600 transition-colors text-xs"
                                                    title="Mark as draft"
                                                >
                                                    📝 Draft
                                                </button>
                                            )}
                                            {course.status !== 'published' && (
                                                <button
                                                    onClick={() => handleChangeStatus(course, 'published')}
                                                    className="flex-1 bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition-colors text-xs"
                                                    title="Publish course"
                                                >
                                                    🚀 Publish
                                                </button>
                                            )}
                                            {course.status !== 'archived' && (
                                                <button
                                                    onClick={() => handleArchiveCourse(course)}
                                                    className="flex-1 bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition-colors text-xs"
                                                    title="Archive course"
                                                >
                                                    🗄️ Archive
                                                </button>
                                            )}
                                        </div>

                                        {/* Enrollment Warning */}
                                        {course.totalEnrollments > 0 && (
                                            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                                ⚠️ {course.totalEnrollments} student{course.totalEnrollments !== 1 ? 's' : ''} enrolled
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {courses.length === 0 && (
                        <div className="p-12 text-center">
                            <div className="text-gray-400 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <p className="text-gray-500 text-lg font-medium">No courses found</p>
                            <p className="text-gray-400 text-sm mt-1">Click "Create Course" or "Seed Courses" to get started</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}