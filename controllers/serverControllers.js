const Joi = require("joi");
const db = require("../db_config");
const dotenv = require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const register = async (req, res) => {
  try {
    const schema = Joi.object({
      username: Joi.string().min(3).max(30).required(),
      password: Joi.string().required(),
      email: Joi.string()
        .email({ tlds: { allow: ["com", "net", "org", "edu", "gov", "ru"] } })
        .max(255)
        .required(),
      admin: Joi.string().valid("true", "false").required(),
    });

    const { error, value } = schema.validate(req.body);

    if (error) {
      return res
        .status(400)
        .json({ error: error.details.map((detail) => detail.message) });
    }

    const { username, password, email, admin } = value;

    const existingUserByEmail = await db.query(
      "SELECT * FROM meetup_api.user_info WHERE email = $1",
      [email]
    );
    if (existingUserByEmail.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Пользователь c таким email уже существует" });
    }

    const existingUserByUsername = await db.query(
      "SELECT * FROM meetup_api.user_info WHERE username = $1",
      [username]
    );
    if (existingUserByUsername.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Пользователь c таким username уже существует" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO meetup_api.user_info (username, password, email, roles) VALUES ($1, $2, $3, $4)",
      [username, hashedPassword, email, admin == "true" ? "Admin" : null]
    );

    res.status(201).json({ message: "Пользователь успешно зарегистрирован" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Произошла ошибка при регистрации пользователя" });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await db.query(
      "SELECT * FROM meetup_api.user_info WHERE username = $1",
      [username]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).send("Неверный логин или пароль.");
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).send("Неверный логин или пароль.");
    }

    // Генерация access и refresh токенов
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await db.query(
      "UPDATE meetup_api.user_info SET refresh_token = $1 WHERE user_id = $2",
      [refreshToken, user.user_id]
    );

    res.status(201).json({
      message: "Вы успешно авторизировались.",
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка во время авторизации" });
  }
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      role: user.roles,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION }
  );
};

const generateRefreshToken = (user, role) => {
  return jwt.sign(
    {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      role: user.roles,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION }
  );
};

const meetupList = async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM meetup_api.meetup_info");

    res.send(
      `Meet up list:\n\n${rows
        .map((elem) => {
          return `ID:${elem.meetup_id}\nName:${elem.name}\nTags:${elem.tags}\nDate:${elem.date}\nLocation:${elem.location}\n\n`;
        })
        .join("")}`
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка при поиске доступных митапов.");
  }
};

module.exports = { register, login, meetupList };
