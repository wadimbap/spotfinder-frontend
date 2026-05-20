import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { authApi } from "./authApi";
import { tokenStorage } from "../../shared/auth/tokenStorage";

export function RegisterPage() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [name, setName] = useState("");

    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            setLoading(true);
            setErrorMessage("");

            const response = await authApi.register({
                email,
                name,
                password,
                passwordConfirmation,
            });

            tokenStorage.setAccessToken(response.accessToken);

            navigate("/profile");
        } catch (error) {
            console.error(error);
            setErrorMessage("Registration failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ padding: 24 }}>
            <h1>Register</h1>

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
                        type="text"
                        placeholder="Name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
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

                <div style={{ marginTop: 12 }}>
                    <input
                        type="password"
                        placeholder="Password confirmation"
                        value={passwordConfirmation}
                        onChange={(event) =>
                            setPasswordConfirmation(event.target.value)
                        }
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
                    {loading ? "Loading..." : "Register"}
                </button>
            </form>
        </div>
    );
}