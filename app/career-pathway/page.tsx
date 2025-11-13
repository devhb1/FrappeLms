import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { 
  Code, 
  Layers, 
  Lightbulb, 
  Settings, 
  FileText, 
  BarChart3, 
  Scale, 
  Search,
  Briefcase,
  Database
} from "lucide-react"

export default function CareerPathwayPage() {
  const careerPaths = [
    {
      icon: Code,
      title: "Blockchain Developer",
      description: "Build blockchain applications and smart contracts using Solidity and Python. Knowledge spans blockchain platforms, cryptography, and consensus algorithms. Work with startups, tech companies, and financial institutions.",
    },
    {
      icon: Layers,
      title: "Blockchain Architect", 
      description: "Design and implement blockchain systems with focus on network architecture and security integration. Expertise in blockchain frameworks and enterprise system design. Roles at consulting firms and technology providers.",
    },
    {
      icon: Lightbulb,
      title: "Blockchain Consultant",
      description: "Guide organizations in blockchain strategy and implementation. Combine analytical skills with deep blockchain knowledge to transform business solutions. Opportunities in management consulting and strategic advisory.",
    },
    {
      icon: Settings,
      title: "Smart Contract Developer",
      description: "Develop and deploy secure smart contracts on blockchain platforms. Master Solidity and blockchain protocols with precision and focus. Work in fintech startups and legal tech companies.",
    },
    {
      icon: FileText,
      title: "Blockchain Project Manager",
      description: "Lead blockchain initiatives from concept to deployment, aligning with business objectives. Blend technical understanding with project management expertise. Positions at tech companies and blockchain enterprises.",
    },
    {
      icon: BarChart3,
      title: "Cryptocurrency Analyst",
      description: "Research market trends and provide cryptocurrency investment insights. Apply financial analysis to blockchain markets and digital assets. Work with financial institutions and crypto exchanges.",
    },
    {
      icon: Scale,
      title: "Blockchain Legal Consultant",
      description: "Address blockchain regulations, smart contracts, and compliance requirements. Combine legal expertise with blockchain technology understanding. Roles in law firms and regulatory bodies.",
    },
    {
      icon: Database,
      title: "DApp Developer",
      description: "Create decentralized applications with strong UX/UI focus. Apply programming skills across blockchain platforms. Opportunities in tech startups and blockchain companies.",
    },
    {
      icon: Briefcase,
      title: "Blockchain Quality Engineer",
      description: "Test blockchain applications and smart contracts for reliability and security. Apply quality assurance frameworks to blockchain solutions. Work with development firms and tech companies.",
    },
    {
      icon: Search,
      title: "Blockchain Researcher",
      description: "Advance blockchain technology through academic and industry research. Contribute to technological innovation and new applications. Positions at research institutions and think tanks.",
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 dark:from-orange-600 dark:via-orange-700 dark:to-orange-800 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="text-white">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Career Pathways In Blockchain
              </h1>
              <div className="w-16 h-1 bg-white mb-6"></div>
              <p className="text-xl text-orange-100 leading-relaxed">
                Unlock Your Future with Blockchain Expertise!
              </p>
            </div>
            <div className="relative flex justify-center">
              <div className="relative">
                <Image
                  src="/assets/Training 1.png"
                  alt="Professional with laptop"
                  width={500}
                  height={400}
                  className="relative z-10"
                />
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-orange-300/30 rounded-full"></div>
                <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-orange-300/20 rounded-full"></div>
                <div className="absolute top-1/2 -right-8 w-4 h-4 bg-orange-300/40 rounded-full"></div>
                <div className="absolute top-16 -left-4 w-6 h-6 bg-orange-300/25 rounded-full"></div>
                {/* Floating icon elements */}
                <div className="absolute top-8 right-12 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded"></div>
                </div>
                <div className="absolute bottom-16 right-4 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Background decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-orange-300/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-orange-300/10 rounded-full blur-2xl"></div>
      </section>

      {/* Description Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800 transition-colors">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              Maal Data Lab's blockchain program, featuring a dual diploma with our global University partners, prepares graduates for diverse 
              roles in the blockchain industry. Our comprehensive curriculum develops the skills and credentials needed for professional success 
              in this rapidly growing field.
            </p>
          </div>
        </div>
      </section>

      {/* Career Paths Grid */}
      <section className="py-20 bg-white dark:bg-gray-900 transition-colors">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
              {careerPaths.map((path, index) => {
                const Icon = path.icon
                return (
                  <Card key={index} className="p-8 hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <CardContent className="p-0">
                      <div className="flex items-start gap-6">
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/70 rounded-xl flex items-center justify-center">
                            <Icon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                            <span className="text-orange-600 dark:text-orange-400">{path.title.split(' ')[0]}</span>
                            <span className="text-gray-900 dark:text-white"> {path.title.split(' ').slice(1).join(' ')}</span>
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                            {path.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
