/** Backend のオリジン。未設定時はローカル API。 */
const configuredBaseUrl = import.meta.env?.VITE_API_BASE_URL;
export const apiBaseUrl = configuredBaseUrl ?? "http://localhost:8080";
