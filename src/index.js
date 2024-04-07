//  cant be used as type modules are used
// require('dotenv').config({ path: './env' })
import dotenv from 'dotenv'
import connectDB from "./db/index.js"

dotenv.config({
    path: './env'
})

connectDB()
