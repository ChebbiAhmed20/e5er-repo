import { Router } from "express";
import { authController } from "./auth.controller.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { refreshTokenSchema, signInSchema, signUpSchema } from "./auth.dto.js";

export const authRoutes = Router();

authRoutes.post("/signup", validate(signUpSchema), authController.signUp);
authRoutes.post("/signin", validate(signInSchema), authController.signIn);
authRoutes.post("/refresh", validate(refreshTokenSchema), authController.refreshToken);
authRoutes.post("/signout", validate(refreshTokenSchema), authController.signOut);
authRoutes.get("/me", authenticate, authController.getMe);
