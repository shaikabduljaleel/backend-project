import {asyncHandler} from '../utils/asyncHandler.js'
import {apiError} from "../utils/apiError.js"
import {User} from "../models/user.modal.js"
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import {apiResponse} from '../utils/apiResponse.js'
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens=async (userId)=>{
  try {
    const user =await User.findById(userId)
    const accessToken=user.generateAccessToken()
    const refreshToken=user.generateRefreshToken()

    user.refreshToken=refreshToken
    await user.save({validateBeforeSave:false})

    return {accessToken,refreshToken}

  } catch (error) {
    throw new apiError(500,"something went wrong while generating refresh and access token")
  }
}

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
  const {fullName,email,username,password}=req.body
  console.log("email:",email);
  if([fullName,email,username,password].some((field)=> field?.trim()==="")){
    throw new apiError(400,"All fields are required")
  }
  const existedUser= await User.findOne({
    $or:[{username},{email}]
  })
  if(existedUser){
    throw new apiError(409,"user with username or email already existed")
  }

  const avatarLocalPath=req.files?.avatar[0]?.path
  //constcoverImageLocalPath=req.files?.coverImage[0]?.path

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
    coverImageLocalPath=req.files.coverImage[0].path
  }

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
    username:username.toLowerCase()

  })

  const createdUser = await User.findById(user._id).select("-password -refreshToken")

  if(!createdUser){
    throw new apiError(500,"Something went wrong while registering user")
  }

  return res.status(201).json(
    new apiResponse(200,createdUser,"User Registered Successfully")
  )
})

const loginUser=asyncHandler(async (req,res)=>{
  //req->body data
  //username or email
  //find the user
  //password check
  //access and refresh token
  //send cookie
  const {email,username,password}=req.body
  if (!username && !email) {
    throw new apiError(400,"username or email is required")
  }

  const user=await User.findOne({
    $or :[{username},{email}]
  })

  if(!user){
    throw new apiError(404,"User does not exist");
  }

  const isPasswordValid =await user.isPasswordCorrect(password)

  if(!isPasswordValid){
    throw new apiError(401,"Password is not valid Invlaid user credentials");
  }

  const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

  const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

  const options={
    httpOnly:true,
    secure:true
  }

  return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json(new apiResponse(200,{user:loggedInUser,accessToken,refreshToken},"User Logged In successfully"))

})

const logoutUser=asyncHandler(async (req,res)=>{
  await User.findByIdAndUpdate(req.user._id,{$set:{refreshToken:undefined}},{new:true})
  const options={
    httpOnly:true,
    secure:true
  }

  return res.status(200).clearCookie("accesssToken",options).clearCookie("refreshToken",options).json(new apiResponse(200,{},"User loggedOut"))
})

const refreshAccessToken=asyncHandler(async (req,res)=>{
  const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new apiError(401,"unauthorized request")
  }

  try {
    const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
  
    const user=await User.findById(decodedToken?._id)
  
    if(!user){
      throw new apiError(401,"Invlaid Refersh Token")
    }
  
    if (incomingRefreshToken!== user?.refreshToken) {
      throw new apiError(401,"Refersh Token is expired or used")
    }
  
    const options={
      httpOnly:true,
      secure:true
    }
    const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(new apiResponse(200,{accessToken,refreshToken:newRefreshToken},"Access Token Refresh"))
  
  } catch (error) {
    throw new apiError(401,error?.message || "Invalid Refresh Token")
  }
})

const changeCurrentPassword=asyncHandler(async (req,res)=>{
  const {oldPassword,newPassword}=req.body

  const user=await User.findById(req.user?._id)
  const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new apiError(400,"Invalid Old Password")
  }

  user.password=newPassword
  await user.save({validateBeforeSave:flase})

  return res.status(200).json(new apiResponse(200,{},"Password Changed Successfully"))
})

const getCurrentUser=asyncHandler(async (req,res)=>{
  return res.status(200).json(200,req.user,"current user fetched successfully")
})

const updateAccountDetails=asyncHandler(async (req,res)=>{
  const {fullName,email}=req.body

  if(!fullName || !email) {
    throw new apiError(400,"All fields are required")
  }

  User.findByIdAndUpdate(req.user?._id,{$set:{fullName,email}},{new:true}).select("-password")

  return res.status(200).json(new apiResponse(200,user,"Account detials Updated Successfully"))
})

const updateUserAvatar=asyncHandler(async (req,res)=>{
  const avatarLoclaPath=req.file?.path

  if(!avatarLoclaPath){
    throw new apiError(400,"Avatar file is missing")
  }

  const avatar=await uploadOnCloudinary(avatarLoclaPath)

  if(!avatar.url){
    throw new apiError(400,"Error while uploading on Avatar")
  }

  const user=await User.findByIdAndUpdate(req.user?._id,{$set:{avatar:avatar.url}},{new:true}).select("-password")

  return res.status(200).json(new apiResponse(200,user,"avatar updated successfully"))
})

const updateUserCoverImage=asyncHandler(async (req,res)=>{
  const coverImageLoclaPath=req.file?.path

  if(!coverImageLoclaPath){
    throw new apiError(400,"Cover Image file is missing")
  }

  const coverImage=await uploadOnCloudinary(coverImageLoclaPath)

  if(!coverImage.url){
    throw new apiError(400,"Error while uploading on Cover Image")
  }

  const user=await User.findByIdAndUpdate(req.user?._id,{$set:{coverImage:coverImage.url}},{new:true}).select("-password")

  return res.status(200).json(new apiResponse(200,user,"Cover image updated successfully"))
})

export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage}