import type { Context } from "hono";
import {
  registerUser,
  loginUser,
  logoutUser,
  generatePasswordResetOTP,
  verifyOTPAndResetPassword,
} from "./service.js";
import { sendErrorResponse } from "@/common/errorHandler.js";

export class AuthController {
  // POST /auth/register
  public static async register(c: Context) {
    try {
      const data = await c.req.json();

      const result = await registerUser(
        data.name,
        data.username,
        data.email,
        data.password,
      );

      return c.json(
        {
          success: true,
          data: result,
          error: null,
        },
        201,
      );
    } catch (error) {
      return sendErrorResponse(c, error);
    }
  }

  // POST /auth/login
  public static async login(c: Context) {
    try {
      const data = await c.req.json();

      const result = await loginUser(data.identifier, data.password);

      return c.json({
        success: true,
        data: result,
        error: null,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Invalid credentials")
      ) {
        return c.json(
          {
            success: false,
            data: null,
            error: "Invalid credentials",
          },
          401,
        );
      }

      return sendErrorResponse(c, error);
    }
  }

  // POST /auth/logout
  public static async logout(c: Context) {
    try {
      const authHeader = c.req.header("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json(
          {
            success: false,
            data: null,
            error: "No token provided",
          },
          401,
        );
      }

      const token = authHeader.substring(7);
      const logoutResult = await logoutUser(token);

      if (!logoutResult) {
        return c.json(
          {
            success: false,
            data: null,
            error: "Invalid or expired token",
          },
          401,
        );
      }

      return c.json({
        success: true,
        data: { message: "Logged out successfully" },
        error: null,
      });
    } catch (error) {
      return sendErrorResponse(c, error);
    }
  }

  // POST /auth/forgot-password
  public static async forgotPassword(c: Context) {
    try {
      const data = await c.req.json();

      try {
        await generatePasswordResetOTP(data.email);
      } catch {
        console.log(
          "Password reset attempt for non-existent email:",
          data.email,
        );
      }

      return c.json({
        success: true,
        data: { message: "If the email exists, a reset code has been sent." },
        error: null,
      });
    } catch (error) {
      return sendErrorResponse(c, error);
    }
  }

  // POST /auth/reset-password
  public static async resetPassword(c: Context) {
    try {
      const data = await c.req.json();

      await verifyOTPAndResetPassword(data.email, data.otp, data.newPassword);

      return c.json({
        success: true,
        data: { message: "Password reset successfully" },
        error: null,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Invalid or expired")
      ) {
        return c.json(
          {
            success: false,
            data: null,
            error: error.message,
          },
          400,
        );
      }

      return sendErrorResponse(c, error);
    }
  }
}
