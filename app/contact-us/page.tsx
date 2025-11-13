import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { Mail, MessageCircle, Phone } from "lucide-react"

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-orange-50 via-white to-orange-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                {/* Left Content */}
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Let's Connect
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                      We'd Love To{" "}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
                        Hear From You
                      </span>
                    </h1>
                    
                    <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-xl">
                      If you have any questions or concerns, please write them below. One of our team members will get back to you as soon as possible.
                    </p>
                  </div>

                  {/* Get In Touch Section */}
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Get In Touch
                    </h2>
                    
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      Connect with us to experience seamless communication. We value open dialogue and are eager to engage with you, whether you have questions, ideas, or feedback, we are here to listen and respond.
                    </p>

                    {/* Contact Cards */}
                    <div className="grid sm:grid-cols-1 gap-4">
                      <Card className="border-2 border-orange-100 dark:border-orange-900/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:border-orange-200 dark:hover:border-orange-800 transition-all duration-300 hover:shadow-lg">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                              <Mail className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                Email Us
                              </h3>
                              <a
                                href="mailto:support@maaledu.com"
                                className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium transition-colors"
                              >
                                support@maaledu.com
                              </a>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* CTA Button */}
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                      asChild
                    >
                      <a href="mailto:support@maaledu.com" className="inline-flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Send us a Message
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Right Image */}
                <div className="relative">
                  {/* Clean Image Container - No borders, blends with background */}
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <Image
                      src="/assets/contact-us-2.webp"
                      alt="Person using smartphone and laptop for communication"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
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
