
const swaggerDocument = {
    openapi: "3.0.3",

    info: {
        title: "Facts REST API",
        version: "1.0.0",
        description: "Лабораторна робота №3. Основи серверної логіки"
    },

    servers: [
        {
            url: "http://localhost:5000"
        }
    ],

    components: {
        schemas: {
            Fact: {
                type: "object",
                properties: {
                    _id: {
                        type: "string"
                    },
                    text: {
                        type: "string"
                    },
                    createdAt: {
                        type: "string",
                        format: "date-time"
                    },
                    updatedAt: {
                        type: "string",
                        format: "date-time"
                    }
                }
            },

            FactInput: {
                type: "object",
                required: ["text"],
                properties: {
                    text: {
                        type: "string",
                        minLength: 1,
                        example: "An octopus has three hearts."
                    }
                }
            }
        }
    },

    paths: {
        "/api/facts": {
            get: {
                tags: ["Facts"],
                summary: "Отримати всі факти",
                responses: {
                    200: {
                        description: "Список фактів",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: {
                                        $ref: "#/components/schemas/Fact"
                                    }
                                }
                            }
                        }
                    },
                    500: {
                        description: "Помилка сервера"
                    }
                }
            },

            post: {
                tags: ["Facts"],
                summary: "Створити новий факт",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/FactInput"
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        description: "Факт створено"
                    },
                    400: {
                        description: "Некоректні дані"
                    },
                    409: {
                        description: "Факт вже існує"
                    },
                    500: {
                        description: "Помилка сервера"
                    }
                }
            }
        },

        "/api/facts/{id}": {
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "string"
                    }
                }
            ],

            get: {
                tags: ["Facts"],
                summary: "Отримати факт за ID",
                responses: {
                    200: {
                        description: "Факт знайдено"
                    },
                    400: {
                        description: "Некоректний ID"
                    },
                    404: {
                        description: "Факт не знайдено"
                    }
                }
            },

            put: {
                tags: ["Facts"],
                summary: "Оновити факт",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/FactInput"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Факт оновлено"
                    },
                    400: {
                        description: "Некоректні дані"
                    },
                    404: {
                        description: "Факт не знайдено"
                    },
                    409: {
                        description: "Факт вже існує"
                    }
                }
            },

            delete: {
                tags: ["Facts"],
                summary: "Видалити факт",
                responses: {
                    200: {
                        description: "Факт видалено"
                    },
                    400: {
                        description: "Некоректний ID"
                    },
                    404: {
                        description: "Факт не знайдено"
                    }
                }
            }
        }
    }
};

export default swaggerDocument;
