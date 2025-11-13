import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

export default function FAQsPage() {
  const faqs = [
    {
      question: "What is Maal Data Lab?",
      answer:
        "Maal Data Lab is a leading provider of blockchain education and technology solutions, focusing on Islamic digital asset services, distributed ledger technology, and blockchain technical and vocational education.",
    },
    {
      question: "What does your dual diploma program include?",
      answer:
        "Our dual diploma program awards you both the Professional Diploma in Blockchain Technology Management from Maal Data Lab and the [Academic] Diploma in Blockchain Technology Management from one of our global University partners. The program integrates practical skills with academic knowledge through a unified learning journey.",
    },
    {
      question: "How is the course delivered?",
      answer:
        "The course is delivered online through our Learning Management System (LMS), which features a flexible schedule and hands-on practical training. Our innovative Phenomena-Based Learning (PhBL) approach ensures that you gain real-world experience and theoretical insights.",
    },
    {
      question: "What are the key benefits of the dual diploma program?",
      answer:
        "The dual diploma program provides a comprehensive education in blockchain technology, recognized both in industry and academia. You gain practical skills through hands-on projects and theoretical knowledge, making you well-prepared for the blockchain workforce. The global recognition of the dual diplomas enhances your career prospects.",
    },
    {
      question: "Who can enroll in the program?",
      answer:
        "The program is designed for high school leavers, undergraduates, postgraduates, and professionals interested in blockchain technology. Whether you are starting your career or advancing your skills, our courses cater to various levels of experience.",
    },
    {
      question: "What is the duration of the program?",
      answer:
        "The program typically lasts for 18 months, depending on the specific course modules and your pace of study. Please refer to the course schedule for detailed information.",
    },
    {
      question: "What kind of support is available during the course?",
      answer:
        "Students receive support through interactive sessions with instructors, access to industry experts, and a collaborative learning environment. Our team is available to assist with any academic or technical queries you may have.",
    },
    {
      question: "How do I apply for the program?",
      answer:
        "You can apply through our website by filling out the application form. After submission, our team will review your application and guide you through the next steps.",
    },
    {
      question: "What are the payment options for the program?",
      answer:
        "We offer various payment options to suit different needs. Detailed information on fees and payment plans is available on the application page or by contacting our support team.",
    },
    {
      question: "Are there any prerequisites for enrolling?",
      answer:
        "No specific prerequisites are required for enrolment. Our program is designed to accommodate learners at different stages, from beginners to advanced professionals.",
    },
    {
      question: "How is the dual diploma recognized?",
      answer:
        "The Professional Diploma is recognized by industry professionals and employers, while the [Academic] Diploma is respected in the educational sector and internationally. Together, they offer a comprehensive credential that enhances your career opportunities.",
    },
    {
      question: "Can I balance the program with my job or other commitments?",
      answer:
        "Yes, our flexible schedule is designed to accommodate working professionals and other commitments. The online format and modular structure allow you to study at your own pace.",
    },
    {
      question: "What happens after I complete the program?",
      answer:
        "Upon successful completion, you will receive both diplomas, and you will be equipped with the skills and knowledge needed to advance in the blockchain industry. You will also join our network of alumni, providing you with additional career opportunities and resources.",
    },
    {
      question: "How do I contact customer support?",
      answer:
        "You can contact our customer support team via email at support@maaledu.com, or through our contact form on the website. We are here to assist you with any questions or concerns.",
    },
    {
      question: "Where can I find more information about the program?",
      answer:
        "For more information, you can visit our website's course details page or contact our support team for personalized assistance.",
    },
    {
      question: "Why should I pay for these courses when there are free resources available online?",
      answer:
        "Our courses offer a structured, expert-led learning experience that free resources often lack. You'll benefit from a comprehensive curriculum, hands-on practical training, and industry-recognized certifications that can significantly enhance your career prospects and set you apart from the competition.",
    },
    {
      question: "I'm concerned about the cost. Can I be sure the investment will be worth it?",
      answer:
        "Investing in our courses is a strategic decision that pays off long-term. The skills and dual diplomas you earn will open doors to lucrative career opportunities and higher earning potential. With training developed in collaboration with respected institutions like University Malaysia Sabah, Warnborough College (UK) and UiTM, Poland, you're getting industry-relevant expertise that offers substantial career benefits.",
    },
    {
      question: "I'm not sure if I have enough time to commit to these courses. How flexible are they?",
      answer:
        "Our courses are designed with flexibility in mind. You can access course materials on-demand and at your own pace, allowing you to balance your studies with other commitments. This self-paced approach ensures that you can progress according to your schedule.",
    },
    {
      question: "How can I be sure that the courses will actually help me advance my career?",
      answer:
        "Our courses are developed by industry experts to equip you with the skills and knowledge employers seek. The dual diplomas you earn will demonstrate your proficiency in blockchain technology, providing a competitive edge and opening up advanced career opportunities.",
    },
    {
      question: "I'm new to blockchain technology. Are these courses suitable for beginners?",
      answer:
        "Yes, our curriculum caters to all levels, including beginners. We offer introductory courses on blockchain fundamentals as well as advanced modules for those seeking to deepen their expertise. Our structured learning pathways ensure that you gain the knowledge and skills needed at your current level.",
    },
    {
      question: "Can I get financial assistance or scholarships to help cover the cost of the courses?",
      answer:
        "Currently, we do not offer direct financial assistance or scholarships. However, some of our industry partners provide scholarship opportunities, which may be available during the practical training components of the courses.",
    },
    {
      question: "How do the online courses differ from traditional classroom-based learning?",
      answer:
        "Our online courses provide a flexible, high-quality education similar to traditional classrooms but with added convenience. You'll have access to interactive video lectures, live virtual sessions, and extensive digital resources, all designed to fit your learning style and schedule.",
    },
    {
      question: "What kind of support can I expect during my studies?",
      answer:
        "You will receive robust support throughout your studies, including access to expert instructors, industry mentors, and technical support staff. We are here to help you with course concepts, assignments, and applying your skills effectively.",
    },
    {
      question: "Are there any networking or community-building opportunities associated with the courses?",
      answer:
        "Yes, our courses include networking opportunities such as exclusive events, virtual meetups, and community forums. These platforms allow you to connect with fellow learners, industry professionals, and blockchain enthusiasts to build a strong professional network.",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-orange-50 to-white dark:from-gray-800 dark:to-gray-900 transition-colors">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-6 bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800/70 transition-colors">
                Frequently Asked Questions
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">Got Questions?</h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed transition-colors">
                Find answers to the most common questions about our blockchain education programs, dual diploma
                certification, and learning experience.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        <section className="py-20 bg-white dark:bg-gray-900 transition-colors">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-6 hover:border-orange-200 dark:hover:border-orange-400 transition-colors"
                  >
                    <AccordionTrigger className="text-left font-semibold text-gray-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 py-6 transition-colors">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 dark:text-gray-200 leading-relaxed pb-6 transition-colors">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-20 bg-gray-50 dark:bg-gray-800 transition-colors">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">Still Have Questions?</h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed transition-colors">
                Can't find the answer you're looking for? Our support team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/contact-us"
                  className="inline-flex items-center justify-center px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
                >
                  Contact Support
                </a>
                <a
                  href="mailto:support@maaledu.com"
                  className="inline-flex items-center justify-center px-8 py-3 border border-orange-600 text-orange-600 hover:bg-orange-50 font-medium rounded-lg transition-colors"
                >
                  Email Us Directly
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
