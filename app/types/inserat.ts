export interface Inserat {
  id: string;
  recipientId: string;
  recipientUsername: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  date: string;
  timeframe: string;
  status: "OPEN" | "ACCEPTED" | "DONE";
  creationDate: string;
  volunteerAppliedCount: number;
  volunteerAppliedIds?: string[];
  volunteerAcceptedUsername: string | null;
  volunteerAcceptedPhone: string | null;
  volunteerAcceptedEmail: string | null;
  recipientSurname?: string;
  recipientLastname?: string;
  recipientAge?: number;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  workType?: string;
  time?: string | null;
}

export interface Applicant {
  id: string;
  username: string;
  dateOfBirth: string | null;
}
