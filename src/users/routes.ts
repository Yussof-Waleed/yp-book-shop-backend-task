// User profile routes
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { UsersController } from "./controller.js";
import { authMiddleware } from "../auth/middleware.js";
import { editProfileSchema, changePasswordSchema } from "./validation.js";

const userRoutes = new Hono();

userRoutes.get("/", authMiddleware, UsersController.getProfile);
userRoutes.put(
  "/edit",
  authMiddleware,
  zValidator("json", editProfileSchema),
  UsersController.editProfile,
);
userRoutes.post(
  "/change-password",
  authMiddleware,
  zValidator("json", changePasswordSchema),
  UsersController.changePassword,
);

export default userRoutes;
