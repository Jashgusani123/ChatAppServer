import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/userModels.js";
import {faker} from '@faker-js/faker';

const createMessages = async(chatId , numMessages)=>{
    try {
        const users = await User.find().select("_id");

        const messagesPromise = [];
        for(let i = 0 ; i< numMessages ; i++){
            const rendomUser = users[Math.floor(Math.random()*users.length)];

            messagesPromise.push(Message.create({
                chat:chatId,
                sender:rendomUser,
                content:faker.lorem.sentence()
            }))
        }
        await Promise.all(messagesPromise);
        console.log("Messages Created Successfully");
        process.exit(1);
        

    } catch (err) {
        console.log(err);
        
    }
}

export {createMessages}