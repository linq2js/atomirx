import { default as React } from 'react';
import { render, renderHook, RenderHookOptions } from '@testing-library/react';
export declare const wrappers: {
    mode: "normal" | "strict";
    Wrapper: React.FC<{
        children: React.ReactNode;
    }>;
    render: (ui: React.ReactElement) => ReturnType<typeof render>;
    renderHook: <TResult, TProps>(render: (props: TProps) => TResult, options?: RenderHookOptions<TProps>) => ReturnType<typeof renderHook<TResult, TProps>>;
}[];
