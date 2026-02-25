import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logger } from '@/lib/logger';

export const NavigationLogger = () => {
    const location = useLocation();

    useEffect(() => {
        logger.info(`[Navigation] Navigated to ${location.pathname}${location.search}`);
    }, [location]);

    return null;
};
