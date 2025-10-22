import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function FAQSection() {
  const faqs = [
    {
      question: "What is the AI Assistant?",
      answer:
        "The AI Assistant is a cutting-edge tool designed to streamline clinical documentation, allowing healthcare professionals to focus more on patient care and less on administrative tasks.",
    },
    {
      question: "How does it generate clinical documentation?",
      answer:
        "Our AI Assistant uses advanced natural language processing and machine learning algorithms to listen to patient-provider conversations and automatically generate comprehensive and accurate clinical notes.",
    },
    {
      question: "Is the data secure and private?",
      answer:
        "Yes, data security and patient privacy are our top priorities. We comply with all relevant healthcare regulations (e.g., HIPAA) and employ robust encryption and access controls to protect sensitive information.",
    },
    {
      question: "Can it integrate with existing EHR systems?",
      answer:
        "The AI Assistant is designed for seamless integration with most existing Electronic Health Record (EHR) systems, making implementation smooth and efficient.",
    },
    {
      question: "What kind of support is available?",
      answer:
        "We offer comprehensive support, including onboarding assistance, technical support, and regular updates to ensure you get the most out of our AI Assistant.",
    },
  ]

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-white text-gray-900">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-purple-600 mb-12">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-lg font-medium hover:no-underline text-gray-800">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
