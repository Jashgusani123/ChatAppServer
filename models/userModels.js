import mongoose, { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs'; 
const { hash } = bcrypt; 

const schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    avatar: {
        public_id: {
            type: String,
        },
        url: {
            type: String,
        }
    },
    bio: {
        type: String, // Adding the bio field to the schema
    }
}, {
    timestamps: true
});

schema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await hash(this.password, 10);
    next(); // Call next() to proceed
});

export const User = mongoose.models.User || model("User", schema);
