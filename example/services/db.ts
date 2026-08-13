import { User } from "@example/schema";

const users: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const getUserById = async (userId: string) => {
  // example, using an ORM or direct SQL queries
  // this is a placeholder implementation for demonstration purposes
  return users.find((user) => user.id === userId);
};

export const updateUser = async (userId: string, data: { name?: string }) => {
  // example, using an ORM or direct SQL queries
  // this is a placeholder implementation for demonstration purposes
  const user = users.find((user) => user.id === userId);
  if (!user) {
    return null;
  }
  return { ...user, ...data };
};
