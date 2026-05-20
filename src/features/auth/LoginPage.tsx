import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { authApi } from "./authApi";
import { tokenStorage } from "../../shared/auth/tokenStorage";

export function LoginPage() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            setLoading(true);
            setErrorMessage("");

            const response = await authApi.login({
                email,
                password,
            });

            tokenStorage.setAccessToken(response.accessToken);
            navigate("/profile");
        } catch (error) {
            console.error(error);
            setErrorMessage("Login failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>Login</h1>

                <form onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="admin@spotfinder.local"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </div>

                    {errorMessage && <p className="error-message">{errorMessage}</p>}

                    <button className="primary-button" type="submit" disabled={loading}>
                        {loading ? "Loading..." : "Login"}
                    </button>
                </form>

                <p className="auth-footer">
                    No account? <Link to="/register">Create one</Link>
                </p>
            </div>
        </div>
    );
}