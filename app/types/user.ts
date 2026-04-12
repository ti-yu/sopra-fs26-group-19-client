// User interface matching the server's UserGetDTO JSON response.
// Field names must exactly match what Jackson serializes from UserGetDTO.java.
export interface User {
  id: string;
  isVolunteer: boolean;
  username: string;
  surname: string;        // first name (was "givenName" — renamed to match server)
  lastname: string;       // last name (was "lastName" — renamed to match server)
  password: string;
  bio: string | null;
  profilePicture: string | null;
  address: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phoneNumber: string | null;
  emailAddress: string;
  previousInserat: string[] | null;
  reviews: string[] | null;
  token?: string | null;
}
