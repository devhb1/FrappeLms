import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Code, Layers, Lightbulb, Settings, FileText, BarChart3, Scale, Search } from "lucide-react"

export function CareerPathwaysPreview() {
  const pathways = [
    {
      icon: Code,
      title: "Blockchain Developer",
      description:
        "Build blockchain applications and smart contracts using Solidity and Python. Work with startups, tech companies, and financial institutions.",
      color: "orange",
    },
    {
      icon: Layers,
      title: "Blockchain Architect",
      description:
        "Design and implement blockchain systems with focus on network architecture and security integration.",
      color: "orange",
    },
    {
      icon: Lightbulb,
      title: "Blockchain Consultant",
      description:
        "Guide organizations in blockchain strategy and implementation. Combine analytical skills with deep blockchain knowledge.",
      color: "orange",
    },
    {
      icon: Settings,
      title: "Smart Contract Developer",
      description:
        "Develop and deploy secure smart contracts on blockchain platforms. Work in fintech startups and legal tech companies.",
      color: "orange",
    },
    {
      icon: FileText,
      title: "Blockchain Project Manager",
      description: "Lead blockchain initiatives from concept to deployment, aligning with business objectives.",
      color: "orange",
    },
    {
      icon: BarChart3,
      title: "Cryptocurrency Analyst",
      description:
        "Research market trends and provide cryptocurrency investment insights. Work with financial institutions.",
      color: "orange",
    },
    {
      icon: Scale,
      title: "Blockchain Legal Consultant",
      description: "Address blockchain regulations, smart contracts, and compliance requirements in law firms.",
      color: "orange",
    },
    {
      icon: Search,
      title: "Blockchain Researcher",
      description:
        "Advance blockchain technology through academic and industry research at institutions and think tanks.",
      color: "orange",
    },
  ]

  return (
    <section className="py-20 bg-gradient-to-br from-orange-50 to-white dark:from-gray-800 dark:to-gray-900 transition-colors">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
            Career Pathways in <span className="text-orange-600 dark:text-orange-400">Blockchain</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8 transition-colors">
            Unlock Your Future with Blockchain Expertise. Our comprehensive curriculum develops the skills and
            credentials needed for professional success in this rapidly growing field.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {pathways.map((pathway, index) => {
            const Icon = pathway.icon
            return (
              <Card
                key={index}
                className="text-center p-6 hover:shadow-lg transition-all duration-300 border-0 bg-white dark:bg-gray-700 group"
              >
                <CardContent className="space-y-4">
                  <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/70 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-orange-600 dark:group-hover:bg-orange-600 transition-colors">
                    <Icon className="w-8 h-8 text-orange-600 dark:text-orange-300 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">{pathway.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-200 leading-relaxed transition-colors">{pathway.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="text-center">
          <Button asChild size="lg" className="bg-orange-600 hover:bg-orange-700 text-white">
            <Link href="/career-pathway">Explore All Career Paths</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
