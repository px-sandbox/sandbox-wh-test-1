export const createUserSchema = {
  type: "object",
  properties: {
    body: {
      type: "object",
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
      },
      required: ["email", "password", "firstName", "lastName"],
    },
  },
};
