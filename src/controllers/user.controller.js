import { asyncHandler } from "./../utils/asyncHandler.js"
import { APIerror } from "../utils/APIerror.js"
import { User } from "../models/user.model.js"
import { UploadOnCloudinary } from "../utils/cloudinary.js"
import { APIresponse } from "../utils/APIresponse.js"
import jwt from "jsonwebtoken"

const options = {
    httpOnly: true,
    secure: true
}

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new APIerror(500, "Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation  -not empty
    // check if user already exist: username,email
    //check for images
    //check for avatar
    //upload them to cloudinary , avatar
    //create user object
    //remove password and refresh token field 
    //check for user creation
    // return res

    const { username, password, fullname, email } = req.body

    // console.log({ username, password, fullname, email });

    // if(fullname==="")
    //     throw new APIerror(400,"full name is required")

    if ([fullname, email, password, username].some((field) =>
        field?.trim() === ""))
        throw new APIerror(400, "All fields are required")


    const existedUser = await User.findOne({
        $or: [{ email: email }, { username: username }]
    })

    // console.log(existedUser);

    if (existedUser)
        throw new APIerror(409, "user with email or username already exist")

    // multer provides req.files
    // can not be done as it will give error of reading an undefined
    // const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files?.coverImage[0]?.path
    }

    let avatarLocalPath
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files?.avatar[0]?.path
    }

    if (!avatarLocalPath)
        throw new APIerror(400, "avatar is required")

    const avatar = await UploadOnCloudinary(avatarLocalPath)
    let coverImage = await UploadOnCloudinary(coverImageLocalPath)

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage ? coverImage.url : "",
        email,
        password,
        username: username.toLowerCase()
    })

    // just to make sure that user has successfully created
    const createdUser = await User.findById({ _id: user.id }).select(
        "-password -refreshToken"
    )

    if (!createdUser)
        throw APIerror(500, "Something went wrong while registering the user")

    return res.status(201).json(
        new APIresponse(200, createdUser, "User Registered Successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    // extract data from req.body
    // check if username or email exist on database or not
    // if yes then check for password
    // remember password on the database is encrypted
    // access and refresh token 
    // send token through cookie

    const { username, email, password } = req.body

    if (!username && !email)
        throw new APIerror(400, "username or email is required.")

    const user = await User.findOne({
        $or: [{ username: username }, { email: email }]
    })

    if (!user)
        throw new APIerror(404, "User does not exist")

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid)
        throw new APIerror(401, "Invalid Credentials")

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new APIresponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User loggedIn successfully"
        ))
})

const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(req.user._id,
        { $set: { refreshToken: undefined } },
        { new: true })


    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new APIresponse(200, {}, "User Logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken)
        throw new APIerror(401, "Unauthorized request")

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)

        if (!user)
            throw new APIerror(401, "Invalid refresh token")

        if (user?.refreshToken !== incomingRefreshToken)
            throw new APIerror(401, "refresh token is expired or used")

        const { newAccessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user?._id)

        res.status(200)
            .cookie("accessToken", newAccessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new APIresponse(
                    200,
                    { "accessToken": newAccessToken, "refreshToken": newRefreshToken },
                    "Access token refresh"
                )
            )
    } catch (error) {
        throw new APIerror(401, error?.message || "Invalid Refresh Token")
    }

})

export { registerUser, loginUser, logoutUser, refreshAccessToken }