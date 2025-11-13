import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 dark:from-orange-600 dark:via-orange-700 dark:to-orange-800 transition-colors relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              <div className="text-white">
                <h1 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
                  Pioneering Blockchain Education With A Vision For The Future
                </h1>
                <p className="text-xl text-orange-100 leading-relaxed">
                  We empower the next generation of blockchain innovators through accessible, industry-relevant education.
                  Our courses cater to high school leavers, undergraduates, postgraduates, and aspiring professionals.
                </p>
              </div>
              <div className="relative">
                <Image
                  src="/assets/About Us 1.png"
                  alt="Blockchain Education Innovation"
                  width={500}
                  height={400}
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
          {/* Decorative Elements */}
          <div className="absolute top-20 right-20 w-32 h-32 bg-orange-300/20 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-20 w-48 h-48 bg-orange-300/10 rounded-full blur-2xl"></div>
        </section>

        {/* Circular Navigation Diagram */}
        <section className="py-20 bg-gray-50 dark:bg-gray-800 transition-colors">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
              {/* Left side - Logo */}
              <div className="relative flex items-center justify-center">
                <div className="relative">
                  <Image
                    src="/assets/maal-datalabs.svg"
                    alt="Maal Data Labs Logo"
                    width={400}
                    height={400}
                    className="w-full h-auto max-w-md mx-auto"
                  />
                </div>
              </div>

              {/* Right side - Content */}
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                  <span className="text-orange-600 dark:text-orange-400">Maal Data Lab</span>
                </h2>
                <div className="w-16 h-1 bg-gray-800 dark:bg-gray-300 mb-6"></div>
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                  We empower the next generation of blockchain innovators through accessible, 
                  industry-relevant education. Our courses cater to high school leavers, 
                  undergraduates, postgraduates, and aspiring professionals, offering flexibility and 
                  hands-on experience for real-world success in the blockchain space.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Vision, Mission, Approach */}
        <section className="py-20 bg-white dark:bg-gray-900 transition-colors">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="text-center p-8 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-200 dark:hover:border-orange-400 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/70 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-orange-600 dark:text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">Our Vision</h3>
                  <p className="text-gray-600 dark:text-gray-200 leading-relaxed transition-colors">
                    To be the leading global platform for blockchain education, fostering innovation and excellence.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center p-8 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-200 dark:hover:border-orange-400 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/70 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-orange-600 dark:text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">Our Mission</h3>
                  <p className="text-gray-600 dark:text-gray-200 leading-relaxed transition-colors">
                    To bridge the gap between traditional education and the evolving needs of the blockchain industry
                    through high-quality, hands-on learning experiences.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center p-8 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-200 dark:hover:border-orange-400 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/70 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-orange-600 dark:text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">Our Approach</h3>
                  <p className="text-gray-600 dark:text-gray-200 leading-relaxed transition-colors">
                    Modern and phenomenal! Blending Web3 elements with a forward-thinking, engaging, and comprehensive
                    curriculum.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Malaysia Digital Status */}
        <section className="py-20 bg-gray-50 dark:bg-gray-800 transition-colors">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">
                  Join the Blockchain Revolution at <span className="text-orange-600 dark:text-orange-400">Maal Data Lab</span>
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed transition-colors">
                  Maal Data Lab has been awarded Malaysia Digital Status by the Malaysian Government, through MDEC,
                  recognizing our ability to participate in and contribute to the country's digital transformation
                  initiatives under the Malaysia Digital program.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-08-17%20at%2010.29.42%E2%80%AFAM-Gtw4uTaIV7SOJkUkOUW4sf61XC90iu.png"
                    alt="Malaysia Digital Status Certificate"
                    width={500}
                    height={600}
                    className="rounded-lg shadow-lg"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Malaysia Digital Status Recognition</h3>
                  <p className="text-gray-600 dark:text-gray-200 mb-6 leading-relaxed">
                    This prestigious certification validates our commitment to digital excellence and positions us as a
                    key contributor to Malaysia's digital transformation journey.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full mt-2"></div>
                      <p className="text-gray-600 dark:text-gray-200">Recognized by Malaysian Government through MDEC</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full mt-2"></div>
                      <p className="text-gray-600 dark:text-gray-200">Certified for digital transformation initiatives</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full mt-2"></div>
                      <p className="text-gray-600 dark:text-gray-200">Part of Malaysia Digital program</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Program & Awards */}
        <section className="py-20 bg-white dark:bg-gray-900 transition-colors">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              {/* Header Section */}
              <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-8 transition-colors">
                  Our Program & Award
                </h2>
                <div className="max-w-4xl mx-auto">
                  <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed transition-colors">
                    Our globally recognized Dual Diploma Program, developed in collaboration with Maal Data Lab and Warnborough College UK.
                  </p>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-5 gap-16 items-start">
                {/* Left Description - Takes 2 columns */}
                <div className="lg:col-span-2">
                  <div className="sticky top-8">
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-6 transition-colors">
                      Comprehensive Education Partnership
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8 transition-colors">
                      Experience world-class blockchain education through our strategic partnerships with leading institutions and industry experts.
                    </p>
                    <div className="hidden lg:block">
                      <div className="w-20 h-1 bg-orange-600 dark:bg-orange-400 mb-4"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-500 transition-colors">
                        Recognized globally • Industry-focused • Career-ready
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Programs List - Takes 3 columns */}
                <div className="lg:col-span-3">
                  <div className="space-y-12">
                    {/* Professional Diploma */}
                    <div className="group">
                      <div className="flex items-start justify-between gap-8">
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            Professional Diploma in Blockchain Technology (PDipBT)
                          </h4>
                          <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed transition-colors">
                            Industry-focused certification that prepares you for real-world blockchain applications.
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-all group-hover:shadow-md">
                            <Image
                              src="/assets/lms-orange.webp"
                              alt="Phenomenal Based LMS"
                              width={120}
                              height={40}
                              className="h-10 w-auto object-contain"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Academic Diploma */}
                    <div className="group">
                      <div className="flex items-start justify-between gap-8">
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            Diploma in Blockchain Technology (DipBT)
                          </h4>
                          <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed transition-colors">
                            Academic qualification from Warnborough College UK, providing theoretical foundation.
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-all group-hover:shadow-md">
                            <Image
                              src="/assets/warnaborough-logo.webp"
                              alt="Warnborough College UK"
                              width={120}
                              height={40}
                              className="h-10 w-auto object-contain"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* University Partnership */}
                    <div className="group">
                      <div className="flex items-start justify-between gap-8">
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            University Partnership
                          </h4>
                          <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed transition-colors">
                            Strategic collaboration with leading Malaysian universities for enhanced academic recognition.
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-all group-hover:shadow-md">
                            <Image
                              src="/assets/ums.webp"
                              alt="Universiti Malaysia Sabah"
                              width={120}
                              height={40}
                              className="h-10 w-auto object-contain"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Corporate Training */}
                    <div className="group">
                      <div className="flex items-start justify-between gap-8">
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            Corporate Training Certification (CTC)
                          </h4>
                          <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed transition-colors">
                            Specialized corporate training programs for organizations looking to upskill their teams.
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-all group-hover:shadow-md">
                            <Image
                              src="/assets/maal-data-lab.webp"
                              alt="Maal Data Lab"
                              width={120}
                              height={40}
                              className="h-10 w-auto object-contain"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call to Action */}
              <div className="text-center mt-20">
                <div className="inline-flex items-center justify-center">
                  <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                    Begin Learning Today
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
