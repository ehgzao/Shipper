// Device fingerprinting and geolocation utilities

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  timezone: string;
  fingerprint: string;
}

export interface GeoLocation {
  ip?: string;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

// Generate a simple device fingerprint based on browser characteristics
export const generateDeviceFingerprint = (): string => {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.cookieEnabled,
  ];
  
  // Simple hash function
  const hash = components.join('|');
  let hashCode = 0;
  for (let i = 0; i < hash.length; i++) {
    const char = hash.charCodeAt(i);
    hashCode = ((hashCode << 5) - hashCode) + char;
    hashCode = hashCode & hashCode; // Convert to 32bit integer
  }
  return Math.abs(hashCode).toString(16);
};

// Get device information
export const getDeviceInfo = (): DeviceInfo => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    fingerprint: generateDeviceFingerprint(),
  };
};

// Parse user agent to get a readable device description
export const parseUserAgent = (userAgent: string): string => {
  // Detect browser
  let browser = 'Unknown Browser';
  if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browser = 'Opera';
  }

  // Detect OS
  let os = 'Unknown OS';
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  }

  // Detect device type
  let deviceType = 'Desktop';
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
    deviceType = 'Mobile';
  } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
    deviceType = 'Tablet';
  }

  return `${browser} on ${os} (${deviceType})`;
};

// Fetch IP geolocation using multiple fallback services
export const fetchGeoLocation = async (): Promise<GeoLocation> => {
  // Try multiple services with fallback
  const services = [
    {
      url: 'https://api.ipify.org?format=json',
      parse: (data: unknown) => ({ ip: (data as { ip?: string }).ip })
    },
    {
      url: 'https://ipapi.co/json/',
      parse: (data: unknown) => ({
        ip: (data as { ip?: string }).ip,
        country: (data as { country_name?: string }).country_name,
        city: (data as { city?: string }).city,
        latitude: (data as { latitude?: number }).latitude,
        longitude: (data as { longitude?: number }).longitude,
      })
    },
    {
      url: 'https://api.db-ip.com/v2/free/self',
      parse: (data: unknown) => ({
        ip: (data as { ipAddress?: string }).ipAddress,
        country: (data as { countryName?: string }).countryName,
        city: (data as { city?: string }).city,
      })
    }
  ];

  for (const service of services) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(service.url, { 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const result = service.parse(data);
        if (result.ip) {
          return result;
        }
      }
    } catch (e) {
      // Try next service
      continue;
    }
  }
  
  return { ip: 'unknown' };
};

// Get full device and location context for login attempts
export const getLoginContext = async (): Promise<{
  deviceInfo: DeviceInfo;
  geoLocation: GeoLocation;
  readableDevice: string;
}> => {
  const deviceInfo = getDeviceInfo();
  const geoLocation = await fetchGeoLocation();
  const readableDevice = parseUserAgent(deviceInfo.userAgent);
  
  return {
    deviceInfo,
    geoLocation,
    readableDevice,
  };
};

// Check if this is a new device based on stored fingerprints
export const isNewDevice = (fingerprint: string): boolean => {
  const storedFingerprints = localStorage.getItem('known_devices');
  if (!storedFingerprints) {
    return true;
  }
  
  const fingerprints: string[] = JSON.parse(storedFingerprints);
  return !fingerprints.includes(fingerprint);
};

// Store device fingerprint after successful login
export const storeDeviceFingerprint = (fingerprint: string): void => {
  const storedFingerprints = localStorage.getItem('known_devices');
  let fingerprints: string[] = storedFingerprints ? JSON.parse(storedFingerprints) : [];
  
  if (!fingerprints.includes(fingerprint)) {
    fingerprints.push(fingerprint);
    // Keep only last 10 devices
    if (fingerprints.length > 10) {
      fingerprints = fingerprints.slice(-10);
    }
    localStorage.setItem('known_devices', JSON.stringify(fingerprints));
  }
};
