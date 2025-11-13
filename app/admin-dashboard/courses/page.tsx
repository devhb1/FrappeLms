'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Course Management</h1>
                    <p className="text-gray-600 mt-2">Professional course administration panel</p>
                </div>

                {/* Statistics Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Total Courses</h3>
                            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Published</h3>
                            <p className="text-3xl font-bold text-green-600">{stats.published}</p>
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
                            <p className="text-3xl font-bold text-blue-600">{stats.totalEnrollments}</p>
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

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Course
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Level
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Price
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Enrollments
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {courses.map((course) => (
                                    <tr key={course.courseId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {course.title}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {course.courseId}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${course.level === 'Beginner' ? 'bg-green-100 text-green-800' :
                                                course.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {course.level}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {course.price === 0 ? 'Free' : `$${course.price}`}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {course.totalEnrollments}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${course.status === 'published' || course.isActive ? 'bg-green-100 text-green-800' :
                                                course.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {course.status || (course.isActive ? 'Published' : 'Draft')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => handleEditCourse(course)}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                            >
                                                Edit
                                            </button>
                                            <button className="text-red-600 hover:text-red-900">
                                                Archive
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}