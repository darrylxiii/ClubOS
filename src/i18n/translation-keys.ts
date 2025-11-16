/**
 * TypeScript-safe translation keys
 * Provides autocomplete and compile-time checking for translation keys
 * 
 * Usage:
 * import { TranslationKeys } from '@/i18n/translation-keys';
 * const { t } = useTranslation();
 * t(TranslationKeys.common.actions.save); // ✅ Autocomplete & type-safe
 */

export const TranslationKeys = {
  common: {
    navigation: {
      home: 'common:navigation.home',
      jobs: 'common:navigation.jobs',
      messages: 'common:navigation.messages',
      applications: 'common:navigation.applications',
      profile: 'common:navigation.profile',
      settings: 'common:navigation.settings',
      admin: 'common:navigation.admin',
      clubhome: 'common:navigation.clubhome',
      academy: 'common:navigation.academy',
      quantum_meetings: 'common:navigation.quantum_meetings',
      analytics: 'common:navigation.analytics',
      hiring_intelligence: 'common:navigation.hiring_intelligence',
    },
    actions: {
      save: 'common:actions.save',
      cancel: 'common:actions.cancel',
      delete: 'common:actions.delete',
      edit: 'common:actions.edit',
      apply: 'common:actions.apply',
      submit: 'common:actions.submit',
      continue: 'common:actions.continue',
      back: 'common:actions.back',
      next: 'common:actions.next',
      loading: 'common:actions.loading',
      search: 'common:actions.search',
      filter: 'common:actions.filter',
      download: 'common:actions.download',
      upload: 'common:actions.upload',
      view: 'common:actions.view',
      close: 'common:actions.close',
      confirm: 'common:actions.confirm',
      resend: 'common:actions.resend',
      verify: 'common:actions.verify',
    },
    status: {
      pending: 'common:status.pending',
      approved: 'common:status.approved',
      declined: 'common:status.declined',
      active: 'common:status.active',
      archived: 'common:status.archived',
      completed: 'common:status.completed',
      in_progress: 'common:status.in_progress',
    },
    time: {
      today: 'common:time.today',
      yesterday: 'common:time.yesterday',
      lastWeek: 'common:time.lastWeek',
      lastMonth: 'common:time.lastMonth',
      daysAgo: 'common:time.daysAgo',
      hoursAgo: 'common:time.hoursAgo',
      minutesAgo: 'common:time.minutesAgo',
    },
    empty: {
      noResults: 'common:empty.noResults',
      noData: 'common:empty.noData',
      tryAgain: 'common:empty.tryAgain',
    },
    validation: {
      required: 'common:validation.required',
      invalidEmail: 'common:validation.invalidEmail',
      invalidPhone: 'common:validation.invalidPhone',
      passwordTooShort: 'common:validation.passwordTooShort',
      passwordMismatch: 'common:validation.passwordMismatch',
    },
    notifications: {
      success: 'common:notifications.success',
      error: 'common:notifications.error',
      info: 'common:notifications.info',
      warning: 'common:notifications.warning',
    },
  },
  auth: {
    login: {
      title: 'auth:login.title',
      subtitle: 'auth:login.subtitle',
      email: 'auth:login.email',
      password: 'auth:login.password',
      submit: 'auth:login.submit',
      forgotPassword: 'auth:login.forgotPassword',
      noAccount: 'auth:login.noAccount',
      signUp: 'auth:login.signUp',
    },
    signup: {
      title: 'auth:signup.title',
      subtitle: 'auth:signup.subtitle',
      fullName: 'auth:signup.fullName',
      email: 'auth:signup.email',
      password: 'auth:signup.password',
      confirmPassword: 'auth:signup.confirmPassword',
      submit: 'auth:signup.submit',
      haveAccount: 'auth:signup.haveAccount',
      signIn: 'auth:signup.signIn',
    },
  },
  onboarding: {
    welcome: {
      title: 'onboarding:welcome.title',
      subtitle: 'onboarding:welcome.subtitle',
    },
  },
} as const;

// Type helper for autocomplete
export type TranslationKey = typeof TranslationKeys[keyof typeof TranslationKeys];
