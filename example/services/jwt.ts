import { User } from "@example/schema";

export const verifyToken = (token: string): Promise<User> => {
  // example:
  // const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // return decoded;

  return Promise.resolve({
    id: "user-id",
    name: "Demo User",
    email: "user@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    roles: ["user"],
  });
};
