import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Star, Users, TrendingUp } from "lucide-react"

/**
 * AffiliateSection Component
 *
 * Promotes MaalEdu's student affiliate program with enhanced visual appeal.
 * Encourages existing students to become affiliates and earn while helping others.
 *
 * Key Features:
 * - Dark theme with orange accent colors
 * - Enhanced visual elements and icons
 * - Benefit highlights for potential affiliates
 * - Professional call-to-action design
 *
 * Navigation:
 * - "Apply" button -> Contact page (/contact-us) for affiliate inquiries
 */
export function AffiliateSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black text-white relative overflow-hidden transition-colors">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-orange-500 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main Content */}
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl lg:text-3xl font-bold leading-tight">
                Become a Student{" "}
                <span className="text-orange-500 dark:text-orange-400 relative">
                  AFFILIATE
                  <div className="absolute -bottom-1 left-0 w-full h-1 bg-orange-500 dark:bg-orange-400 opacity-30"></div>
                </span>
              </h2>
              <p className="text-gray-300 dark:text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed transition-colors">
                Join our affiliate program and earn while helping others discover the power of blockchain education.
                Share your success story and help build the future of digital learning.
              </p>
            </div>

            {/* Benefits Grid */}
            <div className="grid md:grid-cols-3 gap-6 my-12">
              <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-gray-800 dark:bg-gray-900 bg-opacity-50 hover:bg-opacity-70 dark:hover:bg-gray-800 transition-all duration-300">
                <div className="w-12 h-12 bg-orange-500 dark:bg-orange-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-white">Earn Commission</h3>
                <p className="text-gray-400 dark:text-gray-500 text-sm text-center transition-colors">Get rewarded for every successful referral</p>
              </div>

              <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-gray-800 dark:bg-gray-900 bg-opacity-50 hover:bg-opacity-70 dark:hover:bg-gray-800 transition-all duration-300">
                <div className="w-12 h-12 bg-orange-500 dark:bg-orange-600 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-white">Build Network</h3>
                <p className="text-gray-400 dark:text-gray-500 text-sm text-center transition-colors">Connect with like-minded professionals</p>
              </div>

              <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-gray-800 dark:bg-gray-900 bg-opacity-50 hover:bg-opacity-70 dark:hover:bg-gray-800 transition-all duration-300">
                <div className="w-12 h-12 bg-orange-500 dark:bg-orange-600 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-white">Recognition</h3>
                <p className="text-gray-400 dark:text-gray-500 text-sm text-center transition-colors">Get featured as a success story</p>
              </div>
            </div>

            <Button
              asChild
              className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 transition-all duration-300 hover:shadow-lg hover:scale-105 group"
              size="lg"
            >
              <Link href="/signin">
                Apply Now
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
