import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { getLMSAccessUrl } from "@/lib/config/lms"

/**
 * CertificationPreview Component
 *
 * Displays an overview of MaalEdu's dual diploma blockchain certification program.
 * Features three key aspects: Course Structure, Practical Training, and Global Recognition.
 *
 * Key Features:
 * - Responsive grid layout for certification highlights
 * - Call-to-action buttons for certification details and LMS access
 * - Hover effects and smooth transitions for better UX
 * - Professional styling with MaalEdu brand colors
 */
export function CertificationPreview() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 relative overflow-hidden transition-colors">
      {/* Background decoration for visual appeal */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-100 dark:bg-orange-500/20 rounded-full opacity-20 -translate-y-48 translate-x-48"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-200 dark:bg-orange-600/20 rounded-full opacity-10 translate-y-32 -translate-x-32"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800/70 transition-colors duration-300">
              Blockchain Certification
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 leading-tight transition-colors">
              Professional & Academic Diplomas in
              <span className="text-orange-600 dark:text-orange-400 block md:inline"> Blockchain Technology</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed transition-colors">
              Achieve dual recognition with one comprehensive program, awarding you both the Professional Diploma from
              Maal Data Lab and the Academic Diploma from Warnborough College, UK.
            </p>
          </div>

          {/* Certification Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {/* Course Structure Card */}
            <Card className="p-8 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-200 dark:hover:border-orange-400 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/80 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-200 dark:group-hover:bg-orange-700 transition-colors duration-300">
                  <svg className="w-8 h-8 text-orange-600 dark:text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center transition-colors">Course Structure</h3>
                <p className="text-gray-600 dark:text-gray-200 text-center leading-relaxed transition-colors">
                  Cohesive curriculum covering blockchain fundamentals, smart contracts, and advanced development.
                </p>
              </CardContent>
            </Card>

            {/* Practical Training Card */}
            <Card className="p-8 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-200 dark:hover:border-orange-400 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/80 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-200 dark:group-hover:bg-orange-700 transition-colors duration-300">
                  <svg className="w-8 h-8 text-orange-600 dark:text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center transition-colors">Practical Training</h3>
                <p className="text-gray-600 dark:text-gray-200 text-center leading-relaxed transition-colors">
                  Hands-on projects and real-world applications guided by industry experts.
                </p>
              </CardContent>
            </Card>

            {/* Global Recognition Card */}
            <Card className="p-8 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-200 dark:hover:border-orange-400 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group md:col-span-2 lg:col-span-1">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/80 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-orange-200 dark:group-hover:bg-orange-700 transition-colors duration-300">
                  <svg className="w-8 h-8 text-orange-600 dark:text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center transition-colors">Global Recognition</h3>
                <p className="text-gray-600 dark:text-gray-200 text-center leading-relaxed transition-colors">
                  Qualifications respected internationally, enhancing career prospects globally.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Call-to-Action Buttons */}
          <div className="text-center space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            {/* Primary CTA - Learn More About Certification */}
            <Button
              asChild
              size="lg"
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 transition-all duration-300 hover:shadow-lg hover:scale-105"
            >
              <Link href="/certification">Learn More About Certification</Link>
            </Button>

            {/* Secondary CTA - Begin Learning (External LMS) */}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-orange-600 dark:border-orange-400 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-8 py-3 bg-transparent transition-all duration-300 hover:shadow-lg hover:scale-105"
            >
              <Link href={getLMSAccessUrl()} target="_blank" rel="noopener noreferrer">
                Begin Learning
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
