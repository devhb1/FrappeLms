import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { getLMSRegistrationUrl } from "@/lib/config/lms"

export default function CertificationPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-white">
                <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                  Blockchain Certification with
                  <br />
                  <span className="text-white">Maal Data Lab</span>
                </h1>
                <div className="w-12 h-1 bg-white mb-6"></div>
                <p className="text-xl text-orange-100 mb-8 leading-relaxed max-w-lg">
                  Advance your blockchain career with Maal Data Lab integrated dual diploma program, offering both practical
                  skills and academic recognition.
                </p>
                <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 px-8 py-3" asChild>
                  <a href={getLMSRegistrationUrl()} target="_blank" rel="noopener noreferrer">
                    Get Started Today
                  </a>
                </Button>
              </div>
              <div className="relative lg:block hidden">
                <div className="relative">
                  <div className="w-80 h-96 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full blur-3xl opacity-30 absolute -top-10 -right-10"></div>
                  <Image
                    src="/assets/Training 1.png"
                    alt="Blockchain Professional"
                    width={500}
                    height={400}
                    className="relative z-10 object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-600 to-transparent opacity-20"></div>
        </section>

        {/* Professional & Academic Diplomas Section */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="relative">
                  <div className="relative">
                    <Image
                      src="/assets/certificate-image-1.png"
                      alt="Professional Network and Collaboration"
                      width={600}
                      height={400}
                      priority
                    />
                  </div>
                </div>
                <div>
                  <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
                    Professional & Academic Diplomas in
                    <span className="text-orange-600 dark:text-orange-400 block mt-2">
                      Blockchain Technology Management
                    </span>
                  </h2>
                  <div className="w-12 h-1 bg-orange-600 mb-6"></div>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                    Achieve dual recognition with one comprehensive program, awarding you both the
                    Professional Diploma from Maal Data Lab Sdn Bhd and the [Academic] Diploma from
                    Warnborough College, UK.
                  </p>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3" asChild>
                    <a href="/faqs">
                      Learn More
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dual Diploma Program Features */}
        <section className="py-20 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  <span className="text-orange-600 dark:text-orange-400">Dual Diploma</span>
                  <span className="text-gray-900 dark:text-gray-100"> Program</span>
                </h2>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
                {/* Course Structure */}
                <div className="text-center group">
                  <div className="w-20 h-20 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-700 transition-colors">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Course Structure</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    A cohesive curriculum that covers blockchain fundamentals, smart contract development, blending practical training with theoretical insights.
                  </p>
                </div>

                {/* Practical Training */}
                <div className="text-center group">
                  <div className="w-20 h-20 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-700 transition-colors">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Practical Training</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    Engage in hands-on projects and real-world applications guided by industry experts, ensuring industry readiness.
                  </p>
                </div>

                {/* Academic Excellence */}
                <div className="text-center group">
                  <div className="w-20 h-20 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-700 transition-colors">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Academic Excellence</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    Earn a dual diploma that combines academic rigor with industry relevance, recognized globally.
                  </p>
                </div>

                {/* Collaborative Learning */}
                <div className="text-center group">
                  <div className="w-20 h-20 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-700 transition-colors">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Collaborative Learning</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    Participate in interactive sessions, discussions, and projects, fostering a collaborative learning environment.
                  </p>
                </div>

                {/* Global Recognition */}
                <div className="text-center group">
                  <div className="w-20 h-20 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-700 transition-colors">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Global Recognition</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    Benefit from qualifications respected internationally, enhancing your career prospects across the globe.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Certificate Showcase Section */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  <span className="text-orange-600 dark:text-orange-400">Earn Your</span>
                  <span className="text-gray-900 dark:text-gray-100"> Certificate & </span>
                  <span className="text-orange-600 dark:text-orange-400">Advance Your Career!</span>
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                  Join thousands of professionals who have transformed their careers with our comprehensive blockchain
                  certification program. Get recognized for your expertise with our prestigious certificate.
                </p>
              </div>

              <div className="relative max-w-4xl mx-auto">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/10 dark:to-orange-800/10 rounded-3xl p-8 md:p-12 shadow-2xl">
                  <div className="relative">
                    <Image
                      src="/LMS Cert 2.png"
                      alt="Phenomenal Based LMS Certificate of Attainment"
                      width={800}
                      height={600}
                      className="w-full h-auto rounded-xl shadow-lg"
                      priority
                    />
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                  </div>

                  <div className="mt-8 text-center">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                      Official Certificate of Completion
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                      Upon successful completion of our blockchain technology program, you will receive this
                      professionally designed certificate recognizing your achievement and expertise in blockchain technology.
                    </p>

                    <div className="grid md:grid-cols-3 gap-6 mt-8">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Instant Digital Delivery</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Receive your certificate immediately upon course completion</p>
                      </div>

                      <div className="text-center">
                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Verified Authenticity</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Each certificate includes unique verification codes</p>
                      </div>

                      <div className="text-center">
                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 00-2 2H6a2 2 0 00-2-2V4m8 0h2m-2 0h2m-2 0V2" />
                          </svg>
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Professional Quality</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">High-resolution certificate suitable for printing and sharing</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-700 dark:to-orange-800">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to Start Your Blockchain Journey?
              </h2>
              <p className="text-xl text-orange-100 dark:text-orange-200 mb-8 leading-relaxed">
                Join thousands of professionals who have advanced their careers with our comprehensive blockchain certification program.
              </p>
              <div className="flex justify-center">
                <Button size="lg" variant="secondary" className="px-8 py-3 text-lg" asChild>
                  <a href={getLMSRegistrationUrl()} target="_blank" rel="noopener noreferrer">
                    Enroll Now
                  </a>
                </Button>
                {/* <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-3 text-lg border-white text-white hover:bg-white hover:text-orange-600 bg-transparent"
                >
                  Download Brochure
                </Button> */}
              </div>

              <div className="grid md:grid-cols-3 gap-8 mt-16 text-center">
                <div>
                  <div className="text-3xl font-bold text-white mb-2">500+</div>
                  <div className="text-orange-100">Certified Professionals</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-2">95%</div>
                  <div className="text-orange-100">Success Rate</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-2">24/7</div>
                  <div className="text-orange-100">Learning Support</div>
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
