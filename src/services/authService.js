const authRepositories = require("../repositories/authRepository");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const registerUser = async (username, password, email) => {
  if (await authRepositories.getUserByName(username)) return "usernameConflict";
  if (await authRepositories.getUserByEmail(email)) return "emailConflict";

  const hashedPassword = await bcrypt.hash(password, +process.env.SALT);
  await authRepositories.createUser(username, hashedPassword, email);
};

const loginUser = async (username, password) => {
  const user = await authRepositories.getUserByName(username);
  if (!user) return "loginError";

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return "loginError";

  const accessToken = jwt.sign(
    {
      userId: user.user_id.toString(),
      username: user.username,
      email: user.email,
      role: user.roles,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.user_id.toString(),
      username: user.username,
      email: user.email,
      role: user.roles,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION }
  );

  await authRepositories.updateRefreshToken(user.user_id, refreshToken);
  return { accessToken, refreshToken };
};

const assignAdmin = async (username, accessToken) => {
  const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
  const user = await authRepositories.getUserByName(username);

  if (decoded.role === "Admin") {
    await authRepositories.assignAdmin(user.username);
  } else {
    return "assignError";
  }
};

module.exports = { registerUser, loginUser, assignAdmin };
