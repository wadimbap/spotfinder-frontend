import axios from "axios";
import { Fragment, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { ensureSession, SessionChangedError } from "./sessionManager";
import { AUTH_CHANGED_EVENT, tokenStorage } from "./tokenStorage";

interface RequireAuthProps {
    children: ReactNode;
}

type GateState =
    | { status: "loading" }
    | { status: "ready"; epoch: string }
    | { status: "anonymous" }
    | { status: "error" };

export function RequireAuth({ children }: RequireAuthProps) {
    const [state, setState] = useState<GateState>({ status: "loading" });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        let observedEpoch = tokenStorage.getSnapshot().epoch;
        const expectedEpoch = observedEpoch;

        function handleChange() {
            const current = tokenStorage.getSnapshot();
            if (current.epoch === observedEpoch) return;
            observedEpoch = current.epoch;
            if (!active) return;

            setState(current.token
                ? { status: "ready", epoch: current.epoch }
                : { status: "anonymous" });
        }

        async function restore() {
            try {
                await ensureSession();
                if (!active) return;

                const current = tokenStorage.getSnapshot();
                setState(current.token
                    ? { status: "ready", epoch: current.epoch }
                    : { status: "anonymous" });
            } catch (error) {
                if (!active || error instanceof SessionChangedError) return;
                if (tokenStorage.getSnapshot().epoch !== expectedEpoch) return;

                setState(axios.isAxiosError(error) && error.response?.status === 401
                    ? { status: "anonymous" }
                    : { status: "error" });
            }
        }

        window.addEventListener(AUTH_CHANGED_EVENT, handleChange);
        window.addEventListener("storage", handleChange);
        void restore();

        return () => {
            active = false;
            window.removeEventListener(AUTH_CHANGED_EVENT, handleChange);
            window.removeEventListener("storage", handleChange);
        };
    }, [attempt]);

    if (state.status === "loading") {
        return <div className="page">Restoring your session...</div>;
    }

    if (state.status === "anonymous") {
        return <Navigate to="/login" replace />;
    }

    if (state.status === "error") {
        return (
            <div className="page" role="alert">
                <p>Could not restore your session. Check your connection.</p>
                <button type="button" className="secondary-button" onClick={() => {
                    setState({ status: "loading" });
                    setAttempt((value) => value + 1);
                }}>
                    Retry
                </button>
            </div>
        );
    }

    return <Fragment key={state.epoch}>{children}</Fragment>;
}
