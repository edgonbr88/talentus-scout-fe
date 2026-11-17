import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OAuthConfig {
  googleClientId: string;
  microsoftClientId: string;
}

export interface OAuthPublicConfigResponse {
  googleClientId: string;
  microsoftClientId: string;
  mockEnabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SocialAuthManagerService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly ngZone = inject(NgZone);

  private readonly GOOGLE_KEY = 'talentus_google_client_id';
  private readonly MICROSOFT_KEY = 'talentus_microsoft_client_id';
  private readonly PENDING_TOKEN_KEY = 'talentus_oauth_pending_token';
  private readonly PENDING_ERROR_KEY = 'talentus_oauth_pending_error';
  private readonly PENDING_PROVIDER_KEY = 'talentus_oauth_pending_provider';
  private readonly OAUTH_CHANNEL_NAME = 'talentus_oauth_channel';

  private runtimeGoogleClientId = '';
  private runtimeMicrosoftClientId = '';
  private configPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && this.http && (!environment.googleClientId || !environment.microsoftClientId)) {
      void this.ensureOAuthConfigLoaded();
    }
  }

  ensureOAuthConfigLoaded(): Promise<void> {
    if (typeof window === 'undefined' || !this.http) {
      return Promise.resolve();
    }
    if (this.configPromise) {
      return this.configPromise;
    }

    const endpoint = `${environment.apiBaseUrl}/auth/oauth-config`;
    this.configPromise = firstValueFrom(this.http.get<OAuthPublicConfigResponse>(endpoint))
      .then((res) => {
        this.runtimeGoogleClientId = (res?.googleClientId || '').trim();
        this.runtimeMicrosoftClientId = (res?.microsoftClientId || '').trim();
      })
      .catch(() => {
        // Silencioso: mantiene los valores de environment o localStorage si están disponibles
      });

    return this.configPromise;
  }

  getGoogleClientId(): string {
    if (typeof window === 'undefined') return '';
    if (environment.production) {
      return this.runtimeGoogleClientId || environment.googleClientId || '';
    }
    return localStorage.getItem(this.GOOGLE_KEY) || this.runtimeGoogleClientId || environment.googleClientId || '';
  }

  setGoogleClientId(id: string): void {
    if (typeof window === 'undefined' || environment.production) return;
    localStorage.setItem(this.GOOGLE_KEY, id.trim());
  }

  getMicrosoftClientId(): string {
    if (typeof window === 'undefined') return '';
    if (environment.production) {
      return this.runtimeMicrosoftClientId || environment.microsoftClientId || '';
    }
    return localStorage.getItem(this.MICROSOFT_KEY) || this.runtimeMicrosoftClientId || environment.microsoftClientId || '';
  }

  setMicrosoftClientId(id: string): void {
    if (typeof window === 'undefined' || environment.production) return;
    localStorage.setItem(this.MICROSOFT_KEY, id.trim());
  }

  hasGoogleClientId(): boolean {
    return !!this.getGoogleClientId();
  }

  hasMicrosoftClientId(): boolean {
    return !!this.getMicrosoftClientId();
  }

  /**
   * Verifica si la ventana actual fue abierta como popup de retorno OAuth2 (#id_token=... o ?error=...).
   * Transmite el resultado a la ventana principal (postMessage, BroadcastChannel y localStorage) y cierra el popup.
   */
  handleOAuthCallbackIfPresent(): boolean {
    if (typeof window === 'undefined') return false;

    const hash = window.location.hash ? window.location.hash.substring(1) : '';
    const search = window.location.search ? window.location.search.substring(1) : '';
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(search);

    const idToken =
      hashParams.get('id_token') ||
      hashParams.get('access_token') ||
      searchParams.get('id_token') ||
      searchParams.get('access_token');

    const oauthError = hashParams.get('error') || searchParams.get('error');
    const oauthErrorDesc =
      hashParams.get('error_description') || searchParams.get('error_description');

    if (!idToken && !oauthError) {
      return false;
    }

    const isPopupContext =
      !!window.opener ||
      (typeof window.name === 'string' && window.name.startsWith('talentus_')) ||
      this.hasPendingProviderFlag();

    if (oauthError) {
      const message =
        oauthErrorDesc ||
        (oauthError === 'access_denied'
          ? 'Acceso cancelado o denegado por el usuario.'
          : `Error de autenticación OAuth: ${oauthError}`);

      this.dispatchOAuthPayload({ type: 'TALENTUS_OAUTH_ERROR', error: message });
      this.clearCallbackUrlFragment();
      if (isPopupContext) {
        this.attemptClosePopup();
      }
      return true;
    }

    if (idToken) {
      this.dispatchOAuthPayload({ type: 'TALENTUS_OAUTH_TOKEN', token: idToken });
      this.clearCallbackUrlFragment();
      if (isPopupContext) {
        this.attemptClosePopup();
      }
      return true;
    }

    return false;
  }

  private hasPendingProviderFlag(): boolean {
    try {
      return !!localStorage.getItem(this.PENDING_PROVIDER_KEY);
    } catch {
      return false;
    }
  }

  private dispatchOAuthPayload(
    payload: { type: 'TALENTUS_OAUTH_TOKEN'; token: string } | { type: 'TALENTUS_OAUTH_ERROR'; error: string }
  ): void {
    // 1. Almacena en localStorage (dispara evento 'storage' en la ventana original y sirve de respaldo por sondeo)
    try {
      if (payload.type === 'TALENTUS_OAUTH_TOKEN') {
        localStorage.setItem(this.PENDING_TOKEN_KEY, payload.token);
        localStorage.setItem('talentus_oauth_token_time', Date.now().toString());
      } else {
        localStorage.setItem(this.PENDING_ERROR_KEY, payload.error);
      }
    } catch {
      // ignore
    }

    // 2. Notifica vía BroadcastChannel (funciona incluso si COOP rompe window.opener)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel(this.OAUTH_CHANNEL_NAME);
        channel.postMessage(payload);
        channel.close();
      } catch {
        // ignore
      }
    }

    // 3. Notifica directamente vía window.opener.postMessage si está disponible
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(payload, window.location.origin);
      } catch (e) {
        console.warn('No se pudo enviar mensaje por postMessage a opener:', e);
      }
    }
  }

  private clearCallbackUrlFragment(): void {
    try {
      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch {
      // ignore
    }
  }

  private attemptClosePopup(): void {
    try {
      window.close();
    } catch {
      // ignore
    }
  }

  /**
   * Inicia el flujo oficial con Google OAuth2 mediante Popup.
   */
  loginWithGoogle(): Promise<string> {
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      return Promise.reject(new Error('NO_CLIENT_ID_GOOGLE'));
    }

    const redirectUri = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/login`
      : 'http://localhost/auth/login';

    const nonce = Math.random().toString(36).substring(2, 15);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=id_token` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&nonce=${encodeURIComponent(nonce)}` +
      `&prompt=select_account`;

    return this.openOAuthPopup(authUrl, 'google');
  }

  /**
   * Inicia el flujo oficial con Microsoft OAuth2 / OpenID Connect mediante Popup.
   */
  loginWithMicrosoft(): Promise<string> {
    const clientId = this.getMicrosoftClientId();
    if (!clientId) {
      return Promise.reject(new Error('NO_CLIENT_ID_MICROSOFT'));
    }

    const redirectUri = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/login`
      : 'http://localhost/auth/login';

    const nonce = Math.random().toString(36).substring(2, 15);
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2/authorize?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=id_token` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&response_mode=fragment` +
      `&nonce=${encodeURIComponent(nonce)}` +
      `&prompt=select_account`;

    return this.openOAuthPopup(authUrl, 'microsoft');
  }

  private openOAuthPopup(url: string, provider: 'google' | 'microsoft'): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('El entorno no soporta interfaz gráfica en navegador.'));
        return;
      }

      // Limpia tokens y errores pendientes previos
      localStorage.removeItem(this.PENDING_TOKEN_KEY);
      localStorage.removeItem(this.PENDING_ERROR_KEY);
      localStorage.setItem(this.PENDING_PROVIDER_KEY, provider);

      const width = 520;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        `talentus_${provider}_login`,
        `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,menubar=0`
      );

      if (!popup) {
        localStorage.removeItem(this.PENDING_PROVIDER_KEY);
        reject(new Error('El navegador bloqueó la ventana emergente de autenticación. Permite ventanas emergentes para continuar.'));
        return;
      }

      let isFinished = false;
      let broadcastChannel: BroadcastChannel | null = null;
      let pollTimer: ReturnType<typeof setInterval> | null = null;
      let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        isFinished = true;
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }
        window.removeEventListener('message', messageListener);
        window.removeEventListener('storage', storageListener);
        if (broadcastChannel) {
          try { broadcastChannel.close(); } catch {}
          broadcastChannel = null;
        }
        localStorage.removeItem(this.PENDING_TOKEN_KEY);
        localStorage.removeItem(this.PENDING_ERROR_KEY);
        localStorage.removeItem(this.PENDING_PROVIDER_KEY);
      };

      const finishWithToken = (token: string) => {
        if (isFinished) return;
        cleanup();
        try { popup.close(); } catch {}
        this.ngZone.run(() => resolve(token));
      };

      const finishWithError = (errorMsg: string) => {
        if (isFinished) return;
        cleanup();
        try { popup.close(); } catch {}
        this.ngZone.run(() => reject(new Error(errorMsg)));
      };

      const handlePayload = (data: { type?: string; token?: string; error?: string } | null | undefined) => {
        if (!data || isFinished) return;
        if (data.type === 'TALENTUS_OAUTH_TOKEN' && data.token) {
          finishWithToken(data.token);
        } else if (data.type === 'TALENTUS_OAUTH_ERROR' && data.error) {
          finishWithError(data.error);
        }
      };

      // 1. Escuchar eventos postMessage desde window.opener
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        handlePayload(event.data);
      };
      window.addEventListener('message', messageListener);

      // 2. Escuchar eventos BroadcastChannel (resiliente frente a COOP)
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          broadcastChannel = new BroadcastChannel(this.OAUTH_CHANNEL_NAME);
          broadcastChannel.onmessage = (event: MessageEvent) => handlePayload(event.data);
        } catch {
          broadcastChannel = null;
        }
      }

      // 3. Escuchar evento storage para respuesta instantánea entre ventanas
      const storageListener = (event: StorageEvent) => {
        if (isFinished) return;
        if (event.key === this.PENDING_TOKEN_KEY && event.newValue) {
          finishWithToken(event.newValue);
        } else if (event.key === this.PENDING_ERROR_KEY && event.newValue) {
          finishWithError(event.newValue);
        }
      };
      window.addEventListener('storage', storageListener);

      // 4. Sondeo de fallback con localStorage y control de cierre de ventana
      pollTimer = setInterval(() => {
        if (isFinished) return;

        const storedToken = localStorage.getItem(this.PENDING_TOKEN_KEY);
        if (storedToken) {
          finishWithToken(storedToken);
          return;
        }

        const storedError = localStorage.getItem(this.PENDING_ERROR_KEY);
        if (storedError) {
          finishWithError(storedError);
          return;
        }

        // Si la ventana fue cerrada por el usuario o tras autenticarse
        if (popup.closed) {
          if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
          // Espera breve antes de limpiar localStorage por si el token se escribió milisegundos antes del cierre
          setTimeout(() => {
            if (isFinished) return;
            const lastCheckToken = localStorage.getItem(this.PENDING_TOKEN_KEY);
            const lastCheckError = localStorage.getItem(this.PENDING_ERROR_KEY);
            if (lastCheckToken) {
              finishWithToken(lastCheckToken);
            } else if (lastCheckError) {
              finishWithError(lastCheckError);
            } else {
              finishWithError(`Ventana de autenticación con ${provider === 'google' ? 'Google' : 'Microsoft'} cerrada sin completar el acceso.`);
            }
          }, 350);
        }
      }, 300);

      // Timeout de seguridad tras 5 minutos
      timeoutTimer = setTimeout(() => {
        if (!isFinished) {
          finishWithError('El tiempo de espera para la autenticación se agotó (timeout 5m).');
        }
      }, 300000);
    });
  }
}
