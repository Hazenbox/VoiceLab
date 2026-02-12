import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Authorization Helper for Convex Mutations
 * 
 * Since we use device-based identity (not proper auth), this provides
 * a basic authorization layer for admin operations.
 * 
 * For internal tools with trusted users, we verify:
 * 1. A valid user exists in the database
 * 2. The user has an admin-eligible role (leadership)
 * 
 * NOTE: This is NOT a production-grade auth system.
 * For public apps, use Convex Auth, Clerk, or Auth0.
 */

// Roles that can perform admin operations
const ADMIN_ROLES = ["leadership"] as const;

// Roles that can modify knowledge (broader than admin)
const KNOWLEDGE_EDITOR_ROLES = ["leadership", "product", "ux_writer"] as const;

export interface AuthContext {
  userId: Id<"users"> | null;
  deviceId: string | null;
  role: string | null;
  isAdmin: boolean;
  isKnowledgeEditor: boolean;
}

/**
 * Get authorization context from a device ID
 * Returns user info and permission flags
 */
export async function getAuthContext(
  ctx: QueryCtx | MutationCtx,
  deviceId: string | undefined
): Promise<AuthContext> {
  if (!deviceId) {
    return {
      userId: null,
      deviceId: null,
      role: null,
      isAdmin: false,
      isKnowledgeEditor: false,
    };
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_deviceId", (q) => q.eq("deviceId", deviceId))
    .first();

  if (!user) {
    return {
      userId: null,
      deviceId,
      role: null,
      isAdmin: false,
      isKnowledgeEditor: false,
    };
  }

  const role = user.role;
  const isAdmin = ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number]);
  const isKnowledgeEditor = KNOWLEDGE_EDITOR_ROLES.includes(
    role as typeof KNOWLEDGE_EDITOR_ROLES[number]
  );

  return {
    userId: user._id,
    deviceId,
    role,
    isAdmin,
    isKnowledgeEditor,
  };
}

/**
 * Verify the user has admin privileges
 * Throws an error if not authorized
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  deviceId: string | undefined
): Promise<AuthContext> {
  const authContext = await getAuthContext(ctx, deviceId);

  if (!authContext.userId) {
    throw new Error("Unauthorized: User not found. Please complete onboarding.");
  }

  if (!authContext.isAdmin) {
    throw new Error(
      `Unauthorized: Admin access required. Your role "${authContext.role}" does not have admin privileges.`
    );
  }

  return authContext;
}

/**
 * Verify the user can edit knowledge items
 * Throws an error if not authorized
 */
export async function requireKnowledgeEditor(
  ctx: QueryCtx | MutationCtx,
  deviceId: string | undefined
): Promise<AuthContext> {
  const authContext = await getAuthContext(ctx, deviceId);

  if (!authContext.userId) {
    throw new Error("Unauthorized: User not found. Please complete onboarding.");
  }

  if (!authContext.isKnowledgeEditor) {
    throw new Error(
      `Unauthorized: Knowledge editing requires one of these roles: ${KNOWLEDGE_EDITOR_ROLES.join(", ")}. Your role is "${authContext.role}".`
    );
  }

  return authContext;
}

/**
 * Verify the user is authenticated (any role)
 * Throws an error if not authenticated
 */
export async function requireAuthenticated(
  ctx: QueryCtx | MutationCtx,
  deviceId: string | undefined
): Promise<AuthContext> {
  const authContext = await getAuthContext(ctx, deviceId);

  if (!authContext.userId) {
    throw new Error("Unauthorized: User not found. Please complete onboarding.");
  }

  return authContext;
}
