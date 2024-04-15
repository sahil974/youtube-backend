import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'


const UploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath)
            return null

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })

        // file has been uploaded 
        console.log("File is uploaded on cloudinary", response.url);

        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the file from the server as the operation has failed
        return null
    }
}


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export { UploadOnCloudinary }