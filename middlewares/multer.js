import multer from 'multer';

const multerUpload = multer({
    limits:{
        fileSize:1024*1024*10,
    },
}) 
 const single = multerUpload.single("avatar"); 
 const attachmentMulter = multerUpload.array("files" , 5);

export {single , attachmentMulter}