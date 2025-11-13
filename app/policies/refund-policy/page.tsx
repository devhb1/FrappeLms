import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8">
              Refund Policy
            </h1>
            
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                At Maal Data Lab, we pride ourselves on providing valuable and in-demand education in Blockchain and Blockchain-related technologies. Our services are available for purchase through online or offline channels. However, please note that we do not offer any trading practices or financial recommendations.
              </p>
              
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                Unless otherwise expressly agreed in writing by Maal Data Lab, full payment for participation in any of our offerings is required at the time of registration. In the case of offerings that include a trial window, such a trial window shall be made available only after an explicit request. Before making any purchases, we encourage you to use this free trial to ensure that the services meet your needs and requirements.
              </p>
              
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                Once your payment has been processed and your access to the corresponding resources has been activated, we do not offer refunds (partially or fully), except in rare cases. If our support team receives a refund request within seven days of your purchase, we may consider it. After seven days, we will not be able to entertain any refund requests.
              </p>
              
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                Please note that you will not be eligible for a refund if Maal Data Labs is taking action against you due to your involvement in "Restricted Activities" (as outlined in our Terms & Conditions).
              </p>
              
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                If you have any questions or concerns, please don't hesitate to contact us.
              </p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
