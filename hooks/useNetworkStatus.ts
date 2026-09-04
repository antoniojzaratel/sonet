import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/** True when the device is online. Starts optimistic (true) until the first event arrives. */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return () => unsubscribe();
  }, []);

  return isOnline;
}
