import type { Context } from "hono";
import { getUserById, updateProfile, changePassword } from "./service.js";
import { sendErrorResponse } from "../common/errorHandler.js";

export class UsersController {
  // GET /users/profile
  public static async getProfile(c: Context) {
    try {
      const userInfo = c.get("user");
      const user = await getUserById(userInfo.id);

      if (!user[0]) {
        return c.json(
          {
            success: false,
            data: null,
            error: "User not found",
          },
          404,
        );
      }

      return c.json({
        success: true,
        data: user[0],
        error: null,
      });
    } catch (error) {
      console.error("Error in getProfile:", error);
      return sendErrorResponse(c, error);
    }
  }

  // PUT /users/profile
  public static async editProfile(c: Context) {
    try {
      const userInfo = c.get("user");
      const data = await c.req.json();

      await updateProfile(userInfo.id, data);

      return c.json({
        success: true,
        data: { message: "Profile updated successfully" },
        error: null,
      });
    } catch (error) {
      console.error("Error in editProfile:", error);
      return sendErrorResponse(c, error);
    }
  }

  // PUT /users/change-password
  public static async changePassword(c: Context) {
    try {
      const userInfo = c.get("user");
      const data = await c.req.json();

      await changePassword(userInfo.id, data.oldPassword, data.newPassword);

      return c.json({
        success: true,
        data: { message: "Password changed successfully" },
        error: null,
      });
    } catch (error) {
      console.error("Error in changePassword:", error);

      if (error instanceof Error) {
        const errorMsg = error.message;

        if (
          errorMsg === "User not found" ||
          errorMsg === "Invalid old password"
        ) {
          return c.json(
            {
              success: false,
              data: null,
              error: errorMsg,
            },
            400,
          );
        }
      }

      return sendErrorResponse(c, error);
    }
  }
}
