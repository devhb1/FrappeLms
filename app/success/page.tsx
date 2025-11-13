"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Mail, BookOpen, ExternalLink, Loader2 } from "lucide-react"
import Link from "next/link"

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const enrollmentType = searchParams.get('type')
  const courseTitle = searchParams.get('courseTitle')
  const email = searchParams.get('email')
  const couponCode = searchParams.get('couponCode')
  const enrollmentId = searchParams.get('enrollmentId')
  const [isLoading, setIsLoading] = useState(true)

  const isFreeEnrollment = enrollmentType === 'free_enrollment'

  useEffect(() => {
    // Simulate processing time
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-orange-600 animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Processing Your Enrollment...
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center">
              Please wait while we set up your course access.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="py-20 bg-gradient-to-br from-green-50 via-white to-green-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <Card className="border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 shadow-xl">
                <CardContent className="text-center py-12 px-8">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                  </div>

                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    {isFreeEnrollment ? 'Free Enrollment Successful!' : 'Payment Successful!'}
                  </h1>

                  <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                    {isFreeEnrollment
                      ? `Welcome to MaalEdu! Your free enrollment in "${courseTitle}" has been completed successfully using coupon ${couponCode}.`
                      : 'Welcome to MaalEdu! Your course enrollment has been completed successfully.'
                    }
                  </p>

                  {(sessionId || enrollmentId) && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-8">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <strong>{isFreeEnrollment ? 'Enrollment ID:' : 'Transaction ID:'}</strong> {sessionId || enrollmentId}
                      </p>
                      {email && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          <strong>Email:</strong> {email}
                        </p>
                      )}
                      {isFreeEnrollment && couponCode && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          <strong>Coupon Used:</strong> {couponCode}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg">
                        <Mail className="w-8 h-8 text-orange-600 dark:text-orange-400 mb-3 mx-auto" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Check Your Email
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Course access details and login credentials have been sent to your email address.
                        </p>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                        <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3 mx-auto" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Start Learning
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Your course is now available in your student dashboard. Begin your blockchain journey today!
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        What's Next?
                      </h3>
                      <ul className="text-left space-y-2 text-gray-600 dark:text-gray-300">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            {isFreeEnrollment
                              ? "Your free course access has been granted and is now active"
                              : "Access your course materials immediately through our learning platform"
                            }
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            {isFreeEnrollment
                              ? "Check your email for login credentials and course access details"
                              : "Join our exclusive student community and start networking"
                            }
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            {isFreeEnrollment
                              ? "Click 'Access Learning Platform' above to start your blockchain journey"
                              : "Schedule your first mentorship session with industry experts"
                            }
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            {isFreeEnrollment
                              ? "Your enrollment is lifetime access - learn at your own pace"
                              : "Complete your profile and start tracking your progress"
                            }
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-6">
                      <Button
                        asChild
                        size="lg"
                        className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                      >
                        <a href="http://139.59.229.250:8000" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Access FrappeLMS Platform
                        </a>
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="flex-1"
                      >
                        <Link href="/dashboard">
                          <BookOpen className="w-4 h-4 mr-2" />
                          Go to Dashboard
                        </Link>
                      </Button>
                    </div>

                    {isFreeEnrollment && (
                      <div className="pt-4">
                        <Button
                          asChild
                          variant="secondary"
                          size="lg"
                          className="w-full"
                        >
                          <Link href="/courses">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Browse More Courses
                          </Link>
                        </Button>
                      </div>
                    )}

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Need help? Contact our support team at{' '}
                        <a
                          href="mailto:support@maaledu.com"
                          className="text-orange-600 dark:text-orange-400 hover:underline"
                        >
                          support@maaledu.com
                        </a>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
