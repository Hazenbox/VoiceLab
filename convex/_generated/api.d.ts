/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _auth from "../_auth.js";
import type * as adminConfig from "../adminConfig.js";
import type * as adminSessions from "../adminSessions.js";
import type * as analytics from "../analytics.js";
import type * as corrections from "../corrections.js";
import type * as crons from "../crons.js";
import type * as embeddings from "../embeddings.js";
import type * as guidelines from "../guidelines.js";
import type * as interactions from "../interactions.js";
import type * as knowledge from "../knowledge.js";
import type * as maintenance from "../maintenance.js";
import type * as migrations from "../migrations.js";
import type * as pipelineMetrics from "../pipelineMetrics.js";
import type * as seed from "../seed.js";
import type * as seedDirectiveOverrides from "../seedDirectiveOverrides.js";
import type * as seedTrainingExamples from "../seedTrainingExamples.js";
import type * as sessions from "../sessions.js";
import type * as tokenEnforcement from "../tokenEnforcement.js";
import type * as userProfiles from "../userProfiles.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _auth: typeof _auth;
  adminConfig: typeof adminConfig;
  adminSessions: typeof adminSessions;
  analytics: typeof analytics;
  corrections: typeof corrections;
  crons: typeof crons;
  embeddings: typeof embeddings;
  guidelines: typeof guidelines;
  interactions: typeof interactions;
  knowledge: typeof knowledge;
  maintenance: typeof maintenance;
  migrations: typeof migrations;
  pipelineMetrics: typeof pipelineMetrics;
  seed: typeof seed;
  seedDirectiveOverrides: typeof seedDirectiveOverrides;
  seedTrainingExamples: typeof seedTrainingExamples;
  sessions: typeof sessions;
  tokenEnforcement: typeof tokenEnforcement;
  userProfiles: typeof userProfiles;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
