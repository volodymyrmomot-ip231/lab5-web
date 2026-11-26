import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const router = express.Router();

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// Реєстрація
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (
            typeof username !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !username.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                error: "Заповніть усі поля"
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({
                error: "Некоректна електронна пошта"
            });
        }

        if (password.length < 6 || Buffer.byteLength(password) > 72) {
            return res.status(400).json({
                error: "Пароль має містити від 6 символів і не більше 72 байтів"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                error: "Користувач вже існує"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            username: username.trim(),
            email: normalizedEmail,
            password: hashedPassword
        });

        res.status(201).json({
            message: "Реєстрація успішна",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                error: "Користувач вже існує"
            });
        }

        console.error(error);

        res.status(500).json({
            error: "Помилка сервера"
        });
    }
});

// Авторизація
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password ||
            Buffer.byteLength(password) > 72
        ) {
            return res.status(400).json({
                error: "Введіть пошту та пароль"
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            return res.status(401).json({
                error: "Неправильна пошта або пароль"
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                error: "Неправильна пошта або пароль"
            });
        }

        req.session.regenerate((error) => {
            if (error) {
                return res.status(500).json({
                    error: "Помилка створення сесії"
                });
            }

            req.session.user = {
                id: user._id.toString(),
                username: user.username,
                email: user.email
            };

            req.session.save((error) => {
                if (error) {
                    return res.status(500).json({
                        error: "Помилка збереження сесії"
                    });
                }

                res.json({
                    message: "Авторизація успішна",
                    user: req.session.user
                });
            });
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Помилка сервера"
        });
    }
});

// Перевірка активної сесії
router.get("/me", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({
            error: "Користувач не авторизований"
        });
    }

    res.json({
        user: req.session.user
    });
});

// Вихід
router.post("/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                error: "Помилка завершення сесії"
            });
        }

        res.clearCookie("facts.sid", {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/"
        });

        res.json({
            message: "Ви вийшли з облікового запису"
        });
    });
});

export default router;