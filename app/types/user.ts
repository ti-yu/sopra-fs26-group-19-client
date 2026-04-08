export interface User {
  id: string;
  isVolunteer: boolean;
  username: string;
  givenName: string;
  lastName: string;
  password: string;
  bio: string | null;
  profilePicture: null | null;
  address: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phoneNumber: string | null;
  emailAddress: string;
  previousInserat: [string] | null;
  reviews: [string] | null;
  token? : string | null;
}
