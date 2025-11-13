import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Clock, Laptop, Award, Users } from "lucide-react"
import { getLMSRegistrationUrl } from "@/lib/config/lms"

/**
 * KeyFeatures Component
 *
 * Showcases the main benefits and unique selling points of MaalEdu's blockchain education program.
 * Features a responsive grid layout with interactive cards highlighting key program advantages.
 *
 * Key Features:
 * - Responsive grid layout (1 col mobile, 2 cols tablet, 3 cols desktop)
 * - Interactive hover effects with smooth transitions
 * - Icon-based visual hierarchy for better comprehension
 * - Professional styling with MaalEdu brand colors
 *
 * Features Highlighted:
 * 1. Learn from Anywhere - Remote accessibility
 * 2. Flexible Learning Schedule - Self-paced learning
 * 3. Hands-On Practical Training - Real-world experience
 * 4. Dual Diploma Award - Global recognition
 * 5. Phenomena-Based Learning - Innovative methodology
 */
export function KeyFeatures() {
  const features = [
    {
      icon: MapPin,
      title: "Learn from Anywhere",
      description:
        "Access world-class blockchain education from the comfort of your home or anywhere in the world with our comprehensive online platform.",
    },
    {
      icon: Clock,
      title: "Flexible Learning Schedule",
      description:
        "Study at your own pace with our flexible scheduling that fits your lifestyle, work commitments, and personal goals.",
    },
    {
      icon: Laptop,
      title: "Hands-On Practical Training",
      description:
        "Gain real-world experience through practical blockchain projects, smart contract development, and industry-relevant case studies.",
    },
    {
      icon: Award,
      title: "Dual Diploma Award",
      description:
        "Earn both Professional and Academic diplomas recognized globally by leading institutions and blockchain industry leaders.",
    },
    {
      icon: Users,
      title: "Phenomena-Based Learning",
      description:
        "Learn through real-world blockchain phenomena and problem-solving approaches for deeper understanding and practical application.",
    },
  ]

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 right-10 w-32 h-32 bg-orange-100 rounded-full opacity-30"></div>
        <div className="absolute bottom-20 left-10 w-24 h-24 bg-orange-200 rounded-full opacity-20"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            Key{" "}
            <span className="text-orange-600 relative">
              Features
              <div className="absolute -bottom-1 left-0 w-full h-1 bg-orange-600 opacity-20 rounded-full"></div>
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Discover what makes our blockchain education program unique, effective, and globally recognized
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card
                key={index}
                className="text-center p-8 hover:shadow-xl transition-all duration-300 border-0 bg-white dark:bg-gray-800 hover:-translate-y-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent dark:from-orange-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <CardContent className="space-y-6 relative z-10">
                  <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center mx-auto group-hover:bg-orange-200 dark:group-hover:bg-orange-800/70 transition-all duration-300 group-hover:scale-110">
                    <Icon className="w-10 h-10 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300" />
                  </div>

                  {/* Feature Title */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors duration-300">
                    {feature.title}
                  </h3>

                  {/* Feature Description */}
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                    {feature.description}
                  </p>
                </CardContent>

                <div className="absolute inset-0 border-2 border-orange-200 dark:border-orange-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Card>
            )
          })}
        </div>

        <div className="text-center mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-300 mb-4">Ready to experience these features firsthand?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/about-us"
              className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-300 font-medium"
            >
              Explore MaalEdu
              <MapPin className="ml-2 h-4 w-4" />
            </a>
            <a
              href={getLMSRegistrationUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 border-2 border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors duration-300 font-medium"
            >
              Start Learning
              <Laptop className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
