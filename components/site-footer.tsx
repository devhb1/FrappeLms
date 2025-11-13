import Link from "next/link"
import { Facebook, Youtube, Send, Github } from "lucide-react"
import { getLMSRegistrationUrl } from "@/lib/config/lms"

export function SiteFooter() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 transition-colors">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {/* Contact Us */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-orange-600">Contact Us</h4>
            <div className="space-y-3">
              <Link
                href="mailto:support@maaledu.com"
                className="text-gray-700 dark:text-gray-300 hover:text-orange-600 transition-colors block"
              >
                support@maaledu.com
              </Link>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-orange-600">Explore</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href={getLMSRegistrationUrl()}
                  target="_blank"
                  className="text-gray-700 dark:text-gray-300 hover:text-orange-600 transition-colors"
                >
                  New Student
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-orange-600">Policies</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/policies/privacy-policy"
                  className="text-gray-700 dark:text-gray-300 hover:text-orange-600 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/policies/terms-and-conditions"
                  className="text-gray-700 dark:text-gray-300 hover:text-orange-600 transition-colors"
                >
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/policies/refund-policy"
                  className="text-gray-700 dark:text-gray-300 hover:text-orange-600 transition-colors"
                >
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-orange-600">Help</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/faqs"
                  className="text-gray-700 dark:text-gray-300 hover:text-orange-600 transition-colors"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link
                  href="/about-us"
                  className="text-gray-700 dark:text-gray-300 hover:text-orange-600 transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact-us"
                  className="text-gray-700 dark:text-gray-300 hover:text-orange-600 transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="https://maaldatalabs.com"
                  target="_blank"
                  className="text-gray-700 dark:text-gray-300 hover:text-orange-600 transition-colors"
                >
                  Maal Data Lab
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-orange-600">Social Media</h4>
            <div className="flex space-x-3">
              <Link
                href="https://www.facebook.com/lms.maaldatalabs"
                target="_blank"
                className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </Link>
              <Link
                href="https://x.com/MaalDataLabsLMS"
                target="_blank"
                className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </Link>
              <Link
                href="https://www.youtube.com/channel/UCp-tLMLKRuYyMReoy0mP08A"
                target="_blank"
                className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-5 h-5" />
              </Link>
              <Link
                href="https://github.com"
                target="_blank"
                className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </Link>
              <Link
                href="http://t.me/+0MTqkc_8SfM2OGVl"
                target="_blank"
                className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                aria-label="Telegram"
              >
                <Send className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-200 dark:border-gray-700 mt-12 pt-8">
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
            © 2025 Maal Data Lab. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
