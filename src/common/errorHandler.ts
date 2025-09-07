// Database error handler utility - provides consistent error responses
import type { Context } from "hono";

export interface DatabaseErrorResponse {
  status: number;
  error: string;
}

/**
 * Standardized database error handler that converts database errors
 * into user-friendly HTTP responses with appropriate status codes.
 */
export function handleDatabaseError(error: unknown): DatabaseErrorResponse {
  if (!(error instanceof Error)) {
    return {
      status: 500,
      error: "An unexpected error occurred. Please try again.",
    };
  }

  // Handle DrizzleQueryError specifically
  let errorMessage = error.message.toLowerCase();
  let constraintName = "";

  // Check if this is a DrizzleQueryError with a cause
  if ("cause" in error && error.cause && typeof error.cause === "object") {
    const cause = error.cause as Record<string, unknown>;
    if (typeof cause.constraint === "string") {
      constraintName = cause.constraint.toLowerCase();
    }
    if (typeof cause.message === "string") {
      errorMessage += " " + cause.message.toLowerCase();
    }
    if (typeof cause.detail === "string") {
      errorMessage += " " + cause.detail.toLowerCase();
    }
  }

  // Debug logging to help identify issues (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log("Error Handler Debug:", {
      originalMessage: error.message,
      constraintName,
      processedMessage: errorMessage,
    });
  }

  // Foreign key constraint violations - check both constraint name and message
  if (
    constraintName.includes("books_category_id_categories_id_fk") ||
    errorMessage.includes("books_category_id_categories_id_fk")
  ) {
    return {
      status: 400,
      error: "Invalid category ID. The specified category does not exist.",
    };
  }

  if (
    constraintName.includes("books_author_id_users_id_fk") ||
    errorMessage.includes("books_author_id_users_id_fk")
  ) {
    return {
      status: 400,
      error: "Invalid author ID. The specified author does not exist.",
    };
  }

  if (
    constraintName.includes("foreign key constraint") ||
    errorMessage.includes("foreign key constraint") ||
    constraintName.includes("_fk") ||
    errorMessage.includes("violates foreign key constraint")
  ) {
    return {
      status: 400,
      error: "Invalid reference ID. One or more specified IDs do not exist.",
    };
  }

  // Unique constraint violations
  if (
    errorMessage.includes("unique constraint") ||
    errorMessage.includes("duplicate key")
  ) {
    if (errorMessage.includes("username")) {
      return {
        status: 409,
        error: "Username is already taken. Please choose another.",
      };
    }
    if (errorMessage.includes("email")) {
      return {
        status: 409,
        error: "Email address is already registered. Please use another.",
      };
    }
    return {
      status: 409,
      error: "A record with this information already exists.",
    };
  }

  // Not null constraint violations
  if (
    errorMessage.includes("not null constraint") ||
    errorMessage.includes("null value")
  ) {
    return {
      status: 400,
      error: "Missing required field. Please check your input data.",
    };
  }

  // Check constraint violations
  if (errorMessage.includes("check constraint")) {
    return {
      status: 400,
      error: "Invalid data format. Please check your input values.",
    };
  }

  // Connection and database availability errors (more specific patterns)
  if (
    errorMessage.includes("connection") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("network") ||
    errorMessage.includes("server closed") ||
    errorMessage.includes("connect ECONNREFUSED")
  ) {
    return {
      status: 503,
      error: "Database connection error. Please try again in a moment.",
    };
  }

  // Permission and access errors
  if (errorMessage.includes("permission") || errorMessage.includes("access")) {
    return {
      status: 403,
      error: "Access denied. You don't have permission to perform this action.",
    };
  }

  // Invalid input syntax errors
  if (errorMessage.includes("invalid input syntax")) {
    return {
      status: 400,
      error: "Invalid data format. Please check your input.",
    };
  }

  // Constraint violation during deletion
  if (errorMessage.includes("violates") && errorMessage.includes("delete")) {
    return {
      status: 409,
      error: "Cannot delete this record because it's referenced by other data.",
    };
  }

  // Default case for unknown database errors
  return {
    status: 500,
    error: "A database error occurred. Please try again or contact support.",
  };
}

/**
 * Helper function to send standardized error responses
 */
export function sendErrorResponse(c: Context, error: unknown) {
  const dbError = handleDatabaseError(error);

  return c.json(
    {
      success: false,
      data: null,
      error: dbError.error,
    },
    dbError.status as 400 | 401 | 403 | 404 | 409 | 500 | 503,
  );
}
