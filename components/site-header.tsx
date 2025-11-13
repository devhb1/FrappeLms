/**
 * ===============================
 * SITE HEADER COMPONENT
 * ===============================
 * 
 * This is the main navigation header for the MaalEdu platform. It provides
 * a responsive, accessible navigation experience with authentication state
 * management and theme switching capabilities.
 * 
 * KEY FEATURES:
 * 1. 🔐 AUTHENTICATION AWARE: Shows different UI based on login status
 * 2. 📱 RESPONSIVE DESIGN: Mobile hamburger menu + desktop horizontal nav
 * 3. 🎨 THEME INTEGRATION: Dark/light mode toggle with theme persistence
 * 4. 🎯 USER ACCOUNT MENU: Dropdown with profile, dashboard, and logout options
 * 5. 🚀 OPTIMIZED PERFORMANCE: Image optimization and error handling
 * 
 * NAVIGATION STRUCTURE:
 * - Public Pages: Home, Courses, About Us, FAQs, Contact
 * - Auth-Dependent: Dashboard (user/admin), Profile, Sign In/Out
 * - Special Features: Grant applications, Career pathways, Certification
 * 
 * RESPONSIVE BEHAVIOR:
 * - Desktop (lg+): Full horizontal navigation with dropdowns
 * - Mobile/Tablet (<lg): Collapsible hamburger menu with sheet overlay
 * - Theme toggle and user menu available on all screen sizes
 * 
 * STATE MANAGEMENT:
 * - Session state via NextAuth (handles login/logout)
 * - Mobile menu open/close state
 * - Theme preference persistence
 * 
 * @component SiteHeader
 * @version 2.0 - Enhanced with Theme & Responsive Design
 */

"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ChevronDown, Menu, User, LogOut, LogIn, UserPlus } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { getLMSAccessUrl } from "@/lib/config/lms"

/**
 * ===============================
 * MAIN SITE HEADER COMPONENT
 * ===============================
 * 
 * Renders the primary site navigation with authentication-aware content.
 * Handles both desktop and mobile navigation patterns.
 */
export function SiteHeader() {
  // ===== COMPONENT STATE =====
  const [isOpen, setIsOpen] = useState(false)  // Mobile menu toggle state
  const { data: session, status } = useSession()  // NextAuth session data

  /**
   * Handle user logout with redirect to home page.
   * Clears session data and redirects to landing page.
   */
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <>
      {/* ===============================
           STICKY HEADER WITH GRADIENT BACKGROUND
           =============================== */}
      <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 dark:from-orange-600 dark:via-orange-700 dark:to-orange-800 shadow-lg">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">

            {/* ===============================
               BRAND LOGO & IDENTITY
               =============================== */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative h-12 w-12">
                <Image
                  src="/assets/lms-logo.png"
                  alt="MaalEdu LMS"
                  fill
                  className="object-contain"
                  priority
                  onError={(e) => {
                    console.error('Logo failed to load:', e);
                    // Fallback: Could set a default image or hide the image container
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white">MaalEdu</span>
                <span className="text-xs text-orange-100">Blockchain Education</span>
              </div>
            </Link>

            {/* ===============================
               DESKTOP NAVIGATION (HIDDEN ON MOBILE)
               =============================== */}
            <nav className="hidden lg:flex items-center justify-center flex-1 px-12">
              <div className="flex items-center space-x-10">

                {/* === HOME LINK === */}
                <Link
                  href="/"
                  className="text-white dark:text-gray-100 font-medium hover:text-orange-100 dark:hover:text-orange-200 transition-colors duration-200 relative group"
                >
                  Home
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white dark:bg-gray-100 transition-all duration-200 group-hover:w-full"></span>
                </Link>
                <Link
                  href="/about-us"
                  className="text-white dark:text-gray-100 font-medium hover:text-orange-100 dark:hover:text-orange-200 transition-colors duration-200 relative group"
                >
                  About Us
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white dark:bg-gray-100 transition-all duration-200 group-hover:w-full"></span>
                </Link>
                <Link
                  href="/career-pathway"
                  className="text-white dark:text-gray-100 font-medium hover:text-orange-100 dark:hover:text-orange-200 transition-colors duration-200 relative group"
                >
                  Career Pathway
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white dark:bg-gray-100 transition-all duration-200 group-hover:w-full"></span>
                </Link>

                <Link
                  href="/courses"
                  className="text-white dark:text-gray-100 font-medium hover:text-orange-100 dark:hover:text-orange-200 transition-colors duration-200 relative group"
                >
                  Courses
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white dark:bg-gray-100 transition-all duration-200 group-hover:w-full"></span>
                </Link>

                <Link
                  href="/certification"
                  className="text-white dark:text-gray-100 font-medium hover:text-orange-100 dark:hover:text-orange-200 transition-colors duration-200 relative group"
                >
                  Certification
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white dark:bg-gray-100 transition-all duration-200 group-hover:w-full"></span>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center text-white dark:text-gray-100 font-medium hover:text-orange-100 dark:hover:text-orange-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 dark:focus:ring-gray-100/20 focus:ring-offset-2 focus:ring-offset-orange-600 dark:focus:ring-offset-orange-700 rounded-md px-3 py-2 relative group">
                      Help
                      <ChevronDown className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:rotate-180" />
                      <span className="absolute -bottom-1 left-3 right-3 h-0.5 bg-white dark:bg-gray-100 scale-x-0 transition-transform duration-200 group-hover:scale-x-100"></span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="bg-white dark:bg-gray-800 shadow-xl border-0 dark:border dark:border-gray-700 rounded-lg mt-2 min-w-[200px]">
                    <DropdownMenuItem asChild className="hover:bg-orange-50 dark:hover:bg-orange-900/20">
                      <Link href="/faqs" className="w-full cursor-pointer py-3 px-4 text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400">FAQs</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="hover:bg-orange-50 dark:hover:bg-orange-900/20">
                      <Link href="/contact-us" className="w-full cursor-pointer py-3 px-4 text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400">Contact Us</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </nav>

            {/* Right Side Actions */}
            <div className="hidden lg:flex items-center space-x-4">
              {/* External LMS Link */}
              <Button
                asChild
                className="bg-white dark:bg-gray-100 text-orange-600 dark:text-orange-700 hover:bg-orange-50 dark:hover:bg-gray-200 font-semibold transition-colors duration-200"
              >
                <Link href={getLMSAccessUrl()} target="_blank">
                  MaalEdu LMS
                </Link>
              </Button>

              {/* Authentication Section */}
              {status === 'loading' ? (
                <div className="w-20 h-9 bg-white/20 rounded animate-pulse"></div>
              ) : session ? (
                // Logged in user
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-white dark:border-gray-200 text-white dark:text-gray-100 hover:bg-white hover:text-black dark:hover:bg-gray-100 dark:hover:text-orange-700 bg-transparent"
                    >
                      <User className="w-4 h-4 mr-2" />
                      {session.user?.email?.split('@')[0] || 'Dashboard'}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="w-full cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    {session.user?.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin-dashboard" className="w-full cursor-pointer">
                          <User className="w-4 h-4 mr-2" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Not logged in - Show Account dropdown
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-white dark:border-gray-200 text-white dark:text-gray-100 hover:bg-white hover:text-black dark:hover:bg-gray-100 dark:hover:text-orange-700 bg-transparent"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Account
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem asChild>
                      <Link href="/signin" className="w-full cursor-pointer">
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/register" className="w-full cursor-pointer">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Sign Up
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <ThemeToggle />
            </div>

            {/* Mobile Navigation */}
            <div className="flex items-center space-x-3 lg:hidden">
              {/* Theme Toggle for Mobile */}
              <ThemeToggle />

              {session ? (
                <Button
                  asChild
                  size="sm"
                  className="bg-white dark:bg-gray-100 text-orange-600 dark:text-orange-700 hover:bg-orange-50 dark:hover:bg-gray-200 font-semibold"
                >
                  <Link href="/dashboard">
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  size="sm"
                  className="bg-white dark:bg-gray-100 text-orange-600 dark:text-orange-700 hover:bg-orange-50 dark:hover:bg-gray-200 font-semibold"
                >
                  <Link href="/signin">
                    Sign In
                  </Link>
                </Button>
              )}

              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white dark:text-gray-100 hover:bg-white/10 dark:hover:bg-gray-100/10">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 bg-white dark:bg-gray-900">
                  <div className="flex flex-col space-y-6 mt-8">
                    <div className="flex items-center space-x-3 pb-6 border-b border-gray-200 dark:border-gray-700">
                      <div className="relative h-8 w-8">
                        <Image
                          src="/assets/lms-logo.png"
                          alt="MaalEdu LMS"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">MaalEdu</span>
                    </div>

                    <Link
                      href="/"
                      className="text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Home
                    </Link>
                    <Link
                      href="/about-us"
                      className="text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      About Us
                    </Link>
                    <Link
                      href="/career-pathway"
                      className="text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Career Pathway
                    </Link>
                    <Link
                      href="/courses"
                      className="text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Courses
                    </Link>
                    <Link
                      href="/certification"
                      className="text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Certification
                    </Link>

                    <div className="space-y-3 pt-2">
                      <p className="text-lg font-medium text-gray-900 dark:text-white">Help</p>
                      <Link
                        href="/faqs"
                        className="block pl-4 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1"
                        onClick={() => setIsOpen(false)}
                      >
                        FAQs
                      </Link>
                      <Link
                        href="/contact-us"
                        className="block pl-4 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1"
                        onClick={() => setIsOpen(false)}
                      >
                        Contact Us
                      </Link>
                    </div>

                    <div className="pt-6 space-y-3">
                      {session ? (
                        <>
                          <Button
                            asChild
                            className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white font-semibold"
                          >
                            <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                              Dashboard
                            </Link>
                          </Button>
                          <Button
                            onClick={() => {
                              handleSignOut()
                              setIsOpen(false)
                            }}
                            variant="outline"
                            className="w-full"
                          >
                            Sign Out
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            asChild
                            className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white font-semibold"
                          >
                            <Link href="/register" onClick={() => setIsOpen(false)}>
                              Sign Up
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            className="w-full"
                          >
                            <Link href="/signin" onClick={() => setIsOpen(false)}>
                              Sign In
                            </Link>
                          </Button>
                        </>
                      )}
                      <div className="flex justify-center pt-4">
                        <ThemeToggle />
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
