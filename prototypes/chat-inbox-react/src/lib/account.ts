// Account settings, loaded from the DB. The server sets them in a script tag before the app script:
//   window.ACCOUNT = { intSmsFactor: 3 };
// intSmsFactor = how many SMS segments are billed as one message (1 = every segment is a message)
declare global {
  interface Window {
    ACCOUNT?: { intSmsFactor?: number | string };
  }
}

const account = window.ACCOUNT ?? { intSmsFactor: 3 }; // prototype sample value
export const SMS_FACTOR = Math.max(1, parseInt(String(account.intSmsFactor), 10) || 1);
