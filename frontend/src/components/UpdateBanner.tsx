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
      <div className="rounded-2xl border border-violet-300/50 bg-[#2f2b3fd9] px-5 py-4 shadow-[0_18px_40px_rgba(18,12,35,0.35)] backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-violet-100">{title}</p>
            {latestVersion.releaseNotesUrl && (
              <a
                href={latestVersion.releaseNotesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm text-violet-200 underline decoration-violet-300/60 underline-offset-4 transition-colors hover:text-white"
              >
                查看这次更新内容
              </a>
            )}
          </div>

          <div className="flex items-center gap-3 md:flex-shrink-0">
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-xl border border-violet-300/45 px-5 py-2 text-sm font-semibold text-violet-100 transition-colors hover:bg-white/8"
            >
              稍后
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-xl border border-violet-200 bg-violet-500/12 px-5 py-2 text-sm font-semibold text-violet-50 transition-colors hover:bg-violet-500/20"
            >
              立即更新
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
