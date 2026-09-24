import ContactForm from "./ContactForm";

export default function ContactSection() {
  return (
    <section id="contact" className="bg-foreground/[0.02] py-20 sm:py-28">
      <div className="mx-auto max-w-xl px-5 sm:px-8">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-brand">
            Get in touch
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Questions, feedback, or a listing to suggest?
          </h2>
          <p className="mt-4 text-lg leading-8 text-foreground/70">
            Send a message and we&apos;ll get back to you.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-foreground/10 bg-background p-6 sm:p-8">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
