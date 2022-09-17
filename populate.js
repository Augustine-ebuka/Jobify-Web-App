require('dotenv').config();
const JobSchema = require('./models/Job');
const connectDB = require('./db/connect');
const data = require('./jobs.json');


const start = async () => {
    try {
        await connectDB(process.env.MONGO_URI);
        await JobSchema.deleteMany();
        await JobSchema.create( data );
        console.log('Success!!!!');
        process.exit(0);
        
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}
start();