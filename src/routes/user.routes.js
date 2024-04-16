import { Router } from 'express'
import { updateUserDetails, changepPassword, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, updateUserAvatar, updateUserCoverImage } from '../controllers/user.controller.js'
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from '../middlewares/auth.middleware.js'
const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        },
    ]),
    registerUser)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/").post(verifyJWT, changepPassword)
router.route("/").get(verifyJWT, getCurrentUser)
router.route("/").get(verifyJWT, updateUserDetails)

router.route("/").get(verifyJWT, upload.fields({
    name: "coverImage",
    maxCount: 1
}), updateUserCoverImage)

router.route("/").get(verifyJWT, upload.fields({
    name: "avatar",
    maxCount: 1
}), updateUserAvatar)

export default router