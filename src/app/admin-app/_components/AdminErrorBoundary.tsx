'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * AdminErrorBoundary
 * Prevents a single component failure from crashing the entire application.
 * Best used to wrap major sections of the Admin App.
 */
export default class AdminErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`[ErrorBoundary:${this.props.name || 'Admin'}] Uncaught error:`, error, errorInfo);

        // You could send this to your performanceMonitor or an external service like Sentry
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="admin-app-error-boundary p-6 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    <h2 className="text-xl font-bold mb-2">Đã có lỗi xảy ra ở phần &quot;{this.props.name || 'Giao diện'}&quot;</h2>
                    <p className="mb-4">Hệ thống không thể hiển thị nội dung này. Vui lòng thử tải lại trang hoặc liên hệ kỹ thuật.</p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                    >
                        Thử lại
                    </button>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <pre className="mt-4 p-4 bg-gray-900 text-gray-100 rounded overflow-auto text-xs max-h-40">
                            {this.state.error.stack}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
