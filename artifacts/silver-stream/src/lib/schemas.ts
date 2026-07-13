import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Using minimal empty content to override the file size. Just basic exports.
export {}