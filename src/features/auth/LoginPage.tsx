import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
        <div style={{ padding: 24 }}>
            <h1>Login</h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </div>

                <div style={{ marginTop: 12 }}>
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </div>

                {errorMessage && (
                    <p style={{ color: "red" }}>{errorMessage}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    style={{ marginTop: 16 }}
                >
                    {loading ? "Loading..." : "Login"}
                </button>
            </form>
        </div>
    );
}