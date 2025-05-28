import {asyncHandler} from '../utils/asyncHandler.js'
import {apiError} from "../utils/apiError.js"
import {User} from "../models/user.modal.js"
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import {apiResponse} from '../utils/apiResponse.js'

const registerUser=asyncHandler(async (req,res)=>{
  //get user details from frontend
  //validation-not empty
  //check user is already exists
  //check for images 
  //check for images,check for avatar
  //upload them to cloudinary,avatar
  //create a user object-create a entry db
  //remove password and refresh token field from response
  //check for user creation
  //return res
  const {fullName,email,userName,password}=req.body
  console.log("email:",email);
  if([fullName,email,userName,password].some((field)=> field?.trim()==="")){
    throw new apiError(400,"All fields are required")
  }
  const existedUser=User.findOne({
    $or:[{userName},{email}]
  })
  if(existedUser){
    throw new apiError(409,"user with username or email already existed")
  }

  const avatarLocalPath=req.files?.avatar[0]?.path
  const coverImageLocalPath=req.files?.coverImage[0]?.path

  if(!avatarLocalPath){
    throw new apiError(400,"Avatar file is required")
  }
    
  const avatar=await uploadOnCloudinary(avatarLocalPath)
  const coverImage=await uploadOnCloudinary(coverImageLocalPath)

  if(!avatar){
    throw new apiError(400,"Avatar file is required")
  }

  const user= await User.create({
    fullName,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    userName:userName.toLowerCase()

  })

  const createdUser = await User.findById(user._id).select("-password -refreshToken")

  if(!createdUser){
    throw new apiError(500,"Something went wrong while registering user")
  }

  return res.status(201).json(
    new apiResponse(200,createdUser,"User Registered Successfully")
  )
})

export {registerUser}