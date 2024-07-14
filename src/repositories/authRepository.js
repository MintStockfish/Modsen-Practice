const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getUserByEmail = async (email) => {
  return prisma.user_info.findUnique({
    where: {
      email,
    },
  });
};

const getUserByName = async (username) => {
  return prisma.user_info.findUnique({
    where: {
      username,
    },
  });
};

const createUser = async (username, hashedPassword, email) => {
  return prisma.user_info.create({
    data: {
      username: username,
      password: hashedPassword,
      email: email,
    },
  });
};

const updateRefreshToken = async (userId, refreshToken) => {
  prisma.user_info.update({
    where: {
      user_id: userId,
    },
    data: {
      refresh_token: refreshToken,
    },
  });
};

const assignAdmin = async (username) => {
  try {
    const user = await getUserByName(username);

    await prisma.user_info.update({
      where: {
        user_id: user.user_id,
      },
      data: {
        roles: "Admin",
      },
    });
  } catch (err) {
    console.error(err);
  }
};
module.exports = {
  getUserByEmail,
  getUserByName,
  createUser,
  updateRefreshToken,
  assignAdmin,
};
