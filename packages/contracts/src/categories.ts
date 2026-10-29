import { z } from "zod";

export const noteCategorySchema = z.enum([
  "prospect",
  "competitor",
  "non_renewal",
  "service",
  "billing",
  "price",
  "positive",
  "routine",
  "unlabeled",
  "no_notes",
]);
