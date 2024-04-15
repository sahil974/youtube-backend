import { asyncHandler } from "./../utils/asyncHandler.js"
import { APIerror } from "../utils/APIerror.js"
import { User } from "../models/user.model.js"
import { UploadOnCloudinary } from "../utils/cloudinary.js"
import { APIresponse } from "../utils/APIresponse.js"

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

    console.log({ username, password, fullname, email });

    // if(fullname==="")
    //     throw new APIerror(400,"full name is required")

    if ([fullname, email, password, username].some((field) =>
        field?.trim() === ""))
        throw new APIerror(400, "All fields are required")


    const existedUser = User.find({
        $or: [{ email: email }, { username: username }]
    })

    if (existedUser)
        throw new APIerror(409, "user with email or username already exist")

    // multer provides req.files
    const avatarLocalPath = req.files?.avatar[0]?.path()

    const coverImageLocalPath = req.files?.coverImage[0]?.path()

    if (!avatarLocalPath)
        throw new APIerror(400, "avatar is required")

    const avatar = await UploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // just to make sure that user has successfully created
    const createdUser = await User.findById({ _id: user }).select(
        "-password -refreshToken"
    )

    if (!createdUser)
        throw APIerror(500, "Something went wrong while registering the user")

    return res.status(201).json(
        new APIresponse(200, createdUser, "User Registered Successfully")
    )

})

export { registerUser }