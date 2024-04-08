//  cant be used as type modules are used
// require('dotenv').config({ path: './env' })
import dotenv from 'dotenv'
import connectDB from "./db/index.js"
import { app } from "./app.js"

dotenv.config({
    path: './env'
})

connectDB()
    .then(() => {

        app.on("error", (error) => {
            console.log("err : ", error);
            throw error
        })

        app.listen(process.env.PORT || 8080, () => {
            console.log("server is running at port : ", process.env.PORT);
        })
    })
    .catch((err) => {
        console.log("Mongodb connection failed !!!", err);
    })


app.get("/", (req, res) => {
    res.send("hello")
})
