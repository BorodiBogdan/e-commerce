import React, { useEffect, useState } from "react";
import OfflineService from "../services/offlineService";

const StatusIndicator: React.FC = () => {
  const [status, setStatus] = useState({
    isOffline: false,
    isServerAvailable: true,
  });

  useEffect(() => {
    const offlineService = OfflineService.getInstance();

    const checkStatus = async () => {
      setStatus(offlineService.getStatus());
    };

    // Initial check
    checkStatus();

    // Set up interval for server status check
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds

    // Set up event listeners for network status
    window.addEventListener("online", checkStatus);
    window.addEventListener("offline", checkStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", checkStatus);
      window.removeEventListener("offline", checkStatus);
    };
  }, []);

  if (!status.isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 p-4 bg-yellow-500 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          {status.isOffline && (
            <span className="mr-4">🌐 Network Connection Lost</span>
          )}
          {!status.isServerAvailable && <span>🔌 Server Unavailable</span>}
        </div>
        <div>
          Working in offline mode. Changes will sync when connection is
          restored.
        </div>
      </div>
    </div>
  );
};

export default StatusIndicator;
