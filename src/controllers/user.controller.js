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
    //req.user is now available as veryfyJWT middleware is used
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

const changepPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newpassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordValid)
        throw new APIerror(400, "Invalid Password")

    user.password = newpassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(APIresponse(200, {}, "password change successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    //req.user is now available as veryfyJWT middleware is used
    return res.status(200).json(APIresponse(200, req.user))
})

const updateUserDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body

    if (!fullname || !email)
        throw new APIerror(400, "All fields are required")

    const newUser = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: { email, fullname }
        },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json(new APIresponse(200, newUser, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath)
        throw new APIerror(400, "Avatar file is missing")

    const avatar = await UploadOnCloudinary(avatarLocalPath)

    if (!avatar?.url)
        throw new APIerror(400, "Error while uploading avatar")

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }).select("-password")

    return res.status(200)
        .json(APIresponse(200, user, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath)
        throw new APIerror(400, "Cover image file is missing")

    const coverImage = await UploadOnCloudinary(coverImageLocalPath)

    if (!coverImage?.url)
        throw new APIerror(400, "Error while uploading cover image")

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }).select("-password")

    return res.status(200)
        .json(APIresponse(200, user, "Cover image updated successfully"))
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changepPassword, getCurrentUser, updateUserDetails, updateUserCoverImage, updateUserAvatar }