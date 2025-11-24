"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { formatPrice } from "@/lib/utils-stripe"
import Image from "next/image"
import Link from "next/link"
import {
  Clock,
  Users,
  Award,
  CheckCircle,
  Star,
  BookOpen,
  ShoppingCart,
  Loader2,
  ArrowUpDown
} from "lucide-react"

import type { PublicCourse } from '@/lib/types/course';

function CoursesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [courses, setCourses] = useState<PublicCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('custom')
  const { toast } = useToast()

  // Handle redirect if courseid parameter is present
  useEffect(() => {
    const courseId = searchParams.get('courseid')
    if (courseId) {
      // Build the redirect URL with all query params preserved
      const params = new URLSearchParams()

      // Copy over usermail and ref params
      const usermail = searchParams.get('usermail')
      const ref = searchParams.get('ref')

      if (usermail) params.set('usermail', usermail)
      if (ref) params.set('ref', ref)

      // Redirect to course detail page
      const redirectUrl = `/courses/${encodeURIComponent(courseId)}${params.toString() ? '?' + params.toString() : ''}`
      console.log(`🔄 Redirecting to course detail: ${redirectUrl}`)
      router.push(redirectUrl)
    }
  }, [searchParams, router])

  // Fetch courses from database
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true)

        // Fetch courses from database
        let response = await fetch(`/api/courses?sortBy=${sortBy}`)

        if (response.ok) {
          const data = await response.json()
          console.log('📦 Courses API response:', data)
          setCourses(data.courses)
          console.log('💾 Courses loaded from database')
        } else {
          // Main page component for courses
          console.error(`❌ Courses fetch failed: ${response.status}`)
          toast({
            title: "Error",
            description: "Failed to load courses. Please try again.",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error('Error fetching courses:', error)
        toast({
          title: "Error",
          description: "Failed to load courses. Please check your connection.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [toast, sortBy]) // Re-fetch when sortBy changes

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Loading courses...</p>
            </div>
          </div>
        </div>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-orange-50 via-white to-orange-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-6 bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800/70 transition-colors">
                <BookOpen className="w-4 h-4 mr-2" />
                Professional Courses
              </Badge>

              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">
                Blockchain <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">Courses</span>
              </h1>

              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed transition-colors max-w-3xl mx-auto">
                Transform your career with our industry-leading blockchain courses. Designed by experts,
                built for professionals, and recognized globally.
              </p>

              <div className="flex items-center justify-center gap-8 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-600" />
                  <span>500+ Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-orange-600" />
                  <span>Industry Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-orange-600" />
                  <span>4.9/5 Rating</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Courses Grid */}
        <section className="py-20 bg-white dark:bg-gray-900 transition-colors">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              {/* Course Header with Sort */}
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Available Courses
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {courses.length} course{courses.length !== 1 ? 's' : ''} available
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-gray-500" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sort courses by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">📋 Custom Order</SelectItem>
                      <SelectItem value="popular">🔥 Most Popular</SelectItem>
                      <SelectItem value="newest">🆕 Newest First</SelectItem>
                      <SelectItem value="price_low">💰 Price: Low to High</SelectItem>
                      <SelectItem value="price_high">💸 Price: High to Low</SelectItem>
                      <SelectItem value="alphabetical">🔤 A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {courses.map((course) => (
                  <Card key={course.courseId} className="group hover:shadow-xl transition-all duration-300 border-2 border-gray-200 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-700 bg-white dark:bg-gray-800">
                    <CardHeader className="p-0">
                      <div className="relative h-48 overflow-hidden rounded-t-lg">
                        <Image
                          src={course.image}
                          alt={course.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            // Fallback to a gradient background if image fails to load
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.parentElement!.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                          }}
                        />
                        <div className="absolute top-4 left-4">
                          <Badge className={`${course.level === 'Beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                            course.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                              'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                            }`}>
                            {course.level}
                          </Badge>
                        </div>
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-black/50 text-white border-0">
                            {course.duration}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                          {course.title}
                        </h3>

                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                          {course.description}
                        </p>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-orange-600" />
                            What you'll learn:
                          </h4>
                          <ul className="grid grid-cols-1 gap-2">
                            {course.features.slice(0, 4).map((feature: string, index: number) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <CheckCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                          {course.features.length > 4 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              +{course.features.length - 4} more features
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="space-y-1">
                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                              {formatPrice(course.price)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {course.duration}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button
                              asChild
                              variant="outline"
                              className="px-6 py-2 text-sm"
                            >
                              <Link href={`/courses/${encodeURIComponent(course.courseId)}`}>
                                <BookOpen className="w-4 h-4 mr-2" />
                                View Details
                              </Link>
                            </Button>
                            <Button
                              asChild
                              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                            >
                              <Link href={`/courses/${encodeURIComponent(course.courseId)}`}>
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Buy Now
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-700 dark:to-orange-800">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Start Your Blockchain Journey?
              </h2>
              <p className="text-xl text-orange-100 dark:text-orange-200 mb-8 leading-relaxed">
                Join thousands of professionals who have transformed their careers with our comprehensive blockchain education.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  variant="secondary"
                  className="px-8 py-3 text-lg"
                  onClick={() => document.querySelector('.courses-grid')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  View All Courses
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-3 text-lg border-white text-white hover:bg-white hover:text-orange-600 bg-transparent"
                  asChild
                >
                  <a href="/contact-us">Get Help Choosing</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

// Wrap with Suspense to handle useSearchParams in Next.js 15
export default function CoursesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Loading courses...</p>
            </div>
          </div>
        </div>
        <SiteFooter />
      </div>
    }>
      <CoursesPageContent />
    </Suspense>
  )
}