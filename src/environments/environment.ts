export const environment = {
  production: false,
  apiBaseUrl: '/api/v1',
  backendOrigin: 'http://localhost:8080',
  googleClientId: '994142432241-0sfgr4u4i8ctqd3osv2kuc8m2megokjn.apps.googleusercontent.com',
  microsoftClientId: '',
  microsoftRedirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/login` : 'http://localhost/auth/login'
};
