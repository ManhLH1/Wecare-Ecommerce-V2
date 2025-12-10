import crypto from "crypto";

const encryptData = (data: any): string => {
  const jsonString = JSON.stringify(data);
  // Sử dụng Buffer để mã hóa chuỗi UTF-8 thành Base64
  return Buffer.from(jsonString, "utf8").toString("base64");
};

const decryptData = (encryptedData: string): any => {
  try {
    // Sử dụng Buffer để giải mã Base64 thành chuỗi UTF-8
    const jsonString = Buffer.from(encryptedData, "base64").toString("utf8");
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Decryption failed - decryptData - line 15: ", error);
    return null;
  }
};

const createHash = (data: any): string => {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
};

const isBrowser = (): boolean => typeof window !== "undefined" && typeof localStorage !== "undefined";

export const setItem = (key: string, data: any): void => {
  if (!isBrowser()) return; // SSR-safe no-op
  try {
    const hash = createHash(data);
    const encryptedData = encryptData({ data, hash });
    localStorage.setItem(key, encryptedData);
  } catch (error) {
    // Swallow storage errors (e.g., quota or private mode)
    console.warn("SecureStorage.setItem failed:", error);
  }
};

export const getItem = (key: string): any => {
  if (!isBrowser()) return null; // SSR-safe fallback
  try {
    const encryptedData = localStorage.getItem(key);
    if (!encryptedData) return null;

    const decrypted = decryptData(encryptedData);
    if (!decrypted || !decrypted.data || !decrypted.hash) return null;

    if (createHash(decrypted.data) !== decrypted.hash) {
      console.error("Data integrity check failed - getItem - line 38: ");
      return null;
    }

    return decrypted.data;
  } catch (error) {
    console.warn("SecureStorage.getItem failed:", error);
    return null;
  }
};

export const removeItem = (key: string): void => {
  if (!isBrowser()) return; // SSR-safe no-op
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("SecureStorage.removeItem failed:", error);
  }
};

export const clear = (): void => {
  if (!isBrowser()) return; // SSR-safe no-op
  try {
    localStorage.clear();
  } catch (error) {
    console.warn("SecureStorage.clear failed:", error);
  }
};
