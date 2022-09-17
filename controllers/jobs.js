const Job = require('../models/Job')
const { StatusCodes } = require('http-status-codes')
const { BadRequestError, NotFoundError } = require('../errors')
const moment = require('moment');
const mongoose = require('mongoose');


const getAllJobs = async (req, res) => {
  //Search status type sort
  const { search, status, jobType, sort } = req.query;
  const queryObject = {
    createdBy: req.user.userId,
  };
  if (search) {
    //Search our data with our search input using case insensitive
    queryObject.position = { $regex: search, $options: "i" };
  }

  //let here assume that result will not come immidiately from the database and we cannot use const because const 
  //doesnt allow to be declared without having a data in it but let allow us to declare variables without data yet
  let result = Job.find(queryObject);
  //- means reverse
  if (sort === "latest") {
    result = result.sort("-createdAt");
  }
  if (sort === "oldest") {
    result = result.sort("createdAt");
  }
  if (sort === "a-z") {
    result = result.sort("position");
  }
  if (sort === "z-a") {
    result = result.sort("-position");
  }
//pagination
  const limit = req.query.limit || 10;
  const page = req.query.page || 1;
  const skip = Number((page - 1) * limit);

  result = result.skip(skip).limit(limit);

  const jobs = await result;
  
  const totalJobs = await Job.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalJobs / limit);
  res.status(StatusCodes.OK).json({ jobs, totalJobs, numOfPages });
};

const getJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req

  const job = await Job.findOne({
    _id: jobId,
    createdBy: userId,
  })
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).json({ job })
}

const createJob = async (req, res) => {
  req.body.createdBy = req.user.userId
  const job = await Job.create(req.body)
  res.status(StatusCodes.CREATED).json({ job })
}

const updateJob = async (req, res) => {
  const {
    body: { company, position },
    user: { userId },
    params: { id: jobId },
  } = req

  if (company === '' || position === '') {
    throw new BadRequestError('Company or Position fields cannot be empty')
  }
  const job = await Job.findByIdAndUpdate(
    { _id: jobId, createdBy: userId },
    req.body,
    { new: true, runValidators: true }
  )
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).json({ job })
}

const deleteJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req

  const job = await Job.findByIdAndRemove({
    _id: jobId,
    createdBy: userId,
  })
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).send()
}

const showStats = async (req, res) => {
  let stats = await Job.aggregate([
  //get me the user that is currently logged in using the we conveting it mongoose object
    { $match: { createdBy: mongoose.Types.ObjectId(req.user.userId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  stats = stats.reduce((acc, curr) => {
    // destructure the object stats
    //we set the value of  into title which has 3 data in it decline, interview and pending
    //count also contain 3 values of each count result of the title
    const { _id: title, count } = curr;
    acc[title] = count;
    return acc;
  },{});

  const defaultStats = {
    pending: stats.pending || 0,
    interview: stats.interview || 0,
    declined: stats.declined || 0,
  };

  let monthlyApplications = await Job.aggregate([
    {
      $match: { createdBy: mongoose.Types.ObjectId(req.user.userId) }
    },
    {
      //$year and $month extract the year and month taking a full year as parameter
      $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    },
    {
      $limit: 7
    }
    
    
    
  ])
  monthlyApplications = monthlyApplications.map((item) => {
    const { _id: { year, month }, count } = item;
    const date = moment().month(month - 1).year(year).format('MMM Y');
    return { date, count }
  }).reverse();
 // console.log(defaultStats);
  //console.log(monthlyApplications);
  //console.log(stats)
  res.status(StatusCodes.OK).json({defaultStats: defaultStats, monthlyApplications})
}



module.exports = {
  createJob,
  deleteJob,
  getAllJobs,
  updateJob,
  getJob,
  showStats
}
