let mongoose = require('mongoose');

let BusSchema = new mongoose.Schema({
    name: {type: String, required: true, unique: true},
    color: {type: String, required: true},
    icon: {type: String, required: true}
});

mongoose.model('Bus', BusSchema, 'busses');
