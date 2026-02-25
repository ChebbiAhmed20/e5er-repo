import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('Uncaught React Error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-900">
                    <div className="max-w-md p-8 bg-white rounded-lg shadow-lg">
                        <h1 className="text-2xl font-bold mb-4 text-red-600">Une erreur est survenue</h1>
                        <p className="mb-4">
                            Une erreur inattendue s'est produite. Notre equipe a ete informee.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                            Recharger l'application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
