const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const missingLzies = `
const PartnerWelcome = lazy(() => import('./pages/PartnerWelcome'));
const PartnerSetup = lazy(() => import('./pages/PartnerSetup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPasswordVerify = lazy(() => import('./pages/ResetPasswordVerify'));
const ResetPasswordMagicLink = lazy(() => import('./pages/ResetPasswordMagicLink'));
const ResetPasswordNew = lazy(() => import('./pages/ResetPasswordNew'));
const ResetPasswordSuccess = lazy(() => import('./pages/ResetPasswordSuccess'));
const MfaSetup = lazy(() => import('./pages/MfaSetup'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
`;

app = app.replace(
  /\/\/ Lazy load ALL other routes/,
  missingLzies + '\n// Lazy load ALL other routes'
);

fs.writeFileSync('src/App.tsx', app);
