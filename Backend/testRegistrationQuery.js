require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.REGISTRATION_MONGODB_URI;
console.log('Connecting to:', uri);

mongoose.connect(uri).then(async () => {
    console.log('Connected!');
    const schema = new mongoose.Schema({ email: String }, { strict: false });
    const RegistrationUser = mongoose.model('RegistrationUser', schema, 'registrations');

    const email = 'vikram25153165@akgec.ac.in';
    console.log(`Searching for email: "${email}"`);

    const regUser = await RegistrationUser.findOne({ email });
    console.log('Exact match result:', regUser);

    const regexUser = await RegistrationUser.findOne({ email: new RegExp('^vikram25153165@akgec\\.ac\\.in$', 'i') });
    console.log('Regex match result:', regexUser);

    console.log('Total documents in registrations collection:', await RegistrationUser.countDocuments());

    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
