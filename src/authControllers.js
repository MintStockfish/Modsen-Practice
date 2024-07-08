const dotenv = require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { userSchema } = require("./dto.js");

class User {
  static async getUserByEmail(email) {
    if (!email || typeof email !== "string") {
      throw new Error("Invalid email argument");
    }
    return prisma.user_info.findUnique({
      where: {
        // Specify the unique field(s) to search for
        email,
      },
    });
  }

  static async getUserByUsername(username) {
    return prisma.user_info.findUnique({
      where: {
        username,
      },
    });
  }

  static async createUser(username, password, email, role) {
    await prisma.user_info.create({
      data: {
        username: username,
        password: password,
        email: email,
        roles: role,
      },
    });
  }

  static async updateRefreshToken(userId, refreshToken) {
    await prisma.user_info.update({
      where: {
        user_id: userId,
      },
      data: {
        refresh_token: refreshToken,
      },
    });
  }

  static async assignAdminRole(username) {
    try {
      const user = await prisma.user_info.findMany({
        where: {
          username: username,
        },
      });

      if (user[0]) {
        const result = await prisma.user_info.update({
          where: {
            user_id: user[0].user_id,
          },
          data: {
            roles: "Admin",
          },
        });
        console.log(result);

        return result ? 1 : 0;
      } else {
        return 0;
      }
    } catch (err) {
      console.error(err);
      return 0;
    }
  }
}

const register = async (req, res) => {
  try {
    const { error, value } = userSchema.validate(req.body);

    if (error) {
      return res
        .status(400)
        .json({ error: error.details.map((detail) => detail.message) });
    }

    const { username, password, email } = value;

    console.log(await User.getUserByEmail(email));
    if (Boolean(await User.getUserByEmail(email))) {
      return res
        .status(400)
        .json({ error: "Пользователь c таким email уже существует" });
    }

    if (Boolean(await User.getUserByUsername(username))) {
      return res
        .status(400)
        .json({ error: "Пользователь c таким username уже существует" });
    }

    const hashedPassword = await bcrypt.hash(password, +process.env.SALT);
    await User.createUser(username, hashedPassword, email);

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

    const user = await User.getUserByUsername(username);
    console.log(user);

    if (!user) {
      return res.status(401).send("Неверный логин или пароль.");
    }

    const isValid = await bcrypt.compare(password, user[0].password);

    if (!isValid) {
      return res.status(401).send("Неверный логин или пароль.");
    }

    const accessToken = generateAccessToken(user[0]);
    const refreshToken = generateRefreshToken(user[0]);

    await User.updateRefreshToken(user[0].user_id, refreshToken);

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

const assignAdmin = async (req, res) => {
  const { username, accessToken } = req.body;

  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    if (decoded.role === "Admin") {
      const result = await User.assignAdminRole(username);

      if (result === 0) {
        return res.status(404).send("Пользователь не найден.");
      } else {
        return res.status(200).send("Роль успешно назначена!");
      }
    } else {
      return res.status(403).send("У вас нет прав, чтобы выдать роль.");
    }
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).send("Недействительный токен доступа.");
    } else {
      console.error(error);
      return res.status(500).send("Ошибка при назначении роли.");
    }
  }
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.user_id.toString(),
      username: user.username,
      email: user.email,
      role: user.roles,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user.user_id.toString(),
      username: user.username,
      email: user.email,
      role: user.roles,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION }
  );
};

module.exports = {
  register,
  login,
  assignAdmin,
};
