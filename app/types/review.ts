// Shared Review DTO shape. Mirrors ReviewGetDTO on the server.
// Some inline interfaces (in profile/[id]/page.tsx, reviews/page.tsx) used to
// re-declare these fields ad-hoc. prefer importing this type going forward.
export type ReviewStatus = "HASNOTHAPPENED" | "PENDING" | "WRITTEN" | "IGNORED";

export interface Review {
  id: string;
  senderId: string;
  senderUsername?: string;
  receiverId: string;
  receiverUsername?: string;
  inseratId: string;
  inseratDescription?: string;
  inseratLocation?: string;
  text: string;
  creationDate: string;
  reviewStatus?: ReviewStatus;
  /** 1.0-5.0 in 0.5 steps. Nullable for legacy reviews written before #132. */
  stars?: number | null;
}
