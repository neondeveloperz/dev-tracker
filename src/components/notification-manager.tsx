"use client";

import { useEffect, useRef } from "react";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { usePathname } from "next/navigation";

// This component handles background logic like break reminders
export function NotificationManager() {
  const lastCheck = useRef<number>(Date.now());
  const checkInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const setupNotifications = async () => {
      let permission = await isPermissionGranted();
      if (!permission) {
        const permissionResponse = await requestPermission();
        permission = permissionResponse === 'granted';
      }

      if (permission) {
        // Check every 5 minutes if we reached 1 hour of focus
        checkInterval.current = setInterval(async () => {
          const now = Date.now();
          const elapsed = now - lastCheck.current;

          // 1 hour = 3600000ms
          if (elapsed >= 3600000) {
            sendNotification({
              title: "Time for a Break! ☕️",
              body: "You've been focused for an hour. Stretch and grab some water.",
              icon: 'icon'
            });
            lastCheck.current = now;
          }
        }, 300000); // Check every 5 mins
      }
    };

    setupNotifications();

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  }, []);

  return null; // Side-effect only component
}
