/**
 * AEGIS-X Continuous Behavioral Monitoring SDK
 * =============================================
 * Public API re-exported for consumer convenience.
 */

export {
  aegisSDK,
  AegisBehavioralSDK,
  windowToBackendEvent,
} from './AegisBehavioralSDK'

export type {
  SDKState,
  AppScreen,
  SessionContext,
  DeviceContext,
  TransactionContext,
  BehaviorWindow,
  SessionSummary,
  SDKStateChangeCallback,
  WindowCallback,
} from './AegisBehavioralSDK'

export { useAegisSDK } from './useAegisSDK'
export type { AegisSDKHookOptions } from './useAegisSDK'
