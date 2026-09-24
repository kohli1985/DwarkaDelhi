import { listContactSubmissions } from "./actions";
import ContactsTable from "./ContactsTable";

export default async function ContactsPage() {
  const submissions = await listContactSubmissions();

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="mt-1 text-sm text-foreground/60">
          {submissions.length} message{submissions.length === 1 ? "" : "s"} from the contact form.
        </p>
      </div>

      <ContactsTable submissions={submissions} />
    </div>
  );
}
