export interface User {
  id: string | null;
  isVolunteer: boolean | null;
  username: string | null;
  givenName: string | null;
  lastName: string | null;
  password: string | null;
  bio: string | null;
  profilePicture: null | null;
  address: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phoneNumber: string | null;
  emailAddress: string | null;
  previousInserat: [string] | null;
  reviews: [string] | null;
  token? : string | null;
}
