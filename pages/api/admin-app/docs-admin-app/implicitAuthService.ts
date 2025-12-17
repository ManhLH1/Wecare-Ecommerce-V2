/**
 * Implicit OAuth 2.0 Flow Authentication Service
 * Sử dụng Dynamics CRM public client ID để lấy access token
 * Không cần Azure App Registration hay Redirect URI
 */

/**
 * Convert base64url to base64 (JWT tokens use base64url encoding)
 * Base64url: uses '-' and '_' instead of '+' and '/'
 * Base64url: no padding '='
 */
const base64UrlToBase64 = (base64url: string): string => {
  // Replace base64url characters with base64 characters
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  const padding = base64.length % 4;
  if (padding > 0) {
    base64 += '='.repeat(4 - padding);
  }

  return base64;
};

/**
 * Decode base64/base64url string với hỗ trợ UTF-8 (tiếng Việt)
 * atob() chỉ hỗ trợ Latin1, không decode đúng Unicode
 * Hỗ trợ cả base64 và base64url (JWT tokens)
 */
export const decodeBase64Unicode = (str: string): string => {
  try {
    // Convert base64url to base64 if needed (for JWT tokens)
    const base64Str = base64UrlToBase64(str);

    // Modern browsers: sử dụng TextDecoder
    if (typeof TextDecoder !== 'undefined') {
      const binaryString = atob(base64Str);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    }

    // Fallback: decode URI component
    const binaryString = atob(base64Str);
    const percentEncodedStr = binaryString.split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join('');
    return decodeURIComponent(percentEncodedStr);
  } catch (error) {
    console.error('❌ Lỗi decode base64:', error);
    console.error('❌ Input string:', str);
    throw new Error('Không thể decode JWT token. Token có thể bị hỏng hoặc không hợp lệ.');
  }
};

const DYNAMICS_RESOURCE = 'https://wecare-ii.crm5.dynamics.com/';
console.log('🔒 window.location.origin', window.location.origin);
const CLIENT_ID = window.location.origin === 'https://supplier-invoice-matching-tool-573735243623.us-west1.run.app'
  ? '6fba5a54-1729-4c41-b444-8992ae22c909' // Public Client ID
  : '51f81489-12ee-4a9e-aaae-a2591f45987d'; // Dataverse REST Builder Client ID
const REDIRECT_URI = window.location.origin; // Use current domain as redirect URI
const TOKEN_STORAGE_KEY = 'dynamics_access_token';
const TOKEN_EXPIRY_KEY = 'dynamics_token_expiry';
const USER_INFO_KEY = 'dynamics_user_info';

export interface UserInfo {
  name?: string;
  username: string;
  email?: string;
}

export interface AuthResult {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  user: UserInfo;
}

/**
 * Parse token từ URL fragment (#access_token=...&expires_in=...)
 */
const parseTokenFromUrl = (url: string): AuthResult | null => {
  try {
    const fragment = url.split('#')[1];
    if (!fragment) return null;

    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');

    if (!accessToken || !expiresIn) return null;

    // Decode JWT để lấy user info (payload là base64 UTF-8)
    const payload = JSON.parse(decodeBase64Unicode(accessToken.split('.')[1]));

    const user: UserInfo = {
      username: payload.upn || payload.unique_name || payload.email || 'Unknown',
      name: payload.name,
      email: payload.upn || payload.email,
    };

    return {
      accessToken,
      expiresIn: parseInt(expiresIn, 10),
      tokenType: params.get('token_type') || 'Bearer',
      user,
    };
  } catch (error) {
    console.error('❌ Lỗi parse token từ URL:', error);
    return null;
  }
};

/**
 * Kiểm tra token có còn hợp lệ không
 */
export const isTokenValid = (): boolean => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token || !expiry) return false;

  // Check nếu token còn hơn 5 phút (buffer)
  const expiryTime = parseInt(expiry, 10);
  const now = Date.now();
  return now < expiryTime - 5 * 60 * 1000;
};

/**
 * Lấy access token từ storage
 */
export const getStoredToken = (): string | null => {
  if (!isTokenValid()) {
    clearToken();
    return null;
  }
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

/**
 * Lấy user info từ storage
 */
export const getStoredUser = (): UserInfo | null => {
  const userStr = localStorage.getItem(USER_INFO_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * Lưu token và user info vào storage
 */
const saveToken = (result: AuthResult) => {
  const expiryTime = Date.now() + result.expiresIn * 1000;
  localStorage.setItem(TOKEN_STORAGE_KEY, result.accessToken);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(result.user));
};

/**
 * Lưu token thủ công (dùng cho development/testing)
 * Parse JWT để lấy user info và expiry
 */
export const saveTokenManually = (accessToken: string): AuthResult => {
  try {
    // Decode JWT để lấy user info và expiry (hỗ trợ UTF-8)
    const payload = JSON.parse(decodeBase64Unicode(accessToken.split('.')[1]));

    const user: UserInfo = {
      username: payload.upn || payload.unique_name || payload.email || 'Manual Token User',
      name: payload.name,
      email: payload.upn || payload.email,
    };

    // JWT exp là timestamp tính bằng seconds
    const expiryTimestamp = payload.exp ? payload.exp * 1000 : Date.now() + 3600 * 1000; // Default 1h nếu không có exp
    const expiresIn = Math.floor((expiryTimestamp - Date.now()) / 1000);

    const result: AuthResult = {
      accessToken,
      expiresIn,
      tokenType: 'Bearer',
      user,
    };

    saveToken(result);
    return result;
  } catch (error) {
    console.error('❌ Lỗi parse token:', error);
    throw new Error('Token không hợp lệ hoặc không đúng định dạng JWT');
  }
};

/**
 * Xóa token và user info khỏi storage
 */
export const clearToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(USER_INFO_KEY);
};

/**
 * Xây dựng OAuth authorization URL
 */
const buildAuthUrl = (): string => {
  const params = new URLSearchParams({
    resource: DYNAMICS_RESOURCE,
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    prompt: 'select_account',
  });

  return `https://login.microsoftonline.com/common/oauth2/authorize?${params.toString()}`;
};

/**
 * Mở popup và đợi callback với token
 */
export const loginWithPopup = (): Promise<AuthResult> => {
  return new Promise((resolve, reject) => {
    const authUrl = buildAuthUrl();

    // Mở popup với kích thước phù hợp
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'Microsoft Login',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no`
    );

    if (!popup) {
      reject(new Error('Không thể mở popup. Vui lòng cho phép popup trong browser.'));
      return;
    }

    let resolved = false;

    // Listen for message from popup
    const messageHandler = (event: MessageEvent) => {
      // Security: Verify origin matches our app
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'OAUTH_TOKEN_RECEIVED') {
        if (resolved) return; // Already resolved
        resolved = true;

        clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);

        const result = event.data.result;
        if (result) {
          saveToken(result);
          resolve(result);
        } else {
          reject(new Error('Không thể parse token từ callback URL.'));
        }
      } else if (event.data.type === 'OAUTH_VALIDATION_FAILED') {
        if (resolved) return; // Already resolved
        resolved = true;

        clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        reject(new Error(event.data.error || 'Xác thực tài khoản thất bại.'));
      } else if (event.data.type === 'OAUTH_POPUP_CLOSED') {
        if (resolved) return; // Already resolved
        resolved = true;

        clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        reject(new Error('Popup đã bị đóng trước khi hoàn tất đăng nhập.'));
      }
    };

    window.addEventListener('message', messageHandler);

    // Timeout sau 5 phút
    const timeoutId = setTimeout(() => {
      if (resolved) return;
      resolved = true;

      window.removeEventListener('message', messageHandler);
      try {
        popup.close();
      } catch (e) {
        // Ignore if can't close due to COOP
      }
      reject(new Error('Login timeout sau 5 phút.'));
    }, 5 * 60 * 1000);
  });
};

/**
 * Logout - xóa token khỏi storage
 */
export const logout = () => {
  clearToken();
};

/**
 * Lấy token - trả về token hiện tại hoặc yêu cầu login lại
 */
export const getToken = async (): Promise<string> => {
  const storedToken = getStoredToken();
  if (storedToken) {
    return storedToken;
  }

  // Token expired hoặc chưa có - yêu cầu login lại
  const result = await loginWithPopup();
  return result.accessToken;
};
