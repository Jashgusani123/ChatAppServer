import { faker } from '@faker-js/faker';
import { User } from "../models/userModels.js";

const createUsers = async(numUser)=>{
    try {
        const userPromise = [];
        for(let i= 0 ; i<numUser ; i++){
            const tempUser =User.create({
                name:faker.person.fullName(),
                username:faker.internet.userName(),
                password:"password",
                bio:faker.lorem.sentence(10),
                avatar:{
                    url:faker.image.avatar(),
                    public_id:faker.system.fileName()
                }
            })
            userPromise.push(tempUser)
        }
        await Promise.all(userPromise)
        console.log("Users Created",numUser);
        process.exit(1)
        
    } catch (error) {
        console.log(error)
        process.exit(1)
        
    }
}


export { createUsers };

