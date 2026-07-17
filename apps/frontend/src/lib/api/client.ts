// Single shared axios instance for all data hooks.
//
// Re-exported from ../api so every data request goes through the same
// token-injection + 401 refresh/redirect interceptor. Previously this was a
// separate bare instance with no refresh handling, so once the 15-minute
// access token expired, data requests silently 401'd and pages rendered empty.
export { api as apiClient } from '../api';
