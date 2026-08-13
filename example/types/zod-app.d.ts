import { User } from "@example/schema";

declare module "@plugin" {
  interface ZodAppUser extends User {}
}
