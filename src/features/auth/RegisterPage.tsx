import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
        <div className="auth-page">
            <div className="auth-card">
                <h1>Create account</h1>

                <form onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="user@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="name">Name</label>
                        <input
                            id="name"
                            type="text"
                            placeholder="Your name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
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

                    <div className="form-field">
                        <label htmlFor="passwordConfirmation">Password confirmation</label>
                        <input
                            id="passwordConfirmation"
                            type="password"
                            placeholder="Repeat password"
                            value={passwordConfirmation}
                            onChange={(event) =>
                                setPasswordConfirmation(event.target.value)
                            }
                        />
                    </div>

                    {errorMessage && <p className="error-message">{errorMessage}</p>}

                    <button className="primary-button" type="submit" disabled={loading}>
                        {loading ? "Loading..." : "Register"}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/login">Login</Link>
                </p>
            </div>
        </div>
    );
}