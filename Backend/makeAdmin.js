const mongoose = require('mongoose');
const User = require('./models/user');
require('dotenv').config();

async function makeAdmin(email) {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOneAndUpdate({ email: email }, { role: 'admin' }, { new: true });
        if (user) {
            console.log(`Successfully made ${email} an admin!`);
        } else {
            console.log(`User with email ${email} not found.`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
}

const emailArg = process.argv[2];
if (emailArg) {
    makeAdmin(emailArg);
} else {
    console.log("Please provide an email address. Example: node makeAdmin.js your_email@example.com");
}
