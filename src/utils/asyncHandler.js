//const asyncHandler=()=>{}
//const asyncHandler=(func)=>{()=>{}}
//we can remove outer curly braces
//const asyncHandler =(func)=>()=>{}
//now we have to put async 
//const asyncHandler =(func)=> async ()=>{}


//try catch syntax

// const asyncHandler=(fn)=>async (req,res,next)=>{
//   try{
//     await fn(req,res,next)
//   }catch{
//     res.status(err.code || 500).json({
//       success:false,
//       message:err.message
//     })
//   }
// }


//promises syntax

const asyncHandler=(requestHandler)=>{
  (req,res,next)=>{Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))}
}

export {asyncHandler}