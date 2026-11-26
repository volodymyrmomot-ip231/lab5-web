import { useState, useEffect } from "react";
import "./App.css";

const API = import.meta.env.DEV
    ? "http://localhost:5000/api/facts"
    : "/api/facts";

export default function App() {
    const [fact, setFact] = useState("");
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    async function loadFavorites() {
        try {
            const res = await fetch(API, {
                credentials: "include"
            });

            if (!res.ok) {
                throw new Error("Помилка отримання фактів");
            }

            const data = await res.json();

            setFavorites(data);

        } catch (error) {
            setMessage(error.message);
        }
    }

    useEffect(() => {
        loadFavorites();
    }, []);

    async function generateFact() {
        setLoading(true);
        setMessage("");

        try {
            const res = await fetch(
                "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en"
            );

            if (!res.ok) {
                throw new Error("Не вдалося отримати факт");
            }

            const data = await res.json();

            setFact(data.text);

        } catch (error) {
            setMessage(error.message);

        } finally {
            setLoading(false);
        }
    }

    async function saveFact() {
        if (!fact) {
            return;
        }

        try {
            const res = await fetch(API, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    text: fact
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error);
            }

            setMessage("Факт успішно збережено");

            loadFavorites();

        } catch (error) {
            setMessage(error.message);
        }
    }

    async function deleteFact(id) {
        try {
            const res = await fetch(`${API}/${id}`, {
                method: "DELETE",
                credentials: "include"
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error);
            }

            setMessage("Факт успішно видалено");

            loadFavorites();

        } catch (error) {
            setMessage(error.message);
        }
    }

    return (
        <div className="facts-page">

            <div className="facts-card">

                <div className="facts-label">
                    FACTS GENERATOR
                </div>

                <h1>Генератор цікавих фактів</h1>

                <div className="fact-content">
                    {loading
                        ? "Завантаження..."
                        : fact || "Натисніть кнопку, щоб отримати факт"}
                </div>

                <div className="facts-actions">

                    <button
                        onClick={generateFact}
                        disabled={loading}
                    >
                        Новий факт
                    </button>

                    <button
                        onClick={saveFact}
                        disabled={!fact || loading}
                    >
                        Зберегти
                    </button>

                </div>

                {message && (
                    <p className="facts-message">
                        {message}
                    </p>
                )}

                <h2>Збережені факти</h2>

                {favorites.length === 0 && (
                    <p>Збережених фактів немає</p>
                )}

                {favorites.map((item) => (
                    <div
                        className="favorite-item"
                        key={item._id}
                    >
                        <p>{item.text}</p>

                        <button
                            onClick={() => deleteFact(item._id)}
                        >
                            Видалити
                        </button>
                    </div>
                ))}

                <div className="facts-links">
                    <a
                        href={import.meta.env.DEV
                            ? "http://localhost:5000/api-docs"
                            : "/api-docs"}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Swagger API
                    </a>

                    <a
                        href={import.meta.env.DEV
                            ? "http://localhost:5000/api/health"
                            : "/api/health"}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Server Health
                    </a>
                </div>

            </div>
        </div>
    );
}