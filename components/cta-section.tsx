import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Users, BookOpen } from "lucide-react"
import { getLMSAccessUrl } from "@/lib/config/lms"

/**
 * CTASection Component
 *
 * Main call-to-action section encouraging users to start their blockchain education journey.
 * Features gradient background and dual action buttons for different user intents.
 *
 * Key Features:
 * - Gradient background with MaalEdu brand colors
 * - Two primary actions: Start Learning and Talk to Advisors
 * - Responsive design with mobile-first approach
 * - Enhanced hover effects and animations
 *
 * Navigation:
 * - "Start Your Journey Today" -> External LMS (lms.maaledu.com)
 * - "Talk to Our Advisors" -> Internal contact page (/contact-us)
 */
export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-br from-orange-600 via-orange-700 to-orange-800 dark:from-orange-700 dark:via-orange-800 dark:to-orange-900 relative overflow-hidden transition-colors">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white dark:bg-gray-100 opacity-5 rounded-full"></div>
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-white dark:bg-gray-100 opacity-5 rounded-full"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white dark:bg-gray-100 opacity-10 rounded-full"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center space-y-8">
          {/* Main Heading */}
          <div className="space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
              Ready To Elevate Your Career?
            </h2>
            <p className="text-xl text-orange-100 dark:text-orange-200 max-w-3xl mx-auto leading-relaxed transition-colors">
              Join hundreds of professionals who have transformed their careers with our blockchain education program.
              Start your journey today and become part of the digital revolution.
            </p>
          </div>

          {/* Action Buttons Container */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            {/* Primary CTA - Start Learning Journey */}
            <Button
              asChild
              size="lg"
              className="bg-white text-orange-600 hover:bg-gray-100 dark:hover:bg-gray-200 transition-all duration-300 hover:shadow-xl hover:scale-105 group"
            >
              <Link href={getLMSAccessUrl()} target="_blank" rel="noopener noreferrer">
                <BookOpen className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
                Start Your Journey Today
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-orange-600 bg-transparent transition-all duration-300 hover:shadow-xl hover:scale-105 group"
            >
              <Link href="/contact-us">
                <Users className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                Talk to Our Advisors
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </Button>
          </div>

          {/* Additional trust indicator */}
          <div className="pt-8 border-t border-orange-500 border-opacity-30">
            <p className="text-orange-200 dark:text-orange-300 text-sm transition-colors">
              ✨ Trusted by 500+ students worldwide • 🏆 Dual certification program • 🌍 Global recognition
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
