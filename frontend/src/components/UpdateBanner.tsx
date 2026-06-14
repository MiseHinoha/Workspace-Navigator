import { useEffect, useMemo, useState } from 'react';
import { currentAppVersion, AppVersionInfo } from '../config/appVersion';
import { versionApi } from '../utils/api';

const DISMISSED_BUILD_STORAGE_KEY = 'dismissed_update_build_id';
const VERSION_POLL_INTERVAL_MS = 60 * 1000;

function hasAvailableUpdate(latestVersion: AppVersionInfo | null) {
  if (!latestVersion) return false;
  return (
    latestVersion.version !== currentAppVersion.version ||
    latestVersion.buildId !== currentAppVersion.buildId
  );
}

export function UpdateBanner() {
  const [latestVersion, setLatestVersion] = useState<AppVersionInfo | null>(null);
  const [dismissedBuildId, setDismissedBuildId] = useState<string | null>(() =>
    localStorage.getItem(DISMISSED_BUILD_STORAGE_KEY)
  );

  useEffect(() => {
    let mounted = true;

    const checkForUpdates = async () => {
      try {
        const { data } = await versionApi.getCurrent();
        if (!mounted) return;
        setLatestVersion(data);
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    checkForUpdates();
    const timer = window.setInterval(checkForUpdates, VERSION_POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const shouldShow = useMemo(() => {
    if (!hasAvailableUpdate(latestVersion)) return false;
    return latestVersion!.buildId !== dismissedBuildId;
  }, [latestVersion, dismissedBuildId]);

  if (!shouldShow || !latestVersion) {
    return null;
  }

  const title =
    latestVersion.version !== currentAppVersion.version
      ? `${currentAppVersion.appName} (v${currentAppVersion.version} -> v${latestVersion.version})：发现新版本可用`
      : `${currentAppVersion.appName} (v${currentAppVersion.version} -> 新构建)：发现可用更新`;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_BUILD_STORAGE_KEY, latestVersion.buildId);
    setDismissedBuildId(latestVersion.buildId);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="fixed left-1/2 top-3 z-[100] w-[min(980px,calc(100vw-1.25rem))] -translate-x-1/2 animate-fadeIn">
      <div className="rounded-xl border border-blue-300/50 bg-white/95 px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur dark:border-blue-700/60 dark:bg-gray-800/95">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{title}</p>
            {latestVersion.releaseNotesUrl && (
              <a
                href={latestVersion.releaseNotesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm text-blue-600 underline decoration-blue-300/70 underline-offset-4 transition-colors hover:text-blue-700 dark:text-blue-300 dark:decoration-blue-500/70 dark:hover:text-blue-200"
              >
                查看这次更新内容
              </a>
            )}
          </div>

          <div className="flex items-center gap-3 md:flex-shrink-0">
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              稍后
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-lg border border-blue-600 bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              立即更新
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
