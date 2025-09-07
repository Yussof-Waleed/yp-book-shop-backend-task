// Authentication controller - handles HTTP requests for auth operations
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
  // POST /auth/register - Register new user
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

  // POST /auth/login - Login user
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
      // Handle specific auth errors
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

  // POST /auth/logout - Logout user
  public static async logout(c: Context) {
    try {
      // Extract token from Authorization header
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

      const token = authHeader.substring(7); // Remove "Bearer " prefix
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

  // POST /auth/forgot-password - Request password reset
  public static async forgotPassword(c: Context) {
    try {
      const data = await c.req.json();

      // Attempt to generate OTP but don't let errors leak information
      try {
        await generatePasswordResetOTP(data.email);
      } catch {
        // Silently handle "user not found" errors for security
        // Log the error for debugging but don't expose it to the client
        console.log(
          "Password reset attempt for non-existent email:",
          data.email,
        );
      }

      // Always return success for security - don't reveal if email exists
      return c.json({
        success: true,
        data: { message: "If the email exists, a reset code has been sent." },
        error: null,
      });
    } catch (error) {
      // Only handle unexpected errors (JSON parsing, server errors, etc.)
      return sendErrorResponse(c, error);
    }
  }

  // POST /auth/reset-password - Reset password with token
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
      // Handle specific validation errors first
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
