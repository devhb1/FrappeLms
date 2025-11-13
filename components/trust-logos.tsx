"use client"

export function TrustLogos() {
  const partners = [
    {
      name: "Stripe",
      logo: "/assets/stripe.webp",
    },
    {
      name: "Amazon Web Services",
      logo: "/assets/aws.png",
    },
    {
      name: "BCO2",
      logo: "/assets/bco2.png",
    },
    {
      name: "Ramz",
      logo: "/assets/ramz-black.png",
    },
    {
      name: "AIGB",
      logo: "/assets/aigb-color.png",
    },
    {
      name: "P2B",
      logo: "/assets/p2b-logo.svg",
    },
    {
      name: "CoinGecko",
      logo: "/assets/coin-gecko.png",
    },
    {
      name: "Pansea",
      logo: "/assets/pansea-2.png",
    },
  ]

  return (
    <>
      <style jsx>{`
        @keyframes scroll-continuous {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .animate-scroll-continuous {
          animation: scroll-continuous 15s linear infinite;
        }
      `}</style>
      
      <section className="py-16 bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="w-full px-0">
          <div className="text-center mb-12 px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
              Trusted By Employees at Leading Organizations
            </h2>
          </div>

          {/* Single row of scrolling logos */}
          <div className="relative overflow-hidden w-full">
            <div className="flex animate-scroll-continuous space-x-24 md:space-x-32 items-center whitespace-nowrap">
              {/* First set of logos */}
              {partners.map((partner, index) => (
                <div key={index} className="flex items-center justify-center flex-shrink-0">
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="h-12 md:h-16 w-auto object-contain transition-all duration-300 hover:scale-110"
                  />
                </div>
              ))}
              {/* Duplicate set for seamless loop */}
              {partners.map((partner, index) => (
                <div key={index + partners.length} className="flex items-center justify-center flex-shrink-0">
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="h-12 md:h-16 w-auto object-contain transition-all duration-300 hover:scale-110"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
