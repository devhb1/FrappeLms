import Image from "next/image"

export function BlockchainRevolutionSection() {
  return (
    <section className="py-20 bg-white dark:bg-gray-900 transition-colors">
      <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-12">
        {/* Left side - Image */}
        <div className="relative w-full lg:w-1/2 flex justify-center">
          <div className="relative">
            {/* Decorative circles */}
            <div className="absolute -top-4 -left-4 w-4 h-4 bg-blue-400 rounded-full"></div>
            <div className="absolute top-20 -right-8 w-3 h-3 bg-pink-400 rounded-full"></div>
            <div className="absolute -bottom-8 left-20 w-3 h-3 bg-orange-400 rounded-full"></div>

            {/* Main circular background */}
            <div className="relative w-80 h-80 md:w-96 md:h-96 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-full flex items-center justify-center overflow-hidden">
              <div className="relative w-72 h-72 md:w-80 md:h-80">
                <Image
                  src="/assets/home-hero-2.svg"
                  alt="Student with laptop - Join the Blockchain Revolution"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Content */}
        <div className="w-full lg:w-1/2 space-y-6 text-center lg:text-left">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight transition-colors">
            Join the Blockchain Revolution
            <br />
            at <span className="text-orange-600 dark:text-orange-400">Maal Data Lab</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed transition-colors max-w-lg">
            Our dual diploma program equips you with the skills needed for the Web3 future.
            Designed for all backgrounds, our flexible courses provide hands-on experience
            and real-world insights through innovative Phenomena-Based Learning (PhBL).
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm transition-colors">
            Start your journey today!
          </p>
        </div>
      </div>
    </section>
  )
}
