"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { XCircle, ArrowLeft, Mail, HelpCircle } from "lucide-react"
import Link from "next/link"

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <main>
        <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl">
                <CardContent className="text-center py-12 px-8">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-12 h-12 text-gray-500 dark:text-gray-400" />
                  </div>
                  
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    Payment Cancelled
                  </h1>
                  
                  <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                    No worries! Your payment was cancelled and no charges were made to your account.
                  </p>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-8">
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                      Your course is still waiting for you!
                    </h3>
                    <p className="text-yellow-700 dark:text-yellow-400 text-sm">
                      The course you selected is still available for purchase. You can complete your enrollment at any time.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                        <HelpCircle className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3 mx-auto" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Need Help?
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Our support team is here to help with any questions about courses or payment options.
                        </p>
                      </div>

                      <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                        <Mail className="w-8 h-8 text-green-600 dark:text-green-400 mb-3 mx-auto" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Stay Updated
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Join our newsletter to get notified about course updates, discounts, and new offerings.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        What would you like to do next?
                      </h3>
                      
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button 
                          asChild 
                          size="lg" 
                          className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                        >
                          <Link href="/courses">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Courses
                          </Link>
                        </Button>
                        
                        <Button 
                          asChild 
                          variant="outline" 
                          size="lg"
                          className="flex-1"
                        >
                          <Link href="/contact-us">
                            <Mail className="w-4 h-4 mr-2" />
                            Contact Support
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-left">
                        Why choose MaalEdu?
                      </h4>
                      <ul className="text-left space-y-2 text-gray-600 dark:text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0"></span>
                          <span>Industry-recognized dual diploma certification</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0"></span>
                          <span>Expert instructors with real-world experience</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0"></span>
                          <span>Hands-on projects and practical applications</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0"></span>
                          <span>Lifetime access to course materials and updates</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0"></span>
                          <span>Career support and job placement assistance</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Questions about our courses or need help with enrollment?{' '}
                        <a 
                          href="mailto:support@maaledu.com" 
                          className="text-orange-600 dark:text-orange-400 hover:underline"
                        >
                          Contact our support team
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
