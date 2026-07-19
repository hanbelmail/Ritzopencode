/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as conversations from "../conversations.js";
import type * as dashboardPreferences from "../dashboardPreferences.js";
import type * as http from "../http.js";
import type * as knowledge from "../knowledge.js";
import type * as knowledgeSeed from "../knowledgeSeed.js";
import type * as messaging from "../messaging.js";
import type * as sara from "../sara.js";
import type * as security from "../security.js";
import type * as settings from "../settings.js";
import type * as smsConsent from "../smsConsent.js";
import type * as terms from "../terms.js";
import type * as tickets from "../tickets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  conversations: typeof conversations;
  dashboardPreferences: typeof dashboardPreferences;
  http: typeof http;
  knowledge: typeof knowledge;
  knowledgeSeed: typeof knowledgeSeed;
  messaging: typeof messaging;
  sara: typeof sara;
  security: typeof security;
  settings: typeof settings;
  smsConsent: typeof smsConsent;
  terms: typeof terms;
  tickets: typeof tickets;
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
