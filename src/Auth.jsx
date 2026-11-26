import { useState, useEffect } from "react";
import App from "./App.jsx";
import "./Auth.css";

const API = import.meta.env.DEV
    ? "http://localhost:5000/api/auth"
    : "/api/auth";

export default function Auth() {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [user, setUser] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [showFacts, setShowFacts] = useState(false);

    const [savedName, setSavedName] = useState(
        localStorage.getItem("username") || ""
    );

    useEffect(() => {
        fetch(`${API}/me`, {
            credentials: "include"
        })
            .then(async (res) => {
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                }
            })
            .catch(() => {
                setError("Не вдалося підключитися до сервера");
            })
            .finally(() => setChecking(false));
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();

        setError("");
        setMessage("");
        setLoading(true);

        try {
            const endpoint = isRegister
                ? "register"
                : "login";

            const body = isRegister
                ? { username, email, password }
                : { email, password };

            const res = await fetch(`${API}/${endpoint}`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error);
            }

            if (data.user) {
                localStorage.setItem(
                    "username",
                    data.user.username
                );

                setSavedName(data.user.username);
            }

            setMessage(data.message);
            setPassword("");

            if (isRegister) {
                setIsRegister(false);
            } else {
                setUser(data.user);
            }

        } catch (error) {
            setError(error.message || "Помилка сервера");

        } finally {
            setLoading(false);
        }
    }

    async function logout() {
        try {
            const res = await fetch(`${API}/logout`, {
                method: "POST",
                credentials: "include"
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error);
            }

            setUser(null);
            setShowFacts(false);
            setPassword("");
            setError("");
            setMessage(data.message);

        } catch (error) {
            setError(error.message);
        }
    }

    function switchForm() {
        setIsRegister(!isRegister);
        setMessage("");
        setError("");
        setPassword("");
    }

    if (checking) {
        return (
            <div className="auth-page">
                <p>Завантаження...</p>
            </div>
        );
    }

    if (user && showFacts) {
        return (
            <>
                <div className="cloud-toolbar">
                    <button onClick={() => setShowFacts(false)}>
                        Мій профіль
                    </button>

                    <button onClick={logout}>
                        Вийти
                    </button>
                </div>

                {error && (
                    <div className="auth-error">{error}</div>
                )}

                <App />
            </>
        );
    }

    if (user) {
        return (
            <div className="auth-page">
                <div className="auth-card">

                    <div className="auth-label">
                        ACCOUNT
                    </div>

                    <h1>Вітаємо, {user.username}!</h1>

                    <p className="auth-subtitle">
                        {user.email}
                    </p>

                    <div className="auth-success">
                        Сесія активна
                    </div>

                    <p className="auth-subtitle">
                        Ім'я збережено в LocalStorage: {savedName}
                    </p>

                    <button
                        className="auth-button"
                        onClick={() => setShowFacts(true)}
                    >
                        Генератор фактів
                    </button>

                    <button
                        className="auth-button"
                        onClick={logout}
                    >
                        Вийти
                    </button>

                    {message && (
                        <div className="auth-success">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
                    )}

                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">

                <div className="auth-label">
                    FACTS GENERATOR
                </div>

                <h1>
                    {isRegister ? "Реєстрація" : "Вхід"}
                </h1>

                {!isRegister && savedName && (
                    <p className="auth-subtitle">
                        З поверненням, {savedName}!
                    </p>
                )}

                <form onSubmit={handleSubmit}>

                    {isRegister && (
                        <input
                            type="text"
                            placeholder="Ім'я користувача"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    )}

                    <input
                        type="email"
                        placeholder="Електронна пошта"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                    />

                    <input
                        type="password"
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={
                            isRegister
                                ? "new-password"
                                : "current-password"
                        }
                        required
                    />

                    <button
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Завантаження..."
                            : isRegister
                                ? "Зареєструватися"
                                : "Увійти"}
                    </button>

                </form>

                <button
                    className="auth-switch"
                    onClick={switchForm}
                >
                    {isRegister
                        ? "Вже є обліковий запис?"
                        : "Створити обліковий запис"}
                </button>

                {message && (
                    <div className="auth-success">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}

            </div>
        </div>
    );
}