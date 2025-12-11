'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Users, ArrowLeft, CheckCircle, AlertCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { getLMSRegistrationUrl } from '@/lib/config/lms';

interface Course {
    _id: string;
    courseId: string;
    title: string;
    price: number;
    duration: string;
    level: string;
    description?: string;
}

/**
 * Grant Application Page
 * 
 * Public page for applying for educational grants.
 * Users can apply for 100% funding for any available course.
 * 
 * Features:
 * - No authentication required
 * - Course selection from available courses
 * - Comprehensive application form
 * - Real-time validation
 * - Success confirmation with next steps
 */

interface FormData {
    name: string;
    email: string;
    username: string;
    age: string;
    socialAccounts: string;
    reason: string;
    courseId: string;
}

interface FormErrors {
    [key: string]: string;
}

export default function GrantsPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(true);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        username: '',
        age: '',
        socialAccounts: '',
        reason: '',
        courseId: ''
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const router = useRouter();

    // Fetch active courses from database
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setIsLoadingCourses(true);
                const response = await fetch('/api/courses?sortBy=custom');
                if (response.ok) {
                    const data = await response.json();
                    setCourses(data.courses || []);
                }
            } catch (error) {
                console.error('Failed to fetch courses:', error);
            } finally {
                setIsLoadingCourses(false);
            }
        };

        fetchCourses();
    }, []);

    // Form validation
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username.trim().length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_.-]+$/.test(formData.username.trim())) {
            newErrors.username = 'Username can only contain letters, numbers, dots, dashes and underscores';
        }

        if (!formData.age.trim()) {
            newErrors.age = 'Age is required';
        } else {
            const ageNum = parseInt(formData.age);
            if (isNaN(ageNum) || ageNum < 16 || ageNum > 100) {
                newErrors.age = 'Age must be between 16 and 100';
            }
        }

        if (!formData.socialAccounts.trim()) {
            newErrors.socialAccounts = 'Social accounts information is required';
        } else if (formData.socialAccounts.trim().length < 10) {
            newErrors.socialAccounts = 'Please provide more details about your social accounts';
        }

        if (!formData.reason.trim()) {
            newErrors.reason = 'Reason for applying is required';
        } else if (formData.reason.trim().length < 50) {
            newErrors.reason = 'Please provide a more detailed reason (at least 50 characters)';
        }

        if (!formData.courseId) {
            newErrors.courseId = 'Please select a course';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/grants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    age: parseInt(formData.age)
                }),
            });

            if (response.ok) {
                setIsSubmitted(true);
            } else {
                const data = await response.json();
                setErrors({ submit: data.error || 'Failed to submit application' });
            }
        } catch (error) {
            console.error('Grant submission error:', error);
            setErrors({ submit: 'Network error. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle input changes
    const handleInputChange = (field: keyof FormData) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    // Handle select changes
    const handleSelectChange = (field: keyof FormData) => (value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    // Success state
    if (isSubmitted) {
        const selectedCourse = courses.find(course => course.courseId === formData.courseId);

        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl border-0 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                    <CardHeader className="text-center space-y-4">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                            Application Submitted Successfully! 🎉
                        </CardTitle>
                        <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                            Thank you for applying for our grant program
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 space-y-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Application Details:</h3>
                            <div className="space-y-2 text-sm">
                                <div><strong>Name:</strong> {formData.name}</div>
                                <div><strong>Email:</strong> {formData.email}</div>
                                <div><strong>Course:</strong> {selectedCourse?.title}</div>
                                <div><strong>Course Value:</strong> ${selectedCourse?.price}</div>
                            </div>
                        </div>

                        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <AlertDescription className="text-blue-700 dark:text-blue-300">
                                <strong>What happens next?</strong>
                                <ul className="mt-2 space-y-1 text-sm">
                                    <li>• Our team will review your application within 3-5 business days</li>
                                    <li>• If approved, you'll receive a 100% discount coupon via email</li>
                                    <li>• Use the coupon code at checkout to enroll for free</li>
                                    <li>• Check your spam folder for our response email</li>
                                </ul>
                            </AlertDescription>
                        </Alert>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                onClick={() => router.push('/')}
                                className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                            >
                                Return to Homepage
                            </Button>
                            <Button
                                onClick={() => router.push('/courses')}
                                variant="outline"
                                className="flex-1"
                            >
                                Browse Courses
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Main form
    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* LMS Registration Instruction */}
                <div className="mb-6">
                    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-blue-700 dark:text-blue-300">
                            <strong>Important:</strong> Before applying, please <a href={getLMSRegistrationUrl()} target="_blank" rel="noopener noreferrer" className="text-orange-600 underline">register on our LMS</a> and use your registered LMS username and email below.
                        </AlertDescription>
                    </Alert>
                </div>
                {/* Header */}
                <div className="text-center mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors mb-6"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Homepage
                    </Link>

                    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <GraduationCap className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                    </div>

                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Apply for Educational Grant
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Get 100% funding for your blockchain education. Fill out the form below to apply for our grant program.
                    </p>
                </div>

                {/* Grant Info Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <Card className="border-orange-200 dark:border-gray-700">
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-3 mb-3">
                                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                                    <GraduationCap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">100% Coverage</h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Our grants cover the full course fee, giving you complete access to premium blockchain education at no cost.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-200 dark:border-gray-700">
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-3 mb-3">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Limited Spots</h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                We award grants to a limited number of passionate students each month. Apply early for the best chance.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Application Form */}
                <Card className="border-0 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            Grant Application Form
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-300">
                            Please fill out all fields accurately. Our team will review your application within 3-5 business days.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Course Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="courseId" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Select Course *
                                </Label>
                                <Select 
                                    onValueChange={handleSelectChange('courseId')} 
                                    value={formData.courseId}
                                    disabled={isLoadingCourses}
                                >
                                    <SelectTrigger className={`${errors.courseId ? 'border-red-500' : ''}`}>
                                        <SelectValue 
                                            placeholder={
                                                isLoadingCourses 
                                                    ? "Loading courses..." 
                                                    : courses.length === 0 
                                                        ? "No courses available" 
                                                        : "Choose the course you want to apply for"
                                            } 
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courses.map((course) => (
                                            <SelectItem key={course.courseId} value={course.courseId}>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{course.title}</span>
                                                    <span className="text-sm text-gray-500">
                                                        ${course.price} • {course.duration} • {course.level}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.courseId && <p className="text-sm text-red-600">{errors.courseId}</p>}
                                {!isLoadingCourses && courses.length === 0 && (
                                    <p className="text-sm text-orange-600">No active courses available at the moment. Please check back later.</p>
                                )}
                            </div>

                            {/* Personal Information */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Full Name *
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="Enter your full name"
                                        value={formData.name}
                                        onChange={handleInputChange('name')}
                                        className={`${errors.name ? 'border-red-500' : ''}`}
                                    />
                                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        MaalEdu LMS Username *
                                    </Label>
                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="your_maaledu_username"
                                        value={formData.username}
                                        onChange={handleInputChange('username')}
                                        className={`${errors.username ? 'border-red-500' : ''}`}
                                    />
                                    {errors.username && <p className="text-sm text-red-600">{errors.username}</p>}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Email Address *
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your.email@example.com"
                                        value={formData.email}
                                        onChange={handleInputChange('email')}
                                        className={`${errors.email ? 'border-red-500' : ''}`}
                                    />
                                    {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="age" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Age *
                                    </Label>
                                    <Input
                                        id="age"
                                        type="number"
                                        min="16"
                                        max="100"
                                        placeholder="Enter your age"
                                        value={formData.age}
                                        onChange={handleInputChange('age')}
                                        className={`${errors.age ? 'border-red-500' : ''}`}
                                    />
                                    {errors.age && <p className="text-sm text-red-600">{errors.age}</p>}
                                </div>
                            </div>

                            {/* Social Accounts */}
                            <div className="space-y-2">
                                <Label htmlFor="socialAccounts" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Social Media Accounts *
                                </Label>
                                <Textarea
                                    id="socialAccounts"
                                    placeholder="Please provide your social media handles (LinkedIn, Twitter, GitHub, etc.) and any relevant professional profiles that showcase your interest in blockchain technology."
                                    value={formData.socialAccounts}
                                    onChange={handleInputChange('socialAccounts')}
                                    className={`min-h-[100px] ${errors.socialAccounts ? 'border-red-500' : ''}`}
                                />
                                {errors.socialAccounts && <p className="text-sm text-red-600">{errors.socialAccounts}</p>}
                            </div>

                            {/* Reason */}
                            <div className="space-y-2">
                                <Label htmlFor="reason" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Reason for Applying *
                                </Label>
                                <Textarea
                                    id="reason"
                                    placeholder="Please explain why you're applying for this grant. Include your career goals, how this course will help you, any financial constraints, and your commitment to completing the program. Be specific and genuine."
                                    value={formData.reason}
                                    onChange={handleInputChange('reason')}
                                    className={`min-h-[120px] ${errors.reason ? 'border-red-500' : ''}`}
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>{formData.reason.length} characters</span>
                                    <span>Minimum 50 characters required</span>
                                </div>
                                {errors.reason && <p className="text-sm text-red-600">{errors.reason}</p>}
                            </div>

                            {/* Submit Error */}
                            {errors.submit && (
                                <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                    <AlertDescription className="text-red-600 dark:text-red-400">
                                        {errors.submit}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white font-medium py-3 transition-all duration-300 hover:scale-105"
                                size="lg"
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Submitting Application...
                                    </div>
                                ) : (
                                    <>
                                        Submit Grant Application
                                        <Send className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Footer Info */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Questions about the grant program? Contact us at{' '}
                        <a href="mailto:grants@maaledu.com" className="text-orange-600 hover:underline">
                            grants@maaledu.com
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
