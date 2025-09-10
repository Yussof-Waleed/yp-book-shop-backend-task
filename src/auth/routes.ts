import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AuthController } from "./controller.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./validation.js";

const authRoutes = new Hono();

authRoutes.post(
  "/register",
  zValidator("json", registerSchema),
  AuthController.register,
);
authRoutes.post(
  "/login",
  zValidator("json", loginSchema),
  AuthController.login,
);
authRoutes.post("/logout", AuthController.logout);
authRoutes.post(
  "/forgot-password",
  zValidator("json", forgotPasswordSchema),
  AuthController.forgotPassword,
);
authRoutes.post(
  "/reset-password",
  zValidator("json", resetPasswordSchema),
  AuthController.resetPassword,
);

export default authRoutes;
