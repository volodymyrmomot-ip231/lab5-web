import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import MongoStore from "connect-mongo";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./auth.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.MONGO_URI || !process.env.SESSION_SECRET) {
    throw new Error("Налаштуйте MONGO_URI та SESSION_SECRET");
}

app.set("trust proxy", 1);

if (!isProduction) {
    app.use(cors({
        origin: "http://localhost:5173",
        credentials: true
    }));
}

app.use(express.json({ limit: "100kb" }));

// Моніторинг HTTP-запитів
app.use((req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - start;

        console.log(
            `${new Date().toISOString()} | ` +
            `${req.method} ${req.path} | ` +
            `${res.statusCode} | ${duration}ms`
        );
    });

    next();
});

// Налаштування серверних сесій
app.use(session({
    name: "facts.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: "sessions"
    }),

    cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Маршрути авторизації
app.use("/api/auth", authRouter);

// Модель факту
const factSchema = new mongoose.Schema(
    {
        text: {
            type: String,
            required: true,
            trim: true
        }
    },
    { timestamps: true }
);

const Fact = mongoose.model("Fact", factSchema);

// Перевірка авторизації для зміни даних
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({
            error: "Спочатку авторизуйтеся"
        });
    }

    next();
}

// Отримання всіх фактів
app.get("/api/facts", async (req, res) => {
    try {
        const facts = await Fact.find();

        res.json(facts);

    } catch (error) {
        res.status(500).json({
            error: "Помилка сервера"
        });
    }
});

// Створення факту
app.post("/api/facts", requireAuth, async (req, res) => {
    try {
        const { text } = req.body;

        if (typeof text !== "string" || !text.trim()) {
            return res.status(400).json({
                error: "Введіть текст факту"
            });
        }

        const existingFact = await Fact.findOne({
            text: text.trim()
        });

        if (existingFact) {
            return res.status(409).json({
                error: "Факт вже існує"
            });
        }

        const fact = await Fact.create({
            text: text.trim()
        });

        res.status(201).json(fact);

    } catch (error) {
        res.status(500).json({
            error: "Помилка сервера"
        });
    }
});

// Отримання факту за ID
app.get("/api/facts/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                error: "Некоректний ID"
            });
        }

        const fact = await Fact.findById(req.params.id);

        if (!fact) {
            return res.status(404).json({
                error: "Факт не знайдено"
            });
        }

        res.json(fact);

    } catch (error) {
        res.status(500).json({
            error: "Помилка сервера"
        });
    }
});

// Оновлення факту
app.put("/api/facts/:id", requireAuth, async (req, res) => {
    try {
        const { text } = req.body;

        if (
            !mongoose.isValidObjectId(req.params.id) ||
            typeof text !== "string" ||
            !text.trim()
        ) {
            return res.status(400).json({
                error: "Некоректні дані"
            });
        }

        const fact = await Fact.findByIdAndUpdate(
            req.params.id,
            { text: text.trim() },
            { new: true, runValidators: true }
        );

        if (!fact) {
            return res.status(404).json({
                error: "Факт не знайдено"
            });
        }

        res.json(fact);

    } catch (error) {
        res.status(500).json({
            error: "Помилка сервера"
        });
    }
});

// Видалення факту
app.delete("/api/facts/:id", requireAuth, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                error: "Некоректний ID"
            });
        }

        const fact = await Fact.findByIdAndDelete(
            req.params.id
        );

        if (!fact) {
            return res.status(404).json({
                error: "Факт не знайдено"
            });
        }

        res.json({
            message: "Факт успішно видалено"
        });

    } catch (error) {
        res.status(500).json({
            error: "Помилка сервера"
        });
    }
});

// Моніторинг стану сервера
app.get("/api/health", (req, res) => {
    const connected = mongoose.connection.readyState === 1;
    const memory = process.memoryUsage();

    res.status(connected ? 200 : 503).json({
        status: connected ? "OK" : "ERROR",

        environment: process.env.NODE_ENV || "development",

        uptime: Math.floor(process.uptime()),

        memory: {
            rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
            heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`
        },

        database: connected
            ? "Connected"
            : "Disconnected",

        timestamp: new Date().toISOString()
    });
});

// OpenAPI специфікація
const factBody = {
    required: true,
    content: {
        "application/json": {
            schema: {
                type: "object",
                required: ["text"],
                properties: {
                    text: {
                        type: "string",
                        example: "An octopus has three hearts."
                    }
                }
            }
        }
    }
};

const idParameter = {
    name: "id",
    in: "path",
    required: true,
    schema: {
        type: "string"
    }
};

const swaggerDocument = {
    openapi: "3.0.0",

    info: {
        title: "Facts REST API",
        version: "1.0.0",
        description: "Лабораторна робота №5. Хмарні сервіси та деплоймент"
    },

    servers: [
        {
            url: "/"
        }
    ],

    components: {
        securitySchemes: {
            sessionCookie: {
                type: "apiKey",
                in: "cookie",
                name: "facts.sid"
            }
        }
    },

    paths: {
        "/api/facts": {
            get: {
                tags: ["Facts"],
                summary: "Отримати всі факти",
                responses: {
                    200: { description: "Успішно" },
                    500: { description: "Помилка сервера" }
                }
            },

            post: {
                tags: ["Facts"],
                summary: "Створити новий факт",
                security: [{ sessionCookie: [] }],
                requestBody: factBody,

                responses: {
                    201: { description: "Факт створено" },
                    400: { description: "Некоректні дані" },
                    401: { description: "Потрібна авторизація" },
                    409: { description: "Факт вже існує" },
                    500: { description: "Помилка сервера" }
                }
            }
        },

        "/api/facts/{id}": {
            get: {
                tags: ["Facts"],
                summary: "Отримати факт за ID",
                parameters: [idParameter],

                responses: {
                    200: { description: "Факт знайдено" },
                    400: { description: "Некоректний ID" },
                    404: { description: "Факт не знайдено" },
                    500: { description: "Помилка сервера" }
                }
            },

            put: {
                tags: ["Facts"],
                summary: "Оновити факт",
                security: [{ sessionCookie: [] }],
                parameters: [idParameter],
                requestBody: factBody,

                responses: {
                    200: { description: "Факт оновлено" },
                    400: { description: "Некоректні дані" },
                    401: { description: "Потрібна авторизація" },
                    404: { description: "Факт не знайдено" },
                    500: { description: "Помилка сервера" }
                }
            },

            delete: {
                tags: ["Facts"],
                summary: "Видалити факт",
                security: [{ sessionCookie: [] }],
                parameters: [idParameter],

                responses: {
                    200: { description: "Факт видалено" },
                    400: { description: "Некоректний ID" },
                    401: { description: "Потрібна авторизація" },
                    404: { description: "Факт не знайдено" },
                    500: { description: "Помилка сервера" }
                }
            }
        },

        "/api/health": {
            get: {
                tags: ["Monitoring"],
                summary: "Перевірка стану сервера",

                responses: {
                    200: { description: "Сервер працює" },
                    503: { description: "База даних недоступна" }
                }
            }
        }
    }
};

// Swagger UI
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);

// Обробка невідомих API маршрутів
app.use("/api", (req, res) => {
    res.status(404).json({
        error: "Маршрут не знайдено"
    });
});

// Підключення зібраного React-застосунку
app.use(express.static(
    path.join(__dirname, "dist")
));

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "dist", "index.html")
    );
});

// Обробка серверних помилок
app.use((error, req, res, next) => {
    console.error(error.message);

    res.status(error.status || 500).json({
        error: "Помилка обробки запиту"
    });
});

// Підключення MongoDB та запуск сервера
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected");

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server: http://localhost:${PORT}`);
            console.log(`Swagger: http://localhost:${PORT}/api-docs`);
            console.log(`Health: http://localhost:${PORT}/api/health`);
            console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB error:", error.message);
        process.exit(1);
    });