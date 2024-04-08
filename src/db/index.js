import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {

    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)

        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.host}`)

    } catch (error) {
        console.log("MongoDB connection Error", error)
        process.exit(1)
    }
}

export default connectDB