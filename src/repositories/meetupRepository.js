const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllMeetups = async () => {
  return prisma.meetup_info.findMany();
};

const getMeetupById = async (meetupId) => {
  return prisma.meetup_info.findUnique({
    where: {
      meetup_id: meetupId,
    },
  });
};

const getMeetupByName = async (name) => {
  return prisma.meetup_info.findUnique({
    where: {
      name,
    },
  });
};

const addMeetup = async (name, tags, date, location, description) => {
  return prisma.meetup_info.create({
    data: {
      name,
      tags,
      date,
      location,
      description,
    },
  });
};

const updateMeetup = async (name, tags, date, location, description, id) => {
  return prisma.meetup_info.update({
    where: {
      meetup_id: id,
    },
    data: {
      name,
      tags,
      date,
      location,
      description,
    },
  });
};

const deleteMeetup = async (id) => {
  return prisma.meetup_info.delete({
    where: {
      meetup_id: id,
    },
  });
};

module.exports = {
  getAllMeetups,
  getMeetupById,
  getMeetupByName,
  addMeetup,
  updateMeetup,
  deleteMeetup,
};
