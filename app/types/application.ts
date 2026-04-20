// An Application represents a help request that a volunteer has applied to.
// The server returns this using the same InseratGetDTO shape, since the apply
// relationship is stored on the Inserat entity (volunteerApplied list).
export interface Application {
  id: string;
  recipientId: string;
  recipientUsername: string;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  description: string;
  location: string;
  date: string;
  timeframe: string;
  status: "OPEN" | "ACCEPTED" | "DONE";
  creationDate: string;
  volunteerAcceptedUsername: string | null;
  workType?: string;
}
