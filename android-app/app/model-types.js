/**
 * @typedef {'legacy'|'tool'|'advanced'} EngineName
 *
 * @typedef {Object} TrainingRecord
 * @property {number} module Stable registry ID, never an array index.
 * @property {string} token Idempotent round identity.
 * @property {number} at Unix epoch milliseconds.
 * @property {string} summary Legacy-compatible user-facing summary.
 * @property {Object=} detail Validated engine schema; absent in historical records.
 *
 * @typedef {Object} FrameMessage
 * @property {string} type Namespaced focus:* lifecycle/storage event.
 * @property {number} module Registered project identity, verified against source frame.
 *
 * Source modules share one explicit application scope in the offline bundle.
 * Cross-module mutable state lives in state.js; pure scoring and import planning
 * live in scores.js and backup-plan.js. No separate application store is created.
 */
