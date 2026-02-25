import { createHash } from "crypto";

export const sha256 = (input: string) => createHash("sha256").update(input).digest("hex");
