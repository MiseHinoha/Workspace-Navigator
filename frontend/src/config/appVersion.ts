export interface AppVersionInfo {
  appName: string;
  version: string;
  buildId: string;
  releaseNotesUrl?: string;
}

export const currentAppVersion: AppVersionInfo = {
  appName: __APP_NAME__,
  version: __APP_VERSION__,
  buildId: __APP_BUILD_ID__,
  releaseNotesUrl: __APP_RELEASE_NOTES_URL__ || undefined,
};
