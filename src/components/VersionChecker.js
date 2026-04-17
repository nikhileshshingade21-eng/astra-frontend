import React from 'react';
import useAppUpdate from '../hooks/useAppUpdate';
import UpdateModal from './UpdateModal';

/**
 * ─────────────────────────────────────────────────────────────
 *  ASTRA VersionChecker — Drop-in Auto-Update Controller
 * ─────────────────────────────────────────────────────────────
 *  This is a silent background component that:
 *    1. Checks for updates on mount (with 3s delay)
 *    2. Periodically re-checks every 6 hours
 *    3. Shows a premium update modal when an update is found
 *    4. Handles the full download → install lifecycle
 *
 *  Usage:
 *    Just drop <VersionChecker /> anywhere in your app tree.
 *    It's already in App.js — no extra setup needed.
 * ─────────────────────────────────────────────────────────────
 */
const VersionChecker = () => {
    const update = useAppUpdate();

    return (
        <UpdateModal
            visible={update.showModal}
            updateInfo={update.updateInfo}
            downloading={update.downloading}
            progress={update.downloadProgress}
            downloadComplete={update.downloadComplete}
            installing={update.installing}
            error={update.error}
            onUpdate={update.startDownload}
            onDismiss={update.dismissUpdate}
            currentVersion={update.currentVersionName}
        />
    );
};

export default VersionChecker;
