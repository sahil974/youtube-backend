import { User } from "../models/user.model.js";
import { APIerror } from "../utils/APIerror.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async (req, res, next) => {
    // now req.cookie exits as we have used app.use(cookieParser())
    try {
        const token = req.cookies?.accessToken || req.header("Authorizartion")?.replace("Bearer ", "")

        if (!token)
            throw new APIerror(401, "Unauthorized Request")

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if (!user)
            throw new APIerror(401, "Invalid Access Token")

        req.user = user
        next()
    } catch (error) {
        throw new APIerror(401, error?.message || "Invalid access token")
    }
})  