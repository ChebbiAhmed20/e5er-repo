import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";

export const hashPassword = (plainPassword: string) => bcrypt.hash(plainPassword, env.BCRYPT_ROUNDS);

export const comparePassword = (plainPassword: string, hash: string) => bcrypt.compare(plainPassword, hash);
